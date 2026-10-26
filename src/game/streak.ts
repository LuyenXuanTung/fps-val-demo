// Multi-kill window: each kill must land within STREAK_WINDOW_MS of the previous one.
export const STREAK_WINDOW_MS = 4000;
export const STREAK_NAMES = ['', '', 'DOUBLE KILL', 'TRIPLE KILL', 'QUADRA KILL', 'ACE'] as const;

/** Returns the new streak count (1..5, capped) for a kill at `now`. */
export function nextStreak(prev: number, lastKillAt: number, now: number): number {
    const continued = prev > 0 && now - lastKillAt <= STREAK_WINDOW_MS;
    return continued ? Math.min(prev + 1, 5) : 1;
}
