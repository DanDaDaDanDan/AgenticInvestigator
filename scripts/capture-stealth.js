#!/usr/bin/env node
/**
 * capture-stealth.js - Enhanced stealth capture for bot-protected sites
 *
 * Features:
 * - Realistic browser fingerprinting
 * - User-Agent rotation
 * - Random human-like delays
 * - Cookie/session handling
 * - Proxy support (residential proxies for maximum bypass)
 * - Retry with different strategies
 * - SEC.gov specific handling
 *
 * Usage: node capture-stealth.js <source_id> <url> <evidence_dir> [--proxy=URL]
 *
 * Environment variables:
 *   PROXY_URL - Residential proxy URL (e.g., http://user:pass@host:port)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Parse arguments
const args = process.argv.slice(2);
let proxyUrl = process.env.PROXY_URL || null;

const positionalArgs = [];
for (const arg of args) {
  if (arg.startsWith('--proxy=')) {
    proxyUrl = arg.split('=')[1];
  } else {
    positionalArgs.push(arg);
  }
}

if (positionalArgs.length < 3) {
  console.error('Usage: node capture-stealth.js <source_id> <url> <evidence_dir> [--proxy=URL]');
  process.exit(1);
}

const [sourceId, url, evidenceDir] = positionalArgs;

// Realistic User-Agents (Chrome on Mac, Windows, Linux - 2024/2025 versions)
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
];

// SEC-specific User-Agent (must look like standard browser)
const SEC_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Realistic screen resolutions
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 2560, height: 1440 },
  { width: 1366, height: 768 },
];

// Random delay between min and max ms
function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Sleep for ms
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Calculate hash
function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Detect site type for custom handling
function detectSiteType(url) {
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes('sec.gov')) return 'sec';
  if (host.includes('cloudflare')) return 'cloudflare-protected';
  if (host.includes('peteandgerrys')) return 'cloudflare-protected';
  if (host.includes('kipster')) return 'cloudflare-protected';
  if (host.includes('whiteoakpastures')) return 'cloudflare-protected';
  if (host.includes('globalanimalpartnership')) return 'cloudflare-protected';
  if (host.includes('aphis.usda.gov')) return 'government';
  return 'standard';
}

// Create stealth browser context
async function createStealthContext(browser, siteType) {
  const viewport = VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
  let userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  // SEC needs consistent, standard User-Agent
  if (siteType === 'sec') {
    userAgent = SEC_USER_AGENT;
  }

  const contextOptions = {
    viewport,
    userAgent,
    // Realistic locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',
    // Permissions
    permissions: ['geolocation'],
    // Ignore HTTPS errors for some government sites
    ignoreHTTPSErrors: true,
    // Extra HTTP headers to look more like a real browser
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    }
  };

  // Add proxy if available
  if (proxyUrl) {
    contextOptions.proxy = { server: proxyUrl };
    console.log(`Using proxy: ${proxyUrl.replace(/:[^:@]+@/, ':***@')}`);
  }

  const context = await browser.newContext(contextOptions);

  // Add stealth scripts to evade detection
  await context.addInitScript(() => {
    // Override webdriver
    Object.defineProperty(navigator, 'webdriver', { get: () => false });

    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
      ]
    });

    // Override languages
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

    // Override platform
    Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });

    // Override hardware concurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });

    // Override device memory
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });

    // Mock chrome runtime for some bot detectors
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {},
      app: {},
    };

    // Override permissions query
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });

  return context;
}

// Simulate human-like mouse movements
async function simulateHumanBehavior(page) {
  // Random mouse movements
  const moves = randomDelay(2, 5);
  for (let i = 0; i < moves; i++) {
    const x = randomDelay(100, 1200);
    const y = randomDelay(100, 800);
    await page.mouse.move(x, y, { steps: randomDelay(5, 15) });
    await sleep(randomDelay(50, 200));
  }

  // Random scroll
  await page.evaluate(() => {
    window.scrollBy(0, Math.floor(Math.random() * 300));
  });

  await sleep(randomDelay(500, 1500));
}

// Main capture function with retry logic
async function capture(attempt = 1) {
  const startTime = new Date();
  const errors = [];

  fs.mkdirSync(evidenceDir, { recursive: true });

  const siteType = detectSiteType(url);
  console.log(`[Attempt ${attempt}] Capturing ${sourceId}: ${url}`);
  console.log(`Site type: ${siteType}`);

  let browser;
  let pageTitle = '';
  let httpStatus = null;

  try {
    // Launch with stealth settings
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--lang=en-US,en',
      ]
    });

    const context = await createStealthContext(browser, siteType);
    const page = await context.newPage();

    // Pre-navigation delay for bot-protected sites
    if (siteType === 'cloudflare-protected' || siteType === 'sec') {
      console.log('Adding pre-navigation delay for bot protection...');
      await sleep(randomDelay(2000, 4000));
    }

    // Navigate
    console.log('Loading page...');
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 90000
    });

    httpStatus = response ? response.status() : null;

    // Handle Cloudflare challenge pages
    if (httpStatus === 403 || httpStatus === 503) {
      console.log(`Got ${httpStatus}, waiting for challenge resolution...`);
      await sleep(5000);

      // Check if challenge resolved
      const newResponse = await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
      httpStatus = newResponse ? newResponse.status() : httpStatus;
    }

    pageTitle = await page.title();
    console.log(`Page loaded: "${pageTitle}" (HTTP ${httpStatus})`);

    // Check for bot block pages
    const content = await page.content();
    const isBotBlocked =
      /undeclared automated|access denied|please verify|cloudflare|attention required/i.test(content) ||
      /captcha|robot|bot detection/i.test(content);

    if (isBotBlocked && attempt < 3) {
      console.log('Bot detection detected, retrying with different approach...');
      await browser.close();
      await sleep(randomDelay(5000, 10000));
      return capture(attempt + 1);
    }

    // Simulate human behavior
    await simulateHumanBehavior(page);

    // Wait for dynamic content
    await sleep(randomDelay(2000, 4000));

    // Capture screenshot
    console.log('Capturing screenshot...');
    const screenshotPath = path.join(evidenceDir, 'capture.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png'
    });

    // Capture PDF
    console.log('Capturing PDF...');
    const pdfPath = path.join(evidenceDir, 'capture.pdf');
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' }
    });

    // Capture HTML
    console.log('Capturing HTML...');
    const htmlPath = path.join(evidenceDir, 'capture.html');
    const htmlContent = await page.content();
    fs.writeFileSync(htmlPath, htmlContent);

    await browser.close();

    // Calculate hashes
    console.log('Calculating hashes...');
    const files = {};
    for (const filename of ['capture.png', 'capture.pdf', 'capture.html']) {
      const filePath = path.join(evidenceDir, filename);
      if (fs.existsSync(filePath)) {
        const hash = hashFile(filePath);
        const stats = fs.statSync(filePath);
        files[filename.replace('capture.', '')] = {
          path: filename,
          hash: `sha256:${hash}`,
          size: stats.size
        };
        console.log(`  ${filename}: sha256:${hash.substring(0, 16)}...`);
      }
    }

    // Create metadata
    const metadata = {
      source_id: sourceId,
      url: url,
      title: pageTitle,
      captured_at: startTime.toISOString(),
      capture_duration_ms: Date.now() - startTime.getTime(),
      method: 'playwright-stealth',
      attempt: attempt,
      site_type: siteType,
      used_proxy: !!proxyUrl,
      http_status: httpStatus,
      files: files,
      errors: errors.length > 0 ? errors : undefined
    };

    const metadataPath = path.join(evidenceDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Summary
    console.log('\n--- Capture Summary ---');
    console.log(`Source ID: ${sourceId}`);
    console.log(`URL: ${url}`);
    console.log(`Title: ${pageTitle}`);
    console.log(`HTTP Status: ${httpStatus}`);
    console.log(`Attempt: ${attempt}`);
    console.log(`Files captured: ${Object.keys(files).length}`);

    return { success: true, httpStatus, pageTitle };

  } catch (err) {
    console.error(`Capture error: ${err.message}`);
    errors.push(err.message);

    if (browser) {
      await browser.close().catch(() => {});
    }

    // Retry on certain errors
    if (attempt < 3 && (err.message.includes('timeout') || err.message.includes('net::'))) {
      console.log(`Retrying in ${5 * attempt} seconds...`);
      await sleep(5000 * attempt);
      return capture(attempt + 1);
    }

    // Save error state
    const metadata = {
      source_id: sourceId,
      url: url,
      captured_at: startTime.toISOString(),
      method: 'playwright-stealth',
      attempt: attempt,
      site_type: siteType,
      used_proxy: !!proxyUrl,
      http_status: httpStatus,
      files: {},
      errors: errors
    };

    const metadataPath = path.join(evidenceDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return { success: false, error: err.message };
  }
}

// Run
capture().then(result => {
  console.log('\n--- JSON Output ---');
  console.log(JSON.stringify(result));
  process.exit(result.success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
