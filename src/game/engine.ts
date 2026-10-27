import * as THREE from 'three';
import { gameState } from './state.js';
import { sound } from './audio.js';
import { initScene, renderer, scene, camera, player, viewmodelScene, viewmodelCamera, HIP_FOV, ADS_FOV, VM_HIP_FOV, VM_ADS_FOV } from './scene.js';
import { buildAMainEnvironment, floatingOrb, isBlocked } from './map.js';
import { buildFirstPersonVandal, vandalGroup, spikeViewGroup, muzzleFlashMesh, auraFlames, gunBuddyMesh, knifeViewGroup, knifeBlade, KNIFE_REST_POS, KNIFE_REST_ROT, equipState, DRAW_MS, isDrawing, ads, ADS_POS, HIP_POS, HIP_ROT } from './weapon.js';
import { initEnemies, enemies } from './enemies.js';
import { activeTracers, soulOrbs, fireWeapon, knifeSlash, lastSlashTime, recoil, RECOIL_RECOVERY, updateReload, RELOAD_MS } from './combat.js';

const SLASH_ANIM_MS = 260;
const ADS_SPEED = 16; // higher = snappier scope-in (~150ms to 90%)

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// Movement collision now uses every solid map box (walls + cover) from map.ts

function disposeObject(obj: THREE.Mesh | THREE.Line): void {
    scene.remove(obj);
    obj.geometry.dispose();
    (obj.material as THREE.Material).dispose();
}

function updateCamera(dt: number): void {
    recoil.pitch *= Math.exp(-dt * RECOIL_RECOVERY);
    camera.position.copy(player.pos);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = Math.min(Math.PI / 2.2, player.pitch + recoil.pitch);
    camera.updateMatrixWorld();
}
import { toggleSpikeEquip } from './abilities.js';
import { setupInput, keys, isMouseDown } from './input.js';
import { drawMinimap } from './minimap.js';
import { updateNet, notifyStep, isPvp, isFrozen } from './net.js';

const STEP_STRIDE = 2.0; // world units between running footsteps
let stepDist = 0;

let prevTime = performance.now();
let animFrameId: number | null = null;

