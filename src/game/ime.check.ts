// Run: node --experimental-strip-types src/game/ime.check.ts
import assert from 'node:assert/strict';
import { looksLikeIme, createImeTracker, CLEAN_STREAK_TO_CLEAR } from './ime.ts';

const k = (key: string, code: string, keyCode = 0) => ({ key, code, keyCode });
const W = k('w', 'KeyW', 87);
const IME = k('Process', 'KeyW', 229);

assert.equal(looksLikeIme(W), false, 'plain W');
assert.equal(looksLikeIme(k('W', 'KeyW', 87)), false, 'shift W');
assert.equal(looksLikeIme(k(' ', 'Space', 32)), false, 'space');
assert.equal(looksLikeIme(IME), true, 'IME composing');
assert.equal(looksLikeIme(k('ư', '', 0)), true, 'injected unicode (VK_PACKET)');
assert.equal(looksLikeIme(k('Backspace', 'Backspace', 8)), true, 'IME backspace injection');
assert.equal(looksLikeIme(k('ơ', 'KeyW', 87)), true, 'non-ascii key');

// Tracker: stays on through short clean bursts, clears after a full clean streak (user switched to E)
const t = createImeTracker();
assert.equal(t.feed(W), false, 'clean start');
assert.equal(t.feed(IME), true, 'detected');
for (let i = 1; i < CLEAN_STREAK_TO_CLEAR; i++) assert.equal(t.feed(W), true, `still on at clean #${i}`);
assert.equal(t.feed(IME), true, 'IME signal resets streak');
for (let i = 1; i < CLEAN_STREAK_TO_CLEAR; i++) t.feed(W);
assert.equal(t.feed(W), false, 'cleared after full clean streak');
assert.equal(t.feed(W), false, 'stays cleared');

console.log('ime checks passed');
