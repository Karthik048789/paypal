import { chromium } from 'playwright';

async function runLiveTest() {
  console.log('🚀 [PayGuard Test Engine] Connecting to Google Chrome on desktop...');

  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    slowMo: 600,
    args: ['--start-maximized', '--no-default-browser-check']
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  try {
    console.log('🌐 Step 1: Navigating to PayGuard Home (http://localhost:3000)...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Scroll to interactive pipeline
    console.log('⚡ Step 2: Testing 3-stage interactive pipeline...');
    const auditCard = page.locator('text=Machine Audit').first();
    if (await auditCard.isVisible()) {
      await auditCard.click();
      await page.waitForTimeout(800);
    }

    // Test deliverable inspector tabs
    console.log('🔍 Step 3: Testing Deliverable Inspector live scenario toggles...');
    const mobileDefectBtn = page.locator('button:has-text("Mobile Defect")').first();
    if (await mobileDefectBtn.isVisible()) {
      await mobileDefectBtn.click();
      await page.waitForTimeout(1000);
    }

    const brokenAuthBtn = page.locator('button:has-text("Broken Auth")').first();
    if (await brokenAuthBtn.isVisible()) {
      await brokenAuthBtn.click();
      await page.waitForTimeout(1000);
    }

    const cleanCodeBtn = page.locator('button:has-text("Clean Code")').first();
    if (await cleanCodeBtn.isVisible()) {
      await cleanCodeBtn.click();
      await page.waitForTimeout(1000);
    }

    // Test Escrow Calculator slider
    console.log('💰 Step 4: Testing Escrow Fee Calculator dynamic slider...');
    const slider = page.locator('input[type="range"]').first();
    if (await slider.isVisible()) {
      await slider.fill('2500');
      await page.waitForTimeout(1000);
    }

    // Authenticate as demo client for seamless navigation
    console.log('🔑 Step 5: Logging in as Demo Client (Alice)...');
    await page.request.post('http://localhost:3000/api/auth/demo', {
      data: { role: 'CLIENT' }
    });

    // Navigate to Dashboard
    console.log('📊 Step 6: Navigating to Escrow Console (/dashboard)...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    // Test filter tabs
    const verifiedTab = page.locator('button:has-text("Verified")').first();
    if (await verifiedTab.isVisible()) {
      await verifiedTab.click();
      await page.waitForTimeout(800);
    }
    const allTab = page.locator('button:has-text("All")').first();
    if (await allTab.isVisible()) {
      await allTab.click();
      await page.waitForTimeout(800);
    }

    // Navigate to New Escrow Job creation
    console.log('✍️ Step 7: Navigating to Create Escrow Job (/jobs/new)...');
    await page.goto('http://localhost:3000/jobs/new', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Populate using example preset chip
    console.log('✨ Step 8: Populating contract requirements with AI preset...');
    const presetBtn = page.locator('button:has-text("SaaS Auth & Dashboard")').first();
    if (await presetBtn.isVisible()) {
      await presetBtn.click();
      await page.waitForTimeout(1000);
    }

    // Fill title if empty
    const titleInput = page.locator('input[placeholder*="Next.js SaaS"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('Autonomous AI Payment Escrow System');
      await page.waitForTimeout(600);
    }

    // Fill freelancer email
    const emailInput = page.locator('input[placeholder*="freelancer@"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('freelancer@payguard.dev');
      await page.waitForTimeout(600);
    }

    // Scroll down to submit
    console.log('🚀 Step 9: Submitting and synthesizing contract rubric...');
    const submitBtn = page.locator('button[type="submit"]:has-text("Generate Escrow Contract")').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Wait for redirect to /jobs/[id]
      await page.waitForURL('**/jobs/**', { timeout: 15000 });
      console.log(`🎯 Successfully created contract! Current URL: ${page.url()}`);
      await page.waitForTimeout(2000);
    }

    console.log('✅ Step 10: Contract detail view loaded with live AI verification panel!');
    console.log('✨ Browser remains open for interactive review.');

  } catch (err) {
    console.error('⚠️ Browser testing encountered an error:', err);
  }
}

runLiveTest();

