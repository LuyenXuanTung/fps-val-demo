import { reactive, watch } from 'vue';

export const SENS_MIN = 0.1;
export const SENS_MAX = 5;
const SENS_KEY = 'fps.mouseSensitivity';

export function clampSensitivity(v: number): number {
    if (!Number.isFinite(v)) return 1;
    return Math.min(SENS_MAX, Math.max(SENS_MIN, v));
}

function loadSensitivity(): number {
    const raw = localStorage.getItem(SENS_KEY);
    return raw === null ? 1 : clampSensitivity(parseFloat(raw));
}

export interface KillfeedItem {
    id: number;
    isHeadshot: boolean;
    weapon: string;
}

export interface GameState {
    hp: number;
    maxHp: number;
    shield: number;
    maxShield: number;
    credits: number;
    allyScore: number;
    enemyScore: number;
    roundSeconds: number;
    killStreak: number;
    holdingSpike: boolean;
    holdingKnife: boolean;
    plantingProgress: number;
    spikePlanted: boolean;
    empressActive: boolean;
    dismissActive: boolean;
    recoilOffset: number;
    gunBobTime: number;
    lastShotTime: number;
    isLocked: boolean;
    isModalOpen: boolean;
    hitmarkerVisible: boolean;
    hitmarkerIsHead: boolean;
    killBannerVisible: boolean;
    streakLabel: string;
    streakBannerKey: number;
    enemyAvatarDim: boolean;
    killfeed: KillfeedItem[];
    mouseSensitivity: number;
    imeDetected: boolean;
    scoped: boolean;
    ammo: number;
    reloadEndsAt: number;
}

export const gameState = reactive<GameState>({
    hp: 54,
    maxHp: 100,
    shield: 25,
    maxShield: 50,
    credits: 150,
    allyScore: 1,
    enemyScore: 0,
    roundSeconds: 46,
    killStreak: 0,
    holdingSpike: false,
    holdingKnife: false,
    plantingProgress: 0,
    spikePlanted: false,
    empressActive: false,
    dismissActive: false,
    recoilOffset: 0,
    gunBobTime: 0,
    lastShotTime: 0,
    isLocked: false,
    isModalOpen: true,
    hitmarkerVisible: false,
    hitmarkerIsHead: false,
    killBannerVisible: false,
    streakLabel: '',
    streakBannerKey: 0,
    enemyAvatarDim: false,
    killfeed: [],
    mouseSensitivity: loadSensitivity(),
    imeDetected: false,
    scoped: false,
    ammo: 30,
    reloadEndsAt: 0
});

watch(() => gameState.mouseSensitivity, v => localStorage.setItem(SENS_KEY, String(v)));

export function resetGameState(): void {
    gameState.hp = 54;
    gameState.shield = 25;
    gameState.roundSeconds = 46;
    gameState.holdingSpike = false;
    gameState.holdingKnife = false;
    gameState.plantingProgress = 0;
    gameState.spikePlanted = false;
    gameState.empressActive = false;
    gameState.dismissActive = false;
    gameState.ammo = 30;
    gameState.reloadEndsAt = 0;
}
