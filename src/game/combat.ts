import * as THREE from 'three';
import { scene, camera, player } from './scene.js';
import { gameState } from './state.js';
import { sound } from './audio.js';
import { enemies, type EnemyBot } from './enemies.js';
import { muzzleFlashMesh, isDrawing, ads } from './weapon.js';
import { nextStreak, STREAK_NAMES } from './streak.js';
import { notifyShot } from './net.js';
import { wallMeshes } from './map.js';

export interface ActiveTracer {
    line: THREE.Line;
    created: number;
}

export interface ActiveSoulOrb {
    mesh: THREE.Mesh;
    expires: number;
}

export const activeTracers: ActiveTracer[] = [];
export const soulOrbs: ActiveSoulOrb[] = [];
export let lastSlashTime = 0;

const raycaster = new THREE.Raycaster();
const SCREEN_CENTER = new THREE.Vector2(0, 0);
const KNIFE_RANGE = 2.5;
const KNIFE_COOLDOWN_MS = 450;
const RECOIL_KICK = 0.012;      // rad per shot
export const RECOIL_RECOVERY = 9; // 1/s exponential recovery; steady spray settles ~0.8° above aim
export const recoil = { pitch: 0 };

export function createBulletTracer(startPos: THREE.Vector3, endPos: THREE.Vector3): void {
    const mat = new THREE.LineBasicMaterial({ color: 0xffedd5, transparent: true, opacity: 0.9 });
    const geom = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);
    const line = new THREE.Line(geom, mat);
    scene.add(line);
    activeTracers.push({ line, created: performance.now() });
}

export function spawnSoulOrb(pos: THREE.Vector3): void {
    const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xc084fc })
    );
    orb.position.copy(pos).add(new THREE.Vector3(0, 1.3, 0));
    scene.add(orb);
    soulOrbs.push({ mesh: orb, expires: performance.now() + 6000 });
}

export function showHitmarker(isHeadshot: boolean): void {
    gameState.hitmarkerIsHead = isHeadshot;
    gameState.hitmarkerVisible = true;
    setTimeout(() => {
        gameState.hitmarkerVisible = false;
    }, 120);
}

export function addKillfeedItem(isHeadshot: boolean, weapon: string): void {
    const id = Date.now() + Math.random();
    gameState.killfeed.push({ id, isHeadshot, weapon });
    setTimeout(() => {
        const idx = gameState.killfeed.findIndex(item => item.id === id);
        if (idx !== -1) gameState.killfeed.splice(idx, 1);
    }, 4000);

    gameState.killBannerVisible = true;
    setTimeout(() => {
        gameState.killBannerVisible = false;
    }, 1800);
}

let lastKillAt = -Infinity;
let streakBannerTimer: ReturnType<typeof setTimeout> | undefined;

function showStreakBanner(streak: number): void {
    const label = STREAK_NAMES[streak];
    if (!label) return;
    gameState.streakLabel = label;
    gameState.streakBannerKey++; // re-key so the CSS pop animation restarts on each kill
    clearTimeout(streakBannerTimer);
    streakBannerTimer = setTimeout(() => { gameState.streakLabel = ''; }, 1800);
}

/** Kill rewards/feedback shared by practice bots and the networked opponent. */
export function registerKill(isHead: boolean, weapon: string, pos: THREE.Vector3): void {
    const now = performance.now();
    gameState.killStreak = nextStreak(gameState.killStreak, lastKillAt, now);
    lastKillAt = now;
    gameState.credits += 200;

    sound.playKill(gameState.killStreak, isHead);
    showStreakBanner(gameState.killStreak);
    addKillfeedItem(isHead, weapon);
    spawnSoulOrb(pos);
}

function aliveTargetMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    enemies.forEach(b => {
        if (b.alive) meshes.push(b.headMesh, b.torsoMesh, b.legsMesh);
    });
    return meshes;
}

