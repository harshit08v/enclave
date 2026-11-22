const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const outDir = 'C:\\Users\\harsh\\.gemini\\antigravity\\brain\\0b61b0c5-653b-4eb1-ba42-872d32663d21\\screenshots';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const baseUrl = 'https://enclave.vercel.app';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
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
    await new Promise(r => setTimeout(r, 400));
  }

  // 1. Desktop Landing - Dark Theme (Quiet Luxury: Velvet Obsidian Noir & Jewel Pine)
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await setTheme('dark');
  await page.screenshot({ path: path.join(outDir, 'live_tagline_luxury_dark_desktop.png') });
  console.log('✔ live_tagline_luxury_dark_desktop.png');

  // 2. Desktop Landing - Light Theme (Quiet Luxury: Warm Architectural Alabaster & Racing Green)
  await setTheme('light');
  await page.screenshot({ path: path.join(outDir, 'live_tagline_luxury_light_desktop.png') });
  console.log('✔ live_tagline_luxury_light_desktop.png');

  // 3. Mobile Landing - Dark Theme (390x844)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  await setTheme('dark');
  await page.screenshot({ path: path.join(outDir, 'live_tagline_luxury_dark_mobile.png') });
  console.log('✔ live_tagline_luxury_dark_mobile.png');

  // 4. Mobile Landing - Light Theme (390x844)
  await setTheme('light');
  await page.screenshot({ path: path.join(outDir, 'live_tagline_luxury_light_mobile.png') });
  console.log('✔ live_tagline_luxury_light_mobile.png');

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
})();
