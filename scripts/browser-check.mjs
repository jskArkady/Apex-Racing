import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { completeBrowserLaps } from './browser-lap.mjs';
import { measureRaceLoading, summarizeRaceLoading } from './browser-race-loading.mjs';

// Reuse an installed Playwright runtime without adding a game dependency.
async function resolveChromium() {
  const moduleCandidates = []
  if (process.env.PLAYWRIGHT_MODULE) moduleCandidates.push(process.env.PLAYWRIGHT_MODULE)
  moduleCandidates.push('playwright')

  const failures = []
  for (const candidate of moduleCandidates) {
    try {
      const playwright = await import(candidate);
      if (playwright.chromium) return { chromium: playwright.chromium, source: candidate };
      failures.push(`${candidate}: resolved without chromium export`);
    } catch (error) {
      failures.push(`${candidate}: ${error.message}`);
    }
  }

  const fallback = failures
    .map(message => `  - ${message}`)
    .join('\n');
  throw new Error([
    'Could not load Playwright runtime.',
    `Tried: ${moduleCandidates.join(', ')}`,
    'Install Playwright (npm i -D playwright) and run npx playwright install chromium,',
    'or set PLAYWRIGHT_MODULE to the absolute path of its index.mjs.',
    `Lookup details:\n${fallback}`,
  ].join('\n'));
}