function applyHit(hit: THREE.Intersection, bodyDmg: number, headDmg: number, weapon: string): void {
    const bot = hit.object.userData.bot as EnemyBot;
    const isHead = hit.object.userData.isHead === true;
    showHitmarker(isHead);
    // Networked opponent: victim owns its HP and reports death back
    if (bot.onHit) { bot.onHit(isHead ? headDmg : bodyDmg, isHead, weapon); return; }
    bot.hp -= isHead ? headDmg : bodyDmg;
    bot.hbFill.scale.x = Math.max(0.001, bot.hp / bot.maxHp);

    if (bot.hp > 0 || !bot.alive) return;

    bot.alive = false;
    bot.mesh.visible = false;
    registerKill(isHead, weapon, bot.mesh.position);
    gameState.enemyAvatarDim = true;

    setTimeout(() => {
        bot.hp = bot.maxHp;
        bot.hbFill.scale.x = 1;
        bot.alive = true;
        bot.mesh.visible = true;
        gameState.enemyAvatarDim = false;
    }, 2600);
}

// Infinite reserve, 30-round magazine: must reload (R or auto on empty).
export const MAG_SIZE = 30;
export const RELOAD_MS = 2000;

export const isReloading = (now = performance.now()) => now < gameState.reloadEndsAt;

export function startReload(): void {
    const now = performance.now();
    if (gameState.holdingKnife || gameState.holdingSpike) return;
    if (isReloading(now) || gameState.ammo >= MAG_SIZE) return;
    gameState.reloadEndsAt = now + RELOAD_MS;
    gameState.scoped = false;
    sound.playReloadSound();
}

/** Engine tick: finish reload when its timer elapses. */
export function updateReload(now: number): void {
    if (gameState.reloadEndsAt && now >= gameState.reloadEndsAt) {
        gameState.reloadEndsAt = 0;
        gameState.ammo = MAG_SIZE;
    }
}

/** First thing the ray touches; walls stop bullets. Returns the hit only if it's a player/bot. */
function castShot(): { target: THREE.Intersection | null; point: THREE.Vector3 | null } {
    const hits = raycaster.intersectObjects([...aliveTargetMeshes(), ...wallMeshes], false);
    const first = hits[0];
    if (!first) return { target: null, point: null };
    return { target: first.object.userData.bot ? first : null, point: first.point };
}

export function fireWeapon(): void {
    if (gameState.holdingSpike || gameState.holdingKnife) return;
    const now = performance.now();
    if (isDrawing(now) || isReloading(now)) return;
    if (gameState.ammo <= 0) { startReload(); return; }
    const fireInterval = gameState.empressActive ? 88 : 108;
    if (now - gameState.lastShotTime < fireInterval) return;

    gameState.lastShotTime = now;
    gameState.ammo--;
    gameState.recoilOffset = Math.min(gameState.recoilOffset + 0.055, 0.22);

    sound.playVandalShot(gameState.empressActive);
    notifyShot();
    if (muzzleFlashMesh) {
        (muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity = 0.95;
        muzzleFlashMesh.rotation.z = Math.random() * Math.PI;
    }

    // Recoil kick goes into a decaying offset (engine adds it to the camera and recovers it).
    // Writing it straight into player.pitch made sustained fire climb forever and sail over targets.
    recoil.pitch += RECOIL_KICK * (1 - 0.5 * ads.t);

    raycaster.setFromCamera(SCREEN_CENTER, camera);
    raycaster.far = Infinity;
    const { target, point } = castShot();
    // Tracer origin follows the gun: bottom-right at hip, just under screen center when scoped
    const muzzleWorld = new THREE.Vector3(0.22 * (1 - ads.t), -0.12 + 0.06 * ads.t, -0.6).applyMatrix4(camera.matrixWorld);

    createBulletTracer(muzzleWorld, point ?? raycaster.ray.at(40, new THREE.Vector3()));
    if (target) applyHit(target, 40, 160, 'VANDAL');
    if (gameState.ammo === 0) startReload();
}

export function knifeSlash(): void {
    if (!gameState.holdingKnife) return;
    const now = performance.now();
    if (isDrawing(now)) return;
    if (now - lastSlashTime < KNIFE_COOLDOWN_MS) return;
    lastSlashTime = now;

    sound.playKnifeSlash();

    raycaster.setFromCamera(SCREEN_CENTER, camera);
    raycaster.far = KNIFE_RANGE;
    const { target } = castShot();
    if (target) applyHit(target, 50, 100, 'KNIFE');
}
