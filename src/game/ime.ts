// Vietnamese IMEs (Unikey/EVKey Telex) swallow W/A/S/D and inject Backspace + accented chars.
// Signatures: keyCode 229 / key 'Process', non-ASCII key, empty code (VK_PACKET), or a Backspace
// the player never pressed on purpose during gameplay.
export function looksLikeIme(e: { key: string; code: string; keyCode: number }): boolean {
    if (e.keyCode === 229 || e.key === 'Process') return true;
    if (e.code === '' || e.code === 'Backspace') return true;
    return e.key.length === 1 && e.key.charCodeAt(0) > 127;
}

// Even with IME on, a lone 'a' passes through cleanly, so hiding on the first clean key would flicker.
// Require a streak of clean presses before declaring the IME off.
export const CLEAN_STREAK_TO_CLEAR = 8;

export function createImeTracker() {
    let detected = false;
    let cleanStreak = 0;
    return {
        /** Feed one keydown; returns current "IME detected" state. */
        feed(e: { key: string; code: string; keyCode: number }): boolean {
            if (looksLikeIme(e)) {
                detected = true;
                cleanStreak = 0;
            } else if (detected && ++cleanStreak >= CLEAN_STREAK_TO_CLEAR) {
                detected = false;
                cleanStreak = 0;
            }
            return detected;
        },
        reset(): void {
            detected = false;
            cleanStreak = 0;
        }
    };
}