const { chromium, source } = await resolveChromium();
console.log('Playwright source', source);
const mode = process.argv[2] ?? 'smoke';
const root = resolve(process.argv[3] ?? 'dist');
const label = process.argv[4] ?? mode;
const output = resolve(process.env.BROWSER_OUTPUT_DIR ?? '/tmp');
assert.ok(['smoke', 'measure', 'measure-race', 'lap', 'race'].includes(mode), 'Mode must be smoke, measure, measure-race, lap or race');
await mkdir(output, { recursive: true });
const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.wasm': 'application/wasm',
};
const server = createServer(async (req, res) => {
  try {
    let path = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!path.startsWith(root + '/') && path !== root) {
      res.writeHead(403).end();
      return;
    }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    const bytes = await readFile(path);
    const zipped = /\.(html|js|css)$/.test(path);
    res.writeHead(200, {
      'Content-Type': mime[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
      ...(zipped ? { 'Content-Encoding': 'gzip' } : {}),
    });
    res.end(zipped ? gzipSync(bytes) : bytes);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
let browser;
const runs = [];
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    env: {
      ...process.env,
      ...(process.env.CHROMIUM_LIBRARY_PATH
        ? { LD_LIBRARY_PATH: process.env.CHROMIUM_LIBRARY_PATH } : {}),
    },
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  console.log('Browser', browser.version(), url);
  if (mode === 'measure') await measure();
  else if (mode === 'measure-race') await measureRaceLoading(browser, url, runs);
  else if (mode === 'race') await completeBrowserLaps(browser, url, runs, 'single');
  else if (mode === 'lap') await completeBrowserLaps(browser, url, runs);
  else await smoke();
} catch (error) {
  runs.push({ passed: false, error: error.message });
  const page = browser?.contexts().at(-1)?.pages().at(-1);
  if (page) await page.screenshot({ path: `${output}/racing-${label}-failure.png` }).catch(() => {});
  throw error;
} finally {
  await writeFile(`${output}/racing-${label}-metrics.json`, JSON.stringify({
    browser: browser?.version(),
    profile: mode === 'measure' || mode === 'measure-race'
      ? '1280x720, fresh context per run, cache disabled, gzip, 40ms latency, 10Mbps download, SwiftShader'
      : 'Fresh context per case, production build, SwiftShader, CDP touch emulation (no physical mobile GPU)',
    runs,
    ...(mode === 'measure-race' ? { summary: summarizeRaceLoading(runs) } : {}),
  }, null, 2));
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

async function measure() {
  for (let index = 0; index < 5; index++) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 40, downloadThroughput: 1_250_000, uploadThroughput: 625_000,
    });
    await page.addInitScript(() => {
      new MutationObserver(() => {
        if (!window.__menuReadyAt && document.querySelector('[aria-label="Start Race"]')) {
          requestAnimationFrame(() => requestAnimationFrame(() => {
            window.__menuReadyAt ??= performance.now();
          }));
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.getByRole('button', { name: 'Start Race', exact: true }).waitFor();
    await page.waitForFunction(() => window.__menuReadyAt > 0);
    const result = await page.evaluate(() => {
      const scripts = performance.getEntriesByType('resource').filter(resource => resource.name.endsWith('.js'));
      return {
        menuReadyMs: window.__menuReadyAt,
        fcpMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        jsBytes: scripts.reduce((sum, resource) => sum + resource.encodedBodySize, 0),
        js: scripts.map(resource => resource.name.split('/').at(-1)),
      };
    });
    assert.deepEqual(errors, [], 'Menu must boot without errors');
    runs.push({ ...result, errors });
    console.log(label, index + 1, JSON.stringify(result));
    if (index === 0) await page.screenshot({ path: `${output}/racing-${label}-menu.png` });
    await context.close();
  }
}
async function smoke() {
  const cases = [
    { track: 'Apex Grand Prix', width: 1280, height: 720 },
    { track: 'Harbour Street', width: 1280, height: 720 },
    { track: 'Temple Speedway', width: 1280, height: 720 },
    { track: 'Silverstone GP', width: 1280, height: 720 },
    { track: 'Silverstone GP', width: 390, height: 844, touch: true },
    { track: 'Silverstone GP', width: 320, height: 740, touch: true },
    { track: 'Silverstone GP', width: 844, height: 390, touch: true },
    { track: 'Apex Grand Prix', width: 390, height: 844, touch: true },
    { track: 'Harbour Street', width: 320, height: 740, touch: true },
    { track: 'Temple Speedway', width: 844, height: 390, touch: true },
  ];
  const selectedCases = cases.filter(testCase => !process.env.BROWSER_WIDTH
    || testCase.width === Number(process.env.BROWSER_WIDTH));
  assert.ok(selectedCases.length > 0, 'BROWSER_WIDTH must match a smoke viewport');
  for (const testCase of selectedCases) {
    const context = await browser.newContext({ viewport: { width: testCase.width, height: testCase.height }, hasTouch: !!testCase.touch, isMobile: !!testCase.touch });
    const page = await context.newPage();
    page.setDefaultTimeout(60_000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    // Exercise denied storage from boot through all normal driving actions.
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Storage access denied', 'SecurityError'); } });
    });
    await page.goto(url, { waitUntil: 'networkidle' });
    assert.ok(!requests.some(request => /\/(rapier-|RaceScene-)/.test(request)), 'Menu must not download race or physics chunks');
    await page.getByRole('radio', { name: new RegExp(testCase.track) }).click();
    const laps = testCase.width === 320 ? '5' : testCase.width === 390 ? '3' : '1';
    const difficulty = testCase.width === 320 ? 'easy' : testCase.width === 390 ? 'normal' : 'hard';
    await page.getByRole('combobox', { name: 'Laps', exact: true }).selectOption(laps);
    await page.getByRole('combobox', { name: 'AI difficulty', exact: true }).selectOption(difficulty);
    assert.ok(await page.evaluate(() => {
      const menu = document.querySelector('.main-menu');
      return menu.scrollWidth <= menu.clientWidth;
    }), 'Menu options must fit horizontally');
    await page.screenshot({ path: `${output}/racing-${label}-menu-${testCase.width}-${testCase.track.replaceAll(' ', '-')}.png` });
    await page.getByRole('button', { name: 'Start Race', exact: true }).click();
    await waitPlaying(page);
    assert.match(await page.locator('.hud-race-position').innerText(), new RegExp(`Lap\\s*1\\s*/\\s*${laps}`, 'i'), 'HUD must use selected lap count');
    const start = await position(page);
    assert.ok(await page.evaluate(() => !!document.querySelector('canvas')?.getContext('webgl2')), 'Real WebGL2 context required');
    if (testCase.touch) {
      const cdp = await context.newCDPSession(page);
      const accelerator = page.getByRole('button', { name: 'Accelerate', exact: true });
      const steering = page.getByRole('button', { name: 'Steer left', exact: true });
      const a = await touchPoint(accelerator, 1);
      const b = await touchPoint(steering, 2);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a, b] });
      assert.equal(await accelerator.getAttribute('aria-pressed'), 'true');
      assert.equal(await steering.getAttribute('aria-pressed'), 'true');
      await waitMovement(page, start);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      assert.equal(await accelerator.getAttribute('aria-pressed'), 'false');
      assert.equal(await steering.getAttribute('aria-pressed'), 'false');
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      assert.equal(await accelerator.getAttribute('aria-pressed'), 'false');
      await page.getByRole('button', { name: 'Pause race', exact: true }).tap();
    } else {
      await page.keyboard.down('w');
      await waitMovement(page, start);
      await page.keyboard.up('w');
      await page.keyboard.press('Escape');
    }
    await page.getByRole('dialog', { name: 'PAUSED', exact: true }).waitFor();
    const paused = await position(page);
    const elapsed = await page.locator('.pause-summary').innerText();
    await page.waitForTimeout(800);
    assert.deepEqual(await position(page), paused, 'Physics must remain paused');
    assert.equal(await page.locator('.pause-summary').innerText(), elapsed, 'Clock must remain paused');
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await waitPlaying(page);
    if (testCase.touch) {
      assert.equal(await page.getByRole('button', { name: 'Accelerate', exact: true }).getAttribute('aria-pressed'), 'false');
      await page.getByRole('button', { name: 'Pause race', exact: true }).tap();
    } else await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Restart Race', exact: true }).click();
    await page.locator('.countdown').waitFor();
    assert.equal(Number(await page.locator('.speed-display strong').innerText()), 0, 'Restart speed must be zero');
    // The minimap bridge is cleared during countdown and republished by the
    // first playing frame; observe the physical reset after that publication.
    await waitPlaying(page);
    const restart = await position(page);
    assert.ok(Math.hypot(restart.x - start.x, restart.z - start.z) < 1, 'Restart must restore starting grid');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'No horizontal viewport overflow');
    const clippedReadouts = await page.evaluate(() => Array.from(document.querySelectorAll('.hud-top strong')).flatMap(element => {
      if (!element.getBoundingClientRect().width) return [];
      const range = document.createRange();
      range.selectNodeContents(element);
      const rect = range.getBoundingClientRect();
      const viewport = document.documentElement.clientWidth;
      return rect.left < 0 || rect.right > viewport
        ? [{ text: element.textContent, left: rect.left, right: rect.right, viewport }]
        : [];
    }));
    assert.deepEqual(clippedReadouts, [], 'HUD readout text must stay inside the viewport');
    await page.screenshot({ path: `${output}/racing-${label}-${testCase.width}-${testCase.track.replaceAll(' ', '-')}.png` });
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    runs.push({ ...testCase, passed: true, storageDenied: true, errors });
    console.log('PASS', JSON.stringify(testCase));
    await context.close();
  }
  await delayedDownload();
  await failedDownload();
}

