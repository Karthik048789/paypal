import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), 'public', 'screenshots');
const artifactDir = 'C:\\Users\\VEDANT RAJU BORKAR\\.gemini\\antigravity\\brain\\0a084bb6-eee9-4d9e-a29c-cd2fcf6c2d01';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  console.log('📸 Capturing all unified views from PayGuard Escrow...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Pre-auth
  try {
    await page.request.post('http://localhost:3000/api/auth/demo', {
      data: { role: 'CLIENT' }
    });
  } catch {}

  // 1. Landing Page
  console.log('1. Capturing Landing Page...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, '01_landing_hero.png'), fullPage: false });

  // 2. Machine Audit Pipeline
  console.log('2. Capturing 3-Stage Pipeline...');
  const auditBtn = page.locator('button:has-text("2. Machine Audit")').first();
  if (await auditBtn.isVisible()) {
    await auditBtn.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(outDir, '02_pipeline_audit.png'), fullPage: false });

  // 3. Deliverable Inspector
  console.log('3. Capturing Deliverable Inspector...');
  const mobileDefectBtn = page.locator('button:has-text("Mobile Defect")').first();
  if (await mobileDefectBtn.isVisible()) {
    await mobileDefectBtn.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(outDir, '03_deliverable_inspector.png'), fullPage: false });

  // 4. Escrow Dashboard
  console.log('4. Capturing Escrow Dashboard (/dashboard)...');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, '04_escrow_dashboard.png'), fullPage: false });

  // 5. Create Job with AI Rubric
  console.log('5. Capturing Create Escrow Contract (/jobs/new)...');
  await page.goto('http://localhost:3000/jobs/new', { waitUntil: 'networkidle' });
  const presetBtn = page.locator('button:has-text("SaaS Auth & Dashboard")').first();
  if (await presetBtn.isVisible()) {
    await presetBtn.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(outDir, '05_create_escrow_rubric.png'), fullPage: false });

  // 6. Contract Detail & Milestone Execution
  console.log('6. Capturing Contract Execution & AI Viewport (/jobs/cmw66rfrn0004vdhk7i1rhmnw)...');
  await page.goto('http://localhost:3000/jobs/cmw66rfrn0004vdhk7i1rhmnw', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '06_contract_milestones.png'), fullPage: false });

  await browser.close();

  // Copy to artifact directory
  const files = [
    '01_landing_hero.png',
    '02_pipeline_audit.png',
    '03_deliverable_inspector.png',
    '04_escrow_dashboard.png',
    '05_create_escrow_rubric.png',
    '06_contract_milestones.png',
  ];

  for (const f of files) {
    const srcFile = path.join(outDir, f);
    const destFile = path.join(artifactDir, f);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
      console.log(`Copied to artifact dir: ${f}`);
    }
  }

  console.log('✅ All screenshots captured and exported!');
}

capture();

