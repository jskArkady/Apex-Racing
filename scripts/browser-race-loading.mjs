import assert from 'node:assert/strict';
import { TRACK_PRESETS } from '../src/utils/trackData.js';

export function summarizeRaceLoading(runs) {
  return TRACK_PRESETS.flatMap(track => {
    const samples = runs.filter(run => run.track === track.id && run.measured);
    if (!samples.length) return [];
    const fields = [
      'clickToCountdownMs', 'clickToPlayingMs', 'clickToMovementMs',
      'countdownToPlayingMs', 'jsDownloadEndMs', 'postJsToCountdownMs',
      'imageDownloadEndMs', 'deferredJsBytes', 'deferredImageBytes', 'longTaskMs',
    ];
    return [{
      track: track.id,
      samples: samples.length,
      fullCountdownVisibleSamples: samples.filter(sample => sample.fullCountdownVisible).length,
      countdownDurationPreservedSamples: samples.filter(sample => sample.countdownDurationPreserved).length,
      metrics: Object.fromEntries(fields.map(field => {
        const values = samples.map(sample => sample[field]).sort((a, b) => a - b);
        const middle = Math.floor(values.length / 2);
        const median = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
        return [field, { min: values[0], median, max: values.at(-1) }];
      })),
    }];
  });
}

// Observe the production app from the browser. Keep download spans separate
// from UI milestones: downloads, decoding, physics and rendering can overlap.
export async function measureRaceLoading(browser, url, runs) {
  const tracks = TRACK_PRESETS.filter(track => !process.env.BROWSER_TRACK
    || track.id === process.env.BROWSER_TRACK);
  assert.ok(tracks.length, 'BROWSER_TRACK must be a known track id');
  for (const track of tracks) {
    for (let sample = 1; sample <= 5; sample++) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      page.setDefaultTimeout(60_000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false, latency: 40, downloadThroughput: 1_250_000, uploadThroughput: 625_000,
      });
      await page.addInitScript(() => {
        performance.setResourceTimingBufferSize(2000);
        const timing = window.__raceLoadingTiming = { longTasks: [], countdownCues: [] };
        if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
          new PerformanceObserver(list => {
            timing.longTasks.push(...list.getEntries().map(entry => ({
              startTime: entry.startTime, duration: entry.duration,
            })));
          }).observe({ type: 'longtask', buffered: true });
        }
        document.addEventListener('click', event => {
          if (event.target.closest?.('[aria-label="Start Race"]')) timing.clickedAt = performance.now();
        }, true);
        const observe = () => {
          if (!timing.clickedAt) return;
          const cue = document.querySelector('.countdown span')?.textContent.trim();
          if (cue && cue !== timing.countdownCues.at(-1)) timing.countdownCues.push(cue);
          if (document.querySelector('.hud-container')) timing.countdownReadyAt ??= performance.now();
        };
        new MutationObserver(observe).observe(document, {
          subtree: true, childList: true, characterData: true,
        });
        const frame = () => {
          const player = window.__RACING_TELEMETRY__?.positions?.player;
          const clock = document.querySelector('.timing-current strong');
          if (timing.clickedAt && player && clock
            && Number(clock.textContent.replace(/\D/g, '')) > 0) {
            timing.playingAt ??= performance.now();
            timing.startPosition ??= { x: player.x, z: player.z };
            if (Math.hypot(player.x - timing.startPosition.x, player.z - timing.startPosition.z) > 0.1) {
              timing.movedAt ??= performance.now();
            }
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.getByRole('radio', { name: `Select ${track.name}`, exact: true }).click();
      await page.waitForLoadState('networkidle');
      assert.equal(await page.evaluate(() => performance.getEntriesByType('resource')
        .some(entry => /\/(rapier-|RaceScene-)/.test(entry.name))), false,
      'Menu must not preload race chunks');
      await page.getByRole('button', { name: 'Start Race', exact: true }).click();
      await page.keyboard.down('w');
      await page.waitForFunction(() => window.__raceLoadingTiming?.movedAt > 0);
      await page.keyboard.up('w');
      // Finish collecting deferred images, even if their downloads outlast the
      // countdown. This is network completion, not a GPU texture-ready signal.
      await page.waitForLoadState('networkidle');
      const result = await page.evaluate(() => {
        const timing = window.__raceLoadingTiming;
        const resources = performance.getEntriesByType('resource')
          .filter(entry => entry.startTime >= timing.clickedAt)
          .map(entry => ({
            name: new URL(entry.name).pathname.split('/').at(-1),
            startMs: entry.startTime - timing.clickedAt,
            endMs: entry.responseEnd - timing.clickedAt,
            bytes: entry.encodedBodySize,
            durationMs: entry.duration,
          }));
        const scripts = resources.filter(entry => entry.name.endsWith('.js'));
        const images = resources.filter(entry => /\.(webp|png|jpe?g)$/.test(entry.name));
        const scriptEnd = Math.max(0, ...scripts.map(entry => entry.endMs));
        const readyMs = timing.countdownReadyAt - timing.clickedAt;
        const controlMs = timing.playingAt - timing.clickedAt;
        const longTasks = timing.longTasks.filter(entry => entry.startTime < timing.playingAt
          && entry.startTime + entry.duration > timing.clickedAt);
        return {
          clickToCountdownMs: readyMs,
          clickToPlayingMs: controlMs,
          countdownToPlayingMs: controlMs - readyMs,
          clickToMovementMs: timing.movedAt - timing.clickedAt,
          jsDownloadEndMs: scriptEnd,
          postJsToCountdownMs: readyMs - scriptEnd,
          imageDownloadEndMs: Math.max(0, ...images.map(entry => entry.endMs)),
          deferredJsBytes: scripts.reduce((sum, entry) => sum + entry.bytes, 0),
          deferredImageBytes: images.reduce((sum, entry) => sum + entry.bytes, 0),
          longTaskCount: longTasks.length,
          longTaskMs: longTasks.reduce((sum, entry) => sum
            + Math.min(entry.startTime + entry.duration, timing.playingAt)
            - Math.max(entry.startTime, timing.clickedAt), 0),
          countdownCues: timing.countdownCues,
          fullCountdownVisible: ['3', '2', '1'].every((cue, index) => timing.countdownCues[index] === cue),
          // Allow 100 ms for DOM/15 Hz HUD observation jitter.
          countdownDurationPreserved: controlMs - readyMs >= 2900,
          resources,
        };
      });
      assert.deepEqual(errors, [], 'First race must load and respond to input without errors');
      assert.ok(result.clickToCountdownMs > 0 && result.clickToPlayingMs >= result.clickToCountdownMs);
      assert.ok(result.clickToMovementMs >= result.clickToPlayingMs);
      assert.ok(result.deferredJsBytes > 0 && result.deferredImageBytes > 0);
      runs.push({ track: track.id, sample, ...result, measured: true });
      const { resources: _resources, ...summary } = result;
      console.log(track.id, sample, JSON.stringify(summary));
      await context.close();
    }
  }
}