async function position(page) {
  return page.evaluate(() => ({ x: window.__RACING_TELEMETRY__?.positions.player.x, z: window.__RACING_TELEMETRY__?.positions.player.z }));
}
async function waitPlaying(page) {
  await page.waitForFunction(() => window.__RACING_TELEMETRY__?.positions?.player && document.querySelector('.timing-current strong') && Number(document.querySelector('.timing-current strong').textContent.replace(/\D/g, '')) > 0);
}
async function waitMovement(page, start) {
  await page.waitForFunction(start => {
    const p = window.__RACING_TELEMETRY__?.positions?.player;
    return p && Math.hypot(p.x - start.x, p.z - start.z) > 2;
  }, start);
  assert.ok(Number(await page.locator('.speed-display strong').innerText()) > 0, 'Throttle must produce speed');
}
async function touchPoint(locator, id) {
  const box = await locator.boundingBox();
  assert.ok(box, 'Touch control must be visible');
  return { id, x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function delayedDownload() {
  const context = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  await page.addInitScript(() => {
    window.__countdownCues = [];
    new MutationObserver(() => {
      const cue = document.querySelector('.countdown span')?.textContent.trim();
      if (cue && cue !== window.__countdownCues.at(-1)) window.__countdownCues.push(cue);
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/RaceScene-*.js', async route => { await gate; await route.continue(); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Preparing race' }).waitFor();
  await page.waitForTimeout(3500);
  assert.equal(await page.locator('.countdown').count(), 0, 'Countdown must wait for chunk');
  await page.getByRole('button', { name: 'Back to Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Start Race', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
  await page.keyboard.press('Escape');
  release();
  await page.waitForResponse(response => /\/RaceScene-.*\.js$/.test(response.url()));
  await page.getByRole('dialog', { name: 'PAUSED', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.locator('.countdown').waitFor();
  assert.equal(await page.evaluate(() => window.__countdownCues[0]), '3', 'Cold race must start with full countdown');
  await waitPlaying(page);
  assert.deepEqual(await page.evaluate(() => Object.keys(window.__RACING_TELEMETRY__?.positions)), ['player'], 'Time Trial must not contain AI');
  runs.push({ delayedDownload: true, cancelAndRetry: true, pauseDuringLoad: true, timeTrial: true, passed: true });
  console.log('PASS delayed download, cancel and retry, pause during load, Time Trial');
  await context.close();
}

async function failedDownload() {
  const context = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  await page.route('**/RaceScene-*.js', route => route.abort('failed'));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start Race', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'The race could not load' }).waitFor();
  await page.getByRole('button', { name: 'Back to Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'The race could not load' }).waitFor();
  await page.unroute('**/RaceScene-*.js');
  await page.getByRole('button', { name: 'Reload Game', exact: true }).click();
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
  await waitPlaying(page);
  runs.push({ failedDownload: true, menuSurvives: true, reloadRecovery: true, passed: true });
  console.log('PASS failed download, menu survives, reload recovery');
  await context.close();
}
