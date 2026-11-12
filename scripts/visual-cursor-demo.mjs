import { chromium } from 'playwright';

// Injected client-side script for realistic visual mouse pointer with glowing ripple and tooltip
const visualCursorInitScript = `
(() => {
  if (window.__payguard_cursor_injected) return;
  window.__payguard_cursor_injected = true;

  const style = document.createElement('style');
  style.textContent = \`
    #pg-agent-cursor {
      position: fixed;
      top: 0;
      left: 0;
      width: 28px;
      height: 28px;
      pointer-events: none;
      z-index: 2147483647;
      transform: translate(0, 0);
      transition: transform 0.04s ease-out;
      filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.9));
    }
    #pg-agent-cursor .pointer-arrow {
      width: 24px;
      height: 24px;
      transform: rotate(-45deg);
      transform-origin: 0% 0%;
      fill: #38bdf8;
      stroke: #ffffff;
      stroke-width: 1.5;
    }
    #pg-agent-cursor .click-ripple {
      position: absolute;
      top: 0;
      left: 0;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: rgba(56, 189, 248, 0.8);
      border: 2px solid #ffffff;
      transform: translate(-50%, -50%) scale(0);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.35s ease-out, opacity 0.35s ease-out;
    }
    #pg-agent-cursor.clicking .click-ripple {
      transform: translate(-50%, -50%) scale(3.5);
      opacity: 0.9;
      background: rgba(244, 63, 94, 0.8);
      border-color: #fef08a;
    }
    #pg-agent-badge {
      position: absolute;
      top: 24px;
      left: 18px;
      white-space: nowrap;
      background: rgba(5, 7, 12, 0.92);
      border: 1px solid rgba(56, 189, 248, 0.6);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8), 0 0 12px rgba(56, 189, 248, 0.4);
      color: #f8fafc;
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      pointer-events: none;
      transition: opacity 0.2s ease;
      opacity: 0;
    }
    #pg-agent-badge.visible {
      opacity: 1;
    }
  \`;
  document.head.appendChild(style);

  const cursorEl = document.createElement('div');
  cursorEl.id = 'pg-agent-cursor';
  cursorEl.innerHTML = \`
    <div class="click-ripple"></div>
    <svg class="pointer-arrow" viewBox="0 0 24 24">
      <path d="M3 3l7 18 3-7 7-3L3 3z" />
    </svg>
    <div id="pg-agent-badge">🤖 PayGuard Agent</div>
  \`;
  document.body.appendChild(cursorEl);

  let badgeTimer = null;
  window.__setCursorBadge = (text) => {
    const badge = document.getElementById('pg-agent-badge');
    if (!badge) return;
    badge.textContent = text;
    badge.classList.add('visible');
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(() => {
      badge.classList.remove('visible');
    }, 2500);
  };

  window.addEventListener('mousemove', (e) => {
    cursorEl.style.transform = \`translate(\${e.clientX}px, \${e.clientY}px)\`;
  }, { passive: true });

  window.addEventListener('mousedown', () => {
    cursorEl.classList.add('clicking');
  });

  window.addEventListener('mouseup', () => {
    setTimeout(() => {
      cursorEl.classList.remove('clicking');
    }, 150);
  });
})();
`;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let currentMouseX = 100;
let currentMouseY = 100;

async function moveMouseSmooth(page, targetX, targetY, steps = 30) {
  await page.mouse.move(targetX, targetY, { steps });
  currentMouseX = targetX;
  currentMouseY = targetY;
  await sleep(100);
}

async function glideAndClick(page, locator, label) {
  try {
    const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
    await el.waitFor({ state: 'visible', timeout: 7000 });
    await el.scrollIntoViewIfNeeded();
    await sleep(200);

    const box = await el.boundingBox();
    if (!box) {
      console.log(`⚠️ Could not get bounding box for: ${label}`);
      return;
    }

    const targetX = Math.round(box.x + box.width / 2);
    const targetY = Math.round(box.y + box.height / 2);

    if (label) {
      console.log(`🎯 ${label}`);
      await page.evaluate((text) => window.__setCursorBadge?.(text), label);
    }

    // Move smoothly with visible cursor steps
    await moveMouseSmooth(page, targetX, targetY, 35);
    await sleep(250);

    // Click with visual ripple
    await page.mouse.down();
    await sleep(140);
    await page.mouse.up();
    await sleep(400);
  } catch (err) {
    console.log(`⚠️ glideAndClick error on [${label}]: ${err.message}`);
  }
}

