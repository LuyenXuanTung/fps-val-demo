import * as THREE from 'three';
import { scene, camera, player } from './scene.js';
import { gameState } from './state.js';
import { sound } from './audio.js';
import { enemies } from './enemies.js';
import { vandalGroup, spikeViewGroup, knifeViewGroup, equipState } from './weapon.js';

export function castLeerBlind(): void {
    sound.playAbilitySound('leer');

    const eyeOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 20, 20),
        new THREE.MeshBasicMaterial({ color: 0xa855f7, wireframe: false })
    );
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    eyeOrb.position.copy(player.pos).add(forward.multiplyScalar(6.5));
    eyeOrb.position.y = Math.max(2.2, eyeOrb.position.y);
    scene.add(eyeOrb);

    const blindEnd = performance.now() + 3000;
    enemies.forEach(b => { b.blindedUntil = blindEnd; });

    setTimeout(() => { scene.remove(eyeOrb); }, 2500);
}

export function castDevourHeal(): void {
    sound.playAbilitySound('heal');
    gameState.hp = Math.min(100, gameState.hp + 46);
    gameState.shield = Math.min(50, gameState.shield + 25);
}

export function castDismiss(): void {
    sound.playAbilitySound('dismiss');
    gameState.dismissActive = true;
    setTimeout(() => {
        gameState.dismissActive = false;
    }, 2200);
}

export function castEmpressUltimate(): void {
    sound.playAbilitySound('ult');
    gameState.empressActive = !gameState.empressActive;
}

export function syncViewmodel(): void {
    gameState.reloadEndsAt = 0; // swapping weapons cancels a reload in progress (like Valorant)
    vandalGroup.visible = !gameState.holdingSpike && !gameState.holdingKnife;
    spikeViewGroup.visible = gameState.holdingSpike;
    knifeViewGroup.visible = gameState.holdingKnife;
}

export function toggleSpikeEquip(): void {
    gameState.holdingSpike = !gameState.holdingSpike;
    gameState.holdingKnife = false;
    equipState.time = performance.now();
    syncViewmodel();
}

export function toggleKnife(): void {
    gameState.holdingKnife = !gameState.holdingKnife;
    gameState.holdingSpike = false;
    equipState.time = performance.now();
    if (gameState.holdingKnife) sound.playKnifeSlash();
    syncViewmodel();
}
