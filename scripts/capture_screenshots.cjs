const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const outDir = 'C:\\Users\\harsh\\.gemini\\antigravity\\brain\\0b61b0c5-653b-4eb1-ba42-872d32663d21\\screenshots';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const baseUrl = 'https://enclave-btme1fhnx-trakson.vercel.app';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  async function setTheme(mode) {
    await page.evaluate((themeMode) => {
      localStorage.setItem('enclave_theme', themeMode);
      if (themeMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }, mode);
    await new Promise(r => setTimeout(r, 300));
  }

  // 1. Desktop Landing - Light & Dark
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });
  await setTheme('light');
  await page.screenshot({ path: path.join(outDir, 'desktop_landing_light.png') });
  await page.screenshot({ path: path.join(outDir, 'desktop_landing.png') });
  console.log('✔ desktop_landing_light.png');

  await setTheme('dark');
  await page.screenshot({ path: path.join(outDir, 'desktop_landing_dark.png') });
  console.log('✔ desktop_landing_dark.png');

  // 2. Desktop Preview Section with Schema Inspector (Dark mode default for inspector)
  try {
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent && b.textContent.includes('Inspect Sample Schema'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(outDir, 'desktop_preview_section.png') });
    console.log('✔ desktop_preview_section.png');
  } catch (e) {
    console.error('Inspector error:', e.message);
  }

  // 3. Mobile Landing - Light & Dark
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });
  await setTheme('light');
  await page.screenshot({ path: path.join(outDir, 'mobile_landing_light.png') });
  await page.screenshot({ path: path.join(outDir, 'mobile_landing.png') });
  console.log('✔ mobile_landing_light.png');

  await setTheme('dark');
  await page.screenshot({ path: path.join(outDir, 'mobile_landing_dark.png') });
  console.log('✔ mobile_landing_dark.png');

  // Set mock authenticated user in localStorage for app views
  await page.evaluate(() => {
    const mockUser = {
      id: 'usr_mock_designer_99',
      displayName: 'Alex Thorne',
      email: 'alex.thorne@enclave.internal',
      avatarSeed: 'alex.thorne',
      createdAt: Date.now(),
      isVerified: true,
      provider: 'password'
    };
    localStorage.setItem('enclave_user_session', JSON.stringify(mockUser));
    localStorage.setItem('enclave_onboarded', 'true');
  });

  // 4. Desktop Dashboard - Light & Dark
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(baseUrl + '/app', { waitUntil: 'networkidle2' });
  await setTheme('light');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, 'desktop_dashboard_light.png') });
  await page.screenshot({ path: path.join(outDir, 'desktop_dashboard.png') });
  console.log('✔ desktop_dashboard_light.png');

  await setTheme('dark');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, 'desktop_dashboard_dark.png') });
  console.log('✔ desktop_dashboard_dark.png');

  // 5. Mobile Dashboard - Light & Dark
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(baseUrl + '/app', { waitUntil: 'networkidle2' });
  await setTheme('light');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, 'mobile_dashboard_light.png') });
  await page.screenshot({ path: path.join(outDir, 'mobile_dashboard.png') });
  console.log('✔ mobile_dashboard_light.png');

  await setTheme('dark');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, 'mobile_dashboard_dark.png') });
  console.log('✔ mobile_dashboard_dark.png');

  // 6. Desktop Room Creation - Light & Dark
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(baseUrl + '/app/new', { waitUntil: 'networkidle2' });
  await setTheme('light');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, 'desktop_room_creation_light.png') });
  await page.screenshot({ path: path.join(outDir, 'desktop_room_creation.png') });
  console.log('✔ desktop_room_creation_light.png');

  await setTheme('dark');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, 'desktop_room_creation_dark.png') });
  console.log('✔ desktop_room_creation_dark.png');

  // 7. Mobile Room Creation - Light & Dark
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(baseUrl + '/app/new', { waitUntil: 'networkidle2' });
  await setTheme('light');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, 'mobile_room_creation_light.png') });
  await page.screenshot({ path: path.join(outDir, 'mobile_room_creation.png') });
  console.log('✔ mobile_room_creation_light.png');

  await setTheme('dark');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, 'mobile_room_creation_dark.png') });
  console.log('✔ mobile_room_creation_dark.png');

  // 8. Desktop Chat Chamber View - Light & Dark
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(baseUrl + '/r/enc-8f4b-21a0', { waitUntil: 'networkidle2' });
  await setTheme('light');
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'desktop_chat_chamber_light.png') });
  await page.screenshot({ path: path.join(outDir, 'desktop_chat_chamber.png') });
  console.log('✔ desktop_chat_chamber_light.png');

  await setTheme('dark');
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'desktop_chat_chamber_dark.png') });
  console.log('✔ desktop_chat_chamber_dark.png');

  // 9. Mobile Chat Chamber View - Light & Dark
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(baseUrl + '/r/enc-8f4b-21a0', { waitUntil: 'networkidle2' });
  await setTheme('light');
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'mobile_chat_chamber_light.png') });
  await page.screenshot({ path: path.join(outDir, 'mobile_chat_chamber.png') });
  console.log('✔ mobile_chat_chamber_light.png');

  await setTheme('dark');
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'mobile_chat_chamber_dark.png') });
  console.log('✔ mobile_chat_chamber_dark.png');

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
})();
