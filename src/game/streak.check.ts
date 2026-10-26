// Run: node --experimental-strip-types src/game/streak.check.ts
import assert from 'node:assert/strict';
import { nextStreak, STREAK_WINDOW_MS, STREAK_NAMES } from './streak.ts';

assert.equal(nextStreak(0, 0, 1000), 1, 'first kill');
assert.equal(nextStreak(1, 1000, 1000 + STREAK_WINDOW_MS), 2, 'within window (inclusive)');
assert.equal(nextStreak(2, 1000, 1001 + STREAK_WINDOW_MS), 1, 'window expired resets');
assert.equal(nextStreak(5, 1000, 1500), 5, 'capped at ACE');
assert.equal(STREAK_NAMES[3], 'TRIPLE KILL');
console.log('streak checks passed');
