import assert from 'node:assert/strict';
import { TRACK_PRESETS } from '../src/utils/trackData.js';
import { formatTime } from '../src/utils/formatTime.js';

// Follow the centreline using ordinary keyboard events. Only the existing
// read-only minimap/guard telemetry and visible HUD are observed: no store writes,
// checkpoint calls, body teleportation or physics/time overrides.
export async function completeBrowserLaps(browser, url, runs) {
  const tracks = TRACK_PRESETS.filter(track => !process.env.BROWSER_TRACK
    || track.id === process.env.BROWSER_TRACK);
  assert.ok(tracks.length, 'BROWSER_TRACK must be a known track id');
  for (const track of tracks) {
    const context = await browser.newContext({ viewport: { width: 640, height: 480 } });
    const page = await context.newPage();
    page.setDefaultTimeout(60_000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.text().startsWith('LAP ')) console.log(track.id, message.text());
    });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.getByRole('radio', { name: `Select ${track.name}`, exact: true }).click();
    assert.equal(await page.locator('.menu-personal-best strong').innerText(), 'NO TIME SET');
    await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
    await page.waitForFunction(() => window.racerPositions?.player
      && !document.querySelector('.countdown'));
    const points = track.curve.getSpacedPoints(4096).slice(0, -1).map(p => ({ x: p.x, z: p.z }));
    await page.evaluate(({ points, length }) => {
      const keys = new Set();
      const setKey = (code, pressed) => {
        if (keys.has(code) === pressed) return;
        if (pressed) keys.add(code); else keys.delete(code);
        window.dispatchEvent(new KeyboardEvent(pressed ? 'keydown' : 'keyup', {
          code, key: { KeyW: 'w', KeyA: 'a', KeyD: 'd', Space: ' ' }[code], bubbles: true,
        }));
      };
      const report = window.__browserLap = { checkpoints: [], distance: 0, maxSpeed: 0, done: false };
      let last = null;
      let nearest = points.length - 8;
      let previousError = 0;
      let previousTime = performance.now();
      let lastReportTime = previousTime;
      const step = now => {
        if (document.querySelector('.finish-overlay')) {
          for (const key of keys) setKey(key, false);
          report.done = true;
          return;
        }
        const pos = window.racerPositions?.player;
        if (!pos) { requestAnimationFrame(step); return; }
        const checkpoint = document.querySelector('.checkpoint-readout')?.getAttribute('aria-label');
        if (checkpoint && checkpoint !== report.checkpoints.at(-1)) report.checkpoints.push(checkpoint);
        const speed = Math.hypot(pos.vx, pos.vz);
        report.maxSpeed = Math.max(report.maxSpeed, speed);
        if (last) report.distance += Math.hypot(pos.x - last.x, pos.z - last.z);
        last = { x: pos.x, z: pos.z };
        let bestDistance = Infinity;
        let bestIndex = nearest;
        for (let offset = -30; offset <= 80; offset++) {
          const index = (nearest + offset + points.length) % points.length;
          const point = points[index];
          const distance = Math.hypot(point.x - pos.x, point.z - pos.z);
          if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
        }
        nearest = bestIndex;
        const ahead = Math.max(8, speed * 1.0);
        const target = points[(nearest + Math.ceil(ahead / length * points.length)) % points.length];
        const tangent = points[(nearest + 3) % points.length];
        const heading = speed > 1 ? Math.atan2(pos.vz, pos.vx)
          : Math.atan2(tangent.z - points[nearest].z, tangent.x - points[nearest].x);
        const targetHeading = Math.atan2(target.z - pos.z, target.x - pos.x);
        const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
        const error = wrap(targetHeading - heading);
        const dt = Math.max(0.01, (now - previousTime) / 1000);
        const steering = error + 0.45 * wrap(error - previousError) / dt;
        previousError = error;
        previousTime = now;
        setKey('KeyA', steering < -0.035);
        setKey('KeyD', steering > 0.035);
        const targetSpeed = Math.abs(error) > 0.45 ? 5 : 10;
        setKey('KeyW', speed < targetSpeed);
        setKey('Space', speed > targetSpeed + 1);
        Object.assign(report, { progress: nearest / points.length, speed, error, centerlineDistance: bestDistance });
        report.gameProgress = window.__RACING_RUNTIME_DIAGNOSTICS__?.progress;
        if (now - lastReportTime > 15_000) {
          console.log('LAP ' + JSON.stringify(report));
          lastReportTime = now;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { points, length: track.length });

    // The timeout is wall-clock time; physics and the race clock run normally.
    try {
      await page.waitForFunction(() => window.__browserLap?.done, null, { timeout: 600_000 });
    } catch (error) {
      const telemetry = await page.evaluate(() => ({
        ...window.__browserLap,
        runtimeEvents: window.__RACING_RUNTIME_DIAGNOSTICS__?.snapshot(),
      }));
      runs.push({ track: track.id, completion: false, ...telemetry, passed: false });
      throw new Error(`${track.id} did not finish: ${JSON.stringify(telemetry)}`, { cause: error });
    }
    const telemetry = await page.evaluate(() => window.__browserLap);
    assert.deepEqual(telemetry.checkpoints, [
      ...Array.from({ length: 9 }, (_, index) => `Next checkpoint ${index + 1} of 9`),
      'Next checkpoint finish',
    ], 'Every checkpoint must be accepted in order before finishing');
    assert.ok(telemetry.distance > track.length * 0.9, 'Player must physically drive a full circuit');
    assert.ok(telemetry.maxSpeed > 2, 'Player must move under keyboard control');
    const bests = await page.evaluate(() => JSON.parse(localStorage.getItem('apex-racing:personal-bests:v1')));
    const best = bests?.[track.id];
    assert.ok(Number.isFinite(best) && best > 0, 'Completion must persist a valid lap time');
    const finalLap = await page.locator('.result-times > div').filter({ hasText: 'Final lap' }).locator('dd').innerText();
    assert.equal(formatTime(best), finalLap, 'Persisted time must equal the completed lap');
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('radio', { name: `Select ${track.name}`, exact: true }).click();
    assert.equal(await page.locator('.menu-personal-best strong').innerText(), finalLap,
      'Personal best must survive a fresh app load');
    assert.deepEqual(errors, [], 'No uncaught errors during completion or reload');
    runs.push({ track: track.id, completion: true, reloadPersistence: true, best, ...telemetry, passed: true });
    console.log('PASS complete lap and persistent record', track.id, finalLap);
    await context.close();
  }
}