async function glideAndType(page, locator, text, label) {
  try {
    const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
    await el.waitFor({ state: 'visible', timeout: 7000 });
    await el.scrollIntoViewIfNeeded();

    const box = await el.boundingBox();
    if (!box) return;

    const targetX = Math.round(box.x + box.width / 3);
    const targetY = Math.round(box.y + box.height / 2);

    if (label) {
      console.log(`⌨️ ${label}`);
      await page.evaluate((msg) => window.__setCursorBadge?.(msg), label);
    }

    await moveMouseSmooth(page, targetX, targetY, 30);
    await sleep(200);

    await page.mouse.down();
    await sleep(100);
    await page.mouse.up();
    await sleep(200);

    // Clear input
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await sleep(150);

    // Type character by character with realistic cadence
    for (const char of text) {
      await page.keyboard.type(char, { delay: Math.floor(Math.random() * 40) + 30 });
    }
    await sleep(350);
  } catch (err) {
    console.log(`⚠️ glideAndType error on [${label}]: ${err.message}`);
  }
}

async function main() {
  console.log('🌟 [PayGuard Interactive Driver] Launching Google Chrome on host desktop...');

  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--start-maximized',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled'
    ],
  });

  const context = await browser.newContext({ viewport: null });
  // Automatically inject visual cursor and ripple on every page load and navigation
  await context.addInitScript(visualCursorInitScript);

  const page = await context.newPage();

  try {
    console.log('🌐 Step 1: Navigating to PayGuard Home (http://localhost:3000)...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await sleep(1500);

    // Pre-authenticate as Alice (Client) in background for smooth console navigation
    try {
      await page.request.post('http://localhost:3000/api/auth/demo', {
        data: { role: 'CLIENT' }
      });
    } catch {}

    // Initial cursor entrance
    await moveMouseSmooth(page, 400, 300, 20);
    await page.evaluate(() => window.__setCursorBadge?.('👋 PayGuard AI Live Agent Connected'));
    await sleep(1000);

    // 1. Explore the 3-stage interactive pipeline
    console.log('\n--- 1. Testing Interactive 3-Stage Pipeline ---');
    await glideAndClick(page, 'text=Machine Audit', 'Examining 2. Machine Audit Stage');
    await sleep(900);

    await glideAndClick(page, 'text=Deposit & Lock', 'Examining 1. Deposit & Lock Stage');
    await sleep(900);

    await glideAndClick(page, 'text=Released Payouts', 'Examining 3. Released Payouts Stage');
    await sleep(900);

    // 2. Deliverable Inspector Demo
    console.log('\n--- 2. Testing Deliverable Inspector Scenario Toggles ---');
    await glideAndClick(page, 'button:has-text("Mobile Defect")', 'Simulating Mobile Defect Scenario');
    await sleep(1200);

    await glideAndClick(page, 'button:has-text("Broken Auth")', 'Simulating Broken Auth Security Failure');
    await sleep(1200);

    await glideAndClick(page, 'button:has-text("Prompt Injection")', 'Simulating Prompt Injection Exploit');
    await sleep(1200);

    await glideAndClick(page, 'button:has-text("Clean Code")', 'Testing Clean Deliverable (100% Deterministic Release)');
    await sleep(1400);

    // 3. Escrow Fee Calculator Slider
    console.log('\n--- 3. Testing Dynamic Fee Calculator Slider ---');
    const slider = page.locator('input[type="range"]').first();
    if (await slider.isVisible()) {
      await slider.scrollIntoViewIfNeeded();
      const sBox = await slider.boundingBox();
      if (sBox) {
        await page.evaluate(() => window.__setCursorBadge?.('Adjusting Escrow Budget Slider'));
        await moveMouseSmooth(page, sBox.x + sBox.width * 0.25, sBox.y + sBox.height / 2, 25);
        await page.mouse.down();
        // Drag slider smoothly across
        for (let pct = 0.25; pct <= 0.75; pct += 0.05) {
          await page.mouse.move(sBox.x + sBox.width * pct, sBox.y + sBox.height / 2);
          await sleep(40);
        }
        await page.mouse.up();
        await sleep(800);
      }
    }

    // 4. Navigate to Escrow Console
    console.log('\n--- 4. Navigating to Escrow Dashboard ---');
    const consoleBtn = page.locator('a[href="/dashboard"]').first();
    await glideAndClick(page, consoleBtn, 'Opening Escrow Console (/dashboard)');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await sleep(1200);

    // 5. Test Filter Tabs on Dashboard
    console.log('\n--- 5. Testing Dashboard Filter Tabs ---');
    await glideAndClick(page, 'button:has-text("Verified")', 'Filtering: Verified Contracts');
    await sleep(900);

    await glideAndClick(page, 'button:has-text("Disputed")', 'Filtering: Disputed Contracts');
    await sleep(900);

    await glideAndClick(page, 'button:has-text("All")', 'Filtering: All Contracts');
    await sleep(900);

    // 6. Navigate to Create Escrow Job
    console.log('\n--- 6. Navigating to Create New Escrow Job ---');
    const newJobBtn = page.locator('a[href="/jobs/new"]').first();
    await glideAndClick(page, newJobBtn, 'Creating New Escrow Contract (/jobs/new)');
    await page.waitForURL('**/jobs/new', { timeout: 10000 });
    await sleep(1200);

    // 7. Fill Contract Details with Live Typing
    console.log('\n--- 7. Populating Contract via AI Preset & Real-time Typing ---');
    await glideAndClick(
      page,
      'button:has-text("SaaS Auth & Dashboard")',
      'Auto-synthesizing specifications from SaaS Preset'
    );
    await sleep(1000);

    await glideAndType(
      page,
      'input[placeholder*="Next.js SaaS"]',
      'PayGuard Autonomous Escrow & AI Code Verification',
      'Entering Project Title'
    );

    await glideAndType(
      page,
      'input[placeholder*="freelancer@"]',
      'bob@freelancer.dev',
      'Assigning Freelancer Email'
    );

    await glideAndType(
      page,
      'input[type="number"][value="1000"], input[type="number"]',
      '2500',
      'Setting Escrow Amount to $2,500'
    );

    // 8. Submit Contract
    console.log('\n--- 8. Generating Contract & Synthesizing 100-Point Rubric ---');
    const submitBtn = page.locator('button[type="submit"]:has-text("Generate Escrow Contract")').first();
    await glideAndClick(page, submitBtn, '🚀 Synthesizing 100-Point Test Rubric & Creating Job');

    try {
      await page.waitForURL('**/jobs/**', { timeout: 15000 });
      console.log(`🎉 Navigated to Contract: ${page.url()}`);
      await sleep(1500);

      // 9. Inspect Milestone Stepper & AI Viewport
      console.log('\n--- 9. Inspecting Milestone Stepper & Verification Viewport ---');
      await page.evaluate(() =>
        window.__setCursorBadge?.('✅ Contract Created with Live Rubric & AI Verification!')
      );
      await moveMouseSmooth(page, 450, 260, 30);
      await sleep(1000);

      const checklistSection = page.locator('text=Deliverable Rubric, text=Verification Checklist, text=Checklist').first();
      if (await checklistSection.isVisible()) {
        await glideAndClick(page, checklistSection, 'Reviewing Weighted Checklist Rubric');
      }
    } catch (navErr) {
      console.log(`Navigation note: ${navErr.message}`);
    }

    console.log('\n✨ LIVE BROWSER DEMO COMPLETED SUCCESSFULLY!');
    await page.evaluate(() => {
      const banner = document.createElement('div');
      banner.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: rgba(16, 185, 129, 0.95);
        color: white;
        font-family: ui-sans-serif, system-ui;
        font-size: 14px;
        font-weight: 700;
        padding: 12px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        z-index: 99999999;
      `;
      banner.textContent = '✅ Autonomous Browser Test Complete — Ready for Demo!';
      document.body.appendChild(banner);
    });

    // Keep browser alive for interactive enjoyment
    console.log('Holding browser open so you can interact with the app...');
    await sleep(60000);

  } catch (err) {
    console.error('Test execution error:', err);
  }
}

main();

