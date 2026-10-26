import * as THREE from 'three';
import { scene } from './scene.js';

export interface EnemyBot {
    id: number;
    mesh: THREE.Group;
    headMesh: THREE.Mesh;
    torsoMesh: THREE.Mesh;
    legsMesh: THREE.Mesh;
    hbFill: THREE.Mesh;
    hp: number;
    maxHp: number;
    alive: boolean;
    basePos: THREE.Vector3;
    strafeDir: number;
    strafePhase: number;
    blindedUntil: number;
}

export const enemies: EnemyBot[] = [];
export const enemySpawnPoints: THREE.Vector3[] = [
    new THREE.Vector3(-2.4, 0, -6.5),
    new THREE.Vector3(-5.8, 0, -9.2),
    new THREE.Vector3(1.6, 0, -7.8)
];

export function createEnemyBot(spawnPos: THREE.Vector3, index: number): void {
    const group = new THREE.Group();

    const matSuit = new THREE.MeshStandardMaterial({
        color: 0x283044,
        emissive: 0x7f1d1d,
        emissiveIntensity: 0.35,
        roughness: 0.5
    });
    const matHood = new THREE.MeshStandardMaterial({
        color: 0x3b4259,
        emissive: 0x991b1b,
        emissiveIntensity: 0.45
    });
    const matEye = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });

    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.85, 0.28), matSuit);
    legs.position.y = 0.425;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.72, 0.32), matSuit);
    torso.position.y = 1.2;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.34), matHood);
    head.position.y = 1.75;
    head.userData.isHead = true;

    const eyeBar = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.06), matEye);
    eyeBar.position.set(0, 1.75, 0.175);

    const hbBg = new THREE.Mesh(
        new THREE.PlaneGeometry(0.65, 0.08),
        new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })
    );
    hbBg.position.y = 2.12;
    const hbFill = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 0.055),
        new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
    );
    hbFill.position.set(0, 2.12, 0.005);

    group.add(legs, torso, head, eyeBar, hbBg, hbFill);
    group.position.copy(spawnPos);
    scene.add(group);

    const bot: EnemyBot = {
        id: index,
        mesh: group,
        headMesh: head,
        torsoMesh: torso,
        legsMesh: legs,
        hbFill: hbFill,
        hp: 150,
        maxHp: 150,
        alive: true,
        basePos: spawnPos.clone(),
        strafeDir: index % 2 === 0 ? 1 : -1,
        strafePhase: index * 1.7,
        blindedUntil: 0
    };

    [head, torso, legs].forEach(part => {
        part.userData.bot = bot;
    });

    enemies.push(bot);
}

export function initEnemies(): void {
    enemies.length = 0;
    enemySpawnPoints.forEach((pt, idx) => createEnemyBot(pt, idx));
}
