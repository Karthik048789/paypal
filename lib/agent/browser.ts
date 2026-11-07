/**
 * PayGuard Escrow - Browser Agent Primitives (Playwright / CDP)
 * 
 * Provides:
 * - Viewport switching (Desktop: 1440x900, Mobile: 390x844)
 * - Console error & network failure listener
 * - Mobile horizontal overflow detection (scrollWidth > innerWidth)
 * - Form fill, element assertion, screenshot evidence capture
 * - Connects to local Playwright or Kernel Cloud Browser via CDP
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';

export interface BrowserSessionConfig {
  cdpUrl?: string; // Kernel Cloud Browser CDP endpoint if available
  headless?: boolean;
}

export interface CapturedDiagnostics {
  consoleErrors: string[];
  consoleLogs: string[];
  failedRequests: string[];
}

export class BrowserAgentSession {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  public page: Page | null = null;
  public diagnostics: CapturedDiagnostics = {
    consoleErrors: [],
    consoleLogs: [],
    failedRequests: [],
  };

  async initialize(config: BrowserSessionConfig = {}): Promise<void> {
    if (config.cdpUrl) {
      this.browser = await chromium.connectOverCDP(config.cdpUrl);
    } else {
      this.browser = await chromium.launch({
        headless: config.headless ?? true,
      });
    }

    this.context = await this.browser.newContext({
      viewport: { width: 1440, height: 900 }, // Desktop default (FR-18)
      userAgent: 'Mozilla/5.0 (PayGuard-Escrow-VerificationAgent/1.0; +https://payguard.dev)',
    });

    this.page = await this.context.newPage();

    // Attach diagnostic event listeners
    this.page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') {
        this.diagnostics.consoleErrors.push(text);
      } else {
        this.diagnostics.consoleLogs.push(text);
      }
    });

    this.page.on('pageerror', (err) => {
      this.diagnostics.consoleErrors.push(`[Uncaught Exception] ${err.message}`);
    });

    this.page.on('requestfailed', (req) => {
      const failure = req.failure()?.errorText || 'Unknown request failure';
      this.diagnostics.failedRequests.push(`${req.method()} ${req.url()} - ${failure}`);
    });

    this.page.on('response', (res) => {
      if (res.status() >= 500) {
        this.diagnostics.failedRequests.push(`${res.status()} ${res.url()}`);
      }
    });
  }

  async setViewport(type: 'desktop' | 'mobile'): Promise<{ width: number; height: number }> {
    if (!this.page) throw new Error('Page not initialized');
    const size = type === 'desktop'
      ? { width: 1440, height: 900 }
      : { width: 390, height: 844 }; // iPhone 14 / modern standard mobile viewport
    await this.page.setViewportSize(size);
    // Allow reflow
    await this.page.waitForTimeout(300);
    return size;
  }

  async navigateTo(url: string, timeoutMs = 30000): Promise<{ status: number; ok: boolean }> {
    if (!this.page) throw new Error('Page not initialized');
    const response = await this.page.goto(url, {
      waitUntil: 'load',
      timeout: timeoutMs,
    });
    const status = response ? response.status() : 200;
    return { status, ok: status < 400 };
  }

  /**
   * Check whether horizontal scroll overflow exists on the page
   */
  async checkHorizontalOverflow(): Promise<{ hasOverflow: boolean; scrollWidth: number; innerWidth: number }> {
    if (!this.page) throw new Error('Page not initialized');
    return await this.page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const innerWidth = window.innerWidth;
      return {
        hasOverflow: scrollWidth > innerWidth,
        scrollWidth,
        innerWidth,
      };
    });
  }

  /**
   * Capture screenshot as base64 data URI for reporting & evidence
   */
  async captureScreenshot(): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');
    const buffer = await this.page.screenshot({ fullPage: false });
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  /**
   * Perform login flow with a hard limit of 15 actions
   */
  async attemptLogin(credentials?: { email?: string; password?: string }): Promise<{
    success: boolean;
    explanation: string;
    actionCount: number;
  }> {
    if (!this.page) throw new Error('Page not initialized');
    let actionCount = 0;
    const maxActions = 15;

    const email = credentials?.email || 'demo@payguard.test';
    const password = credentials?.password || 'password123';

    try {
      // 1. Locate email input
      const emailSelector = 'input[type="email"], input[name="email"], input#email, input[placeholder*="email" i]';
      const emailInput = await this.page.waitForSelector(emailSelector, { timeout: 5000 }).catch(() => null);
      if (!emailInput) {
        return { success: false, explanation: 'Email input field could not be found on page', actionCount };
      }
      actionCount++;
      await emailInput.fill(email);

      // 2. Locate password input
      const passwordSelector = 'input[type="password"], input[name="password"], input#password';
      const passwordInput = await this.page.waitForSelector(passwordSelector, { timeout: 3000 }).catch(() => null);
      if (!passwordInput) {
        return { success: false, explanation: 'Password input field could not be found on page', actionCount };
      }
      actionCount++;
      await passwordInput.fill(password);

      // 3. Locate and click submit button
      const submitSelector = 'button[type="submit"], input[type="submit"], button#submit-btn, button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")';
      const submitBtn = await this.page.waitForSelector(submitSelector, { timeout: 3000 }).catch(() => null);
      if (!submitBtn) {
        return { success: false, explanation: 'Submit / Sign In button could not be found', actionCount };
      }

      actionCount++;
      const currentUrl = this.page.url();
      await Promise.all([
        this.page.waitForNavigation({ timeout: 6000 }).catch(() => null),
        submitBtn.click(),
      ]);

      // Check if URL changed, or dashboard welcome element appeared, or error message is absent
      const newUrl = this.page.url();
      const hasDashboardHeader = await this.page.$('#dashboard-welcome, h1:has-text("Dashboard"), h2:has-text("Successful")');
      const hasErrorMsg = await this.page.$('#error-msg:not(:empty), .error:not(:empty)');

      if (hasErrorMsg) {
        const errText = await hasErrorMsg.textContent();
        return {
          success: false,
          explanation: `Login submitted but page returned error message: "${errText?.trim()}"`,
          actionCount,
        };
      }

      if (newUrl !== currentUrl || hasDashboardHeader) {
        return {
          success: true,
          explanation: `Authentication succeeded. Redirected to: ${newUrl}`,
          actionCount,
        };
      }

      return {
        success: false,
        explanation: 'Form clicked but no navigation or authenticated dashboard element was detected',
        actionCount,
      };
    } catch (err: any) {
      return {
        success: false,
        explanation: `Authentication execution exception: ${err.message}`,
        actionCount,
      };
    }
  }

  async close(): Promise<void> {
    try {
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
    } catch {
      // Ignore cleanup error
    }
  }
}

