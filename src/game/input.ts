import { gameState, resetGameState } from './state.js';
import { createImeTracker } from './ime.js';
import { sound } from './audio.js';
import { player, camera, HIP_FOV } from './scene.js';
import { castLeerBlind, castDevourHeal, castDismiss, castEmpressUltimate, toggleSpikeEquip, toggleKnife, syncViewmodel } from './abilities.js';

const imeTracker = createImeTracker();

export const keys: Record<string, boolean> = {};
export let isMouseDown: boolean = false;

const WHEEL_THROTTLE_MS = 200; // trackpads fire many wheel events per gesture
let lastWheelTime = 0;

function releaseAllInput(): void {
    for (const k in keys) keys[k] = false;
    isMouseDown = false;
    gameState.scoped = false;
}

export function setupInput(): void {
    // keyup is never delivered if focus leaves the page mid-press (alt-tab, OS popup),
    // which leaves keys stuck. Reset everything when focus/lock is lost.
    window.addEventListener('blur', releaseAllInput);

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === document.body) {
            gameState.isLocked = true;
            gameState.isModalOpen = false;
        } else {
            gameState.isLocked = false;
            gameState.isModalOpen = true;
            releaseAllInput();
        }
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
        const code = e.code;
        keys[code] = true;

        if (document.pointerLockElement !== document.body) return;
        gameState.imeDetected = imeTracker.feed(e);
        // Block browser shortcuts (Ctrl+W, Ctrl+S, Space scroll...) that steal focus mid-game
        e.preventDefault();
        if (e.repeat) return;

        if (code === 'KeyC') castLeerBlind();
        if (code === 'KeyQ') castDevourHeal();
        if (code === 'KeyE') castDismiss();
        if (code === 'KeyX') castEmpressUltimate();
        if (code === 'Digit4') toggleSpikeEquip();
        if (code === 'Digit1') {
            if (gameState.holdingSpike) toggleSpikeEquip();
            if (gameState.holdingKnife) toggleKnife();
        }

        if (code === 'Space' && player.onGround) {
            player.vel.y = 6.2;
            player.onGround = false;
        }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
        keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
        if (document.pointerLockElement !== document.body) return;
        // Scale by current zoom so on-screen motion per mouse count matches hip-fire
        const zoom = Math.tan((camera.fov * Math.PI) / 360) / Math.tan((HIP_FOV * Math.PI) / 360);
        const sensitivity = 0.0021 * gameState.mouseSensitivity * zoom;
        player.yaw -= e.movementX * sensitivity;
        player.pitch -= e.movementY * sensitivity;
        player.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, player.pitch));
    });

    // Block the browser context menu so right-click can be used for ADS
    window.addEventListener('contextmenu', (e) => {
        if (document.pointerLockElement === document.body) e.preventDefault();
    });

    // Mouse wheel: toggle knife <-> rifle
    window.addEventListener('wheel', () => {
        if (document.pointerLockElement !== document.body) return;
        const now = performance.now();
        if (now - lastWheelTime < WHEEL_THROTTLE_MS) return;
        lastWheelTime = now;
        gameState.scoped = false;
        toggleKnife();
    });

    // Left = fire/slash (handled in engine loop while isMouseDown). Right = tap to toggle aim down sights.
    window.addEventListener('mousedown', (e: MouseEvent) => {
        if (document.pointerLockElement !== document.body) return;
        if (e.button === 0) isMouseDown = true;
        if (e.button === 2 && !gameState.holdingKnife && !gameState.holdingSpike) gameState.scoped = !gameState.scoped;
    });

    window.addEventListener('mouseup', (e: MouseEvent) => {
        if (e.button === 0) {
            isMouseDown = false;
            gameState.plantingProgress = 0;
        }
    });
}

export function requestGameLock(): void {
    sound.init();
    document.body.requestPointerLock();
}

export function resetGameSession(): void {
    resetGameState();
    syncViewmodel();
    if (player) {
        player.pos.set(2.2, 1.72, 8.8);
        player.yaw = 0.24;
        player.pitch = -0.02;
    }
    requestGameLock();
}