export function startGameEngine(canvasEl: HTMLCanvasElement): () => void {
    initScene(canvasEl);
    buildAMainEnvironment();
    buildFirstPersonVandal();
    initEnemies();
    setupInput();

    setInterval(() => {
        if (gameState.isLocked) {
            if (gameState.roundSeconds > 0) {
                gameState.roundSeconds--;
            } else {
                gameState.roundSeconds = 46;
            }
        }
    }, 1000);

    function animate(now: number): void {
        animFrameId = requestAnimationFrame(animate);
        const dt = Math.min((now - prevTime) / 1000, 0.1);
        prevTime = now;

        // 1. Player movement (frozen during the 1v1 round-start countdown: look only)
        if (gameState.isLocked && !isFrozen(now)) {
            const moveSpeed = gameState.dismissActive ? 9.5 : (keys['ShiftLeft'] ? 3.4 : 6.2);
            const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
            const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));

            const wishDir = new THREE.Vector3();
            if (keys['KeyW']) wishDir.add(forward);
            if (keys['KeyS']) wishDir.sub(forward);
            if (keys['KeyD']) wishDir.add(right);
            if (keys['KeyA']) wishDir.sub(right);
            if (wishDir.lengthSq() > 0) wishDir.normalize();

            const nextPos = player.pos.clone();
            nextPos.x += wishDir.x * moveSpeed * dt;
            nextPos.z += wishDir.z * moveSpeed * dt;

            // Practice map has no solid outer boundary on every side; the arena is fully walled
            if (!isPvp()) {
                nextPos.x = Math.max(-9.4, Math.min(3.15, nextPos.x));
                nextPos.z = Math.max(-12.2, Math.min(12.8, nextPos.z));
            }

            // Resolve each axis separately so the player slides along walls
            // instead of stopping dead when moving diagonally into them.
            if (!isBlocked(nextPos.x, player.pos.z)) player.pos.x = nextPos.x;
            if (!isBlocked(player.pos.x, nextPos.z)) player.pos.z = nextPos.z;

            // Gravity & Jump
            player.vel.y -= 16.5 * dt;
            player.pos.y += player.vel.y * dt;
            if (player.pos.y <= 1.72) {
                player.pos.y = 1.72;
                player.vel.y = 0;
                player.onGround = true;
            }

            // Camera must be posed BEFORE firing: fireWeapon raycasts from camera.matrixWorld,
            // which otherwise still holds last frame's aim (shots lagged behind the crosshair).
            updateCamera(dt);

            // Fire (rifle) / slash (knife) while holding Left Click
            if (isMouseDown && gameState.holdingKnife) {
                knifeSlash();
            } else if (isMouseDown && !gameState.holdingSpike) {
                fireWeapon();
            }

            // Spike Planting
            if (isMouseDown && gameState.holdingSpike && !gameState.spikePlanted) {
                gameState.plantingProgress += dt * 45;
                if (gameState.plantingProgress >= 100) {
                    gameState.spikePlanted = true;
                    sound.playAbilitySound('ult');
                    toggleSpikeEquip();
                }
            }

            // Bobbing + footsteps. Shift = walk (silent), otherwise run (audible to both players)
            const moving = wishDir.lengthSq() > 0 && player.onGround;
            if (moving) {
                gameState.gunBobTime += dt * (keys['ShiftLeft'] ? 6 : 11);
                if (!keys['ShiftLeft']) {
                    stepDist += moveSpeed * dt;
                    if (stepDist >= STEP_STRIDE) {
                        stepDist = 0;
                        sound.playFootstep(0.6);
                        notifyStep();
                    }
                }
            } else {
                gameState.gunBobTime += dt * 1.6;
            }
        }

        updateReload(now);

        // 2. Camera (when the movement block above didn't run it)
        if (!gameState.isLocked || isFrozen(now)) updateCamera(dt);

        // 3. Viewmodel Animation
        gameState.recoilOffset = THREE.MathUtils.lerp(gameState.recoilOffset, 0, dt * 14);

        // ADS blend (frame-rate independent ease toward target)
        const adsTarget = gameState.scoped && !gameState.holdingKnife && !gameState.holdingSpike ? 1 : 0;
        ads.t += (adsTarget - ads.t) * (1 - Math.exp(-dt * ADS_SPEED));
        if (Math.abs(adsTarget - ads.t) < 0.001) ads.t = adsTarget;
        const hip = 1 - ads.t;

        camera.fov = THREE.MathUtils.lerp(HIP_FOV, ADS_FOV, ads.t);
        viewmodelCamera.fov = THREE.MathUtils.lerp(VM_HIP_FOV, VM_ADS_FOV, ads.t);
        camera.updateProjectionMatrix();
        viewmodelCamera.updateProjectionMatrix();

        // Bob is mostly suppressed while scoped so the dot stays steady
        const bobScale = 0.15 + 0.85 * hip;
        const bobX = Math.cos(gameState.gunBobTime) * 0.008 * bobScale;
        const bobY = Math.abs(Math.sin(gameState.gunBobTime)) * 0.008 * bobScale;

        // Draw: weapon rises from below screen with ease-out-back overshoot
        const drawT = Math.min(1, (now - equipState.time) / DRAW_MS);
        const drawLeft = 1 - easeOutBack(drawT); // 1 -> 0 (slightly negative = overshoot)
        // Reload: gun dips and tilts down, then comes back up (sin hump over the reload window)
        const reloadLeft = gameState.reloadEndsAt - now;
        const reloadDip = reloadLeft > 0 ? Math.sin((1 - reloadLeft / RELOAD_MS) * Math.PI) : 0;
        const drawDrop = drawLeft * 0.35 + reloadDip * 0.12;
        const drawTilt = drawLeft * 0.9 + reloadDip * 0.6;

        // Recoil kicks the gun back; in ADS keep the muzzle-rise small so the reticle stays near center
        const recoilRot = gameState.recoilOffset * (1.4 * hip + 0.25 * ads.t);
        vandalGroup.position.set(
            THREE.MathUtils.lerp(HIP_POS.x, ADS_POS.x, ads.t) + bobX,
            THREE.MathUtils.lerp(HIP_POS.y, ADS_POS.y, ads.t) - bobY - drawDrop,
            THREE.MathUtils.lerp(HIP_POS.z, ADS_POS.z, ads.t) + gameState.recoilOffset * (0.4 + 0.6 * hip)
        );
        vandalGroup.rotation.set(
            HIP_ROT.x * hip + recoilRot + drawTilt,
            HIP_ROT.y * hip,
            HIP_ROT.z * hip - drawTilt * 0.4
        );

        spikeViewGroup.position.set(0.24 + bobX, -0.24 - bobY - drawDrop, -0.5);
        spikeViewGroup.rotation.x = drawTilt;

        if (knifeViewGroup.visible) {
            // Slash arc: swing right-to-left with forward thrust
            const t = Math.min(1, (now - lastSlashTime) / SLASH_ANIM_MS);
            const swing = t < 1 && !isDrawing(now) ? Math.sin(t * Math.PI) : 0;
            knifeViewGroup.position.set(
                KNIFE_REST_POS.x + bobX - swing * 0.22,
                KNIFE_REST_POS.y - bobY + swing * 0.06 - drawDrop,
                KNIFE_REST_POS.z - swing * 0.12
            );
            knifeViewGroup.rotation.set(
                KNIFE_REST_ROT.x - swing * 0.4 + drawTilt,
                KNIFE_REST_ROT.y + swing * 1.1,
                KNIFE_REST_ROT.z - swing * 0.6
            );
            // Signature draw flip: blade spins one full turn in the hand
            knifeBlade.rotation.z = (1 - easeOutCubic(drawT)) * Math.PI * 2;
        }

        if (muzzleFlashMesh && (muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity > 0) {
            const mat = muzzleFlashMesh.material as THREE.MeshBasicMaterial;
            mat.opacity = Math.max(0, mat.opacity - dt * 18);
        }

        // Aura fins rise up to the sight line; fade them out while scoped so they don't cover the dot
        auraFlames.forEach((flame, idx) => {
            const wave = Math.sin(now * 0.012 + idx * 0.7);
            flame.scale.y = 0.85 + wave * 0.35;
            (flame.material as THREE.MeshBasicMaterial).opacity = (0.48 + wave * 0.22) * hip;
            flame.visible = hip > 0.02;
        });

        if (gunBuddyMesh) {
            gunBuddyMesh.rotation.z = Math.sin(now * 0.006 + player.yaw * 4) * 0.18;
            gunBuddyMesh.rotation.x = gameState.recoilOffset * 2.5;
        }

        if (floatingOrb) {
            floatingOrb.rotation.y += dt * 1.8;
            floatingOrb.position.y = 0.85 + Math.sin(now * 0.004) * 0.08;
        }

        // 4. Update Bots (practice only; the networked opponent is driven by updateNet)
        updateNet(dt, now);
        enemies.forEach(bot => {
            if (!bot.alive || bot.onHit) return;
            const isBlinded = now < bot.blindedUntil;
            const speed = isBlinded ? 0.4 : 1.65;
            bot.strafePhase += dt * speed;
            bot.mesh.position.x = bot.basePos.x + Math.sin(bot.strafePhase) * 1.35;
            bot.mesh.lookAt(player.pos.x, bot.mesh.position.y, player.pos.z);
        });

        // 5. Tracers & Soul Orbs
        for (let i = activeTracers.length - 1; i >= 0; i--) {
            const age = now - activeTracers[i].created;
            if (age > 90) {
                disposeObject(activeTracers[i].line);
                activeTracers.splice(i, 1);
            } else {
                (activeTracers[i].line.material as THREE.LineBasicMaterial).opacity = 1 - age / 90;
            }
        }

        for (let i = soulOrbs.length - 1; i >= 0; i--) {
            soulOrbs[i].mesh.rotation.y += dt * 3;
            if (now > soulOrbs[i].expires) {
                disposeObject(soulOrbs[i].mesh);
                soulOrbs.splice(i, 1);
            }
        }

        // 6. Draw Minimap & WebGL
        drawMinimap();

        renderer.clear();
        renderer.render(scene, camera);
        renderer.clearDepth();
        renderer.render(viewmodelScene, viewmodelCamera);
    }

    animate(performance.now());

    return () => {
        if (animFrameId) cancelAnimationFrame(animFrameId);
    };
}
