import * as THREE from 'three';
import { scene } from './scene.js';

export const wallColliders: THREE.Box3[] = [];
/** Solid meshes that stop bullets (same set as wallColliders). */
export const wallMeshes: THREE.Mesh[] = [];
export let floatingOrb: THREE.Group | null = null;

const PLAYER_RADIUS = 0.3;

/** 2D (XZ) footprint test against every solid box; height ignored. */
export function isBlocked(x: number, z: number): boolean {
    // ponytail: no standing on top of cover; add ground-height lookup if jump-on-crate is wanted
    return wallColliders.some(b =>
        x > b.min.x - PLAYER_RADIUS && x < b.max.x + PLAYER_RADIUS &&
        z > b.min.z - PLAYER_RADIUS && z < b.max.z + PLAYER_RADIUS);
}

export function addWallBox(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    castShadow: boolean = true,
    collidable: boolean = true
): THREE.Mesh {
    const geom = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (collidable) {
        wallColliders.push(new THREE.Box3().setFromObject(mesh));
        wallMeshes.push(mesh);
    }
    return mesh;
}

export function createFloorTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 1024;
    const ctx = c.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, '#55798e');
    grad.addColorStop(0.5, '#64899e');
    grad.addColorStop(1, '#4d7084');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    ctx.strokeStyle = 'rgba(135, 175, 195, 0.25)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 1024; i += 128) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(225, 232, 195, 0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(140, 120, 560, 780);
    ctx.strokeStyle = 'rgba(195, 220, 210, 0.38)';
    ctx.lineWidth = 3;
    ctx.strokeRect(156, 136, 528, 748);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

export function createRightWallTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#6d90a6');
    grad.addColorStop(1, '#85a7bc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    ctx.strokeStyle = '#c8ba7b';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(90, 80); ctx.lineTo(90, 390); ctx.lineTo(220, 390); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(72, 210); ctx.lineTo(72, 415); ctx.lineTo(260, 415); ctx.stroke();

    ctx.fillStyle = '#dcd092';
    ctx.beginPath(); ctx.arc(90, 80, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(220, 390, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(260, 415, 6, 0, Math.PI * 2); ctx.fill();

    return new THREE.CanvasTexture(c);
}

function createFloorPad(x: number, z: number): void {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.52, 0.06, 24),
        new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5, roughness: 0.3 })
    );
    const glowRing = new THREE.Mesh(
        new THREE.RingGeometry(0.32, 0.44, 24),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc, side: THREE.DoubleSide })
    );
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.035;
    group.add(base, glowRing);
    group.position.set(x, 0.03, z);
    scene.add(group);
}

export function buildAMainEnvironment(): void {
    const matFloor = new THREE.MeshStandardMaterial({ map: createFloorTexture(), roughness: 0.65, metalness: 0.1 });
    const matRightWall = new THREE.MeshStandardMaterial({ map: createRightWallTexture(), roughness: 0.7 });
    const matBlueWall = new THREE.MeshStandardMaterial({ color: 0x799eb5, roughness: 0.65 });
    const matBrightBlueWall = new THREE.MeshStandardMaterial({ color: 0x89b0c9, roughness: 0.6 });
    const matOchreWall = new THREE.MeshStandardMaterial({ color: 0xbc9669, roughness: 0.7 });
    const matGoldTrim = new THREE.MeshStandardMaterial({ color: 0xbaa35d, roughness: 0.4, metalness: 0.3 });
    const matDarkPanel = new THREE.MeshStandardMaterial({ color: 0x385770, roughness: 0.5, metalness: 0.2 });
    const matMetalDoor = new THREE.MeshStandardMaterial({ color: 0x6f7378, roughness: 0.45, metalness: 0.45 });

    // 1. Main Floor
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(46, 52), matFloor);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // 2. Foreground Right Wall
    addWallBox(0.6, 8.5, 16.5, 4.1, 4.25, 5.75, matRightWall);
    addWallBox(0.68, 0.38, 16.5, 4.06, 0.19, 5.75, matGoldTrim, false, false);

    // Recessed Doorway
    addWallBox(0.76, 4.3, 0.22, 3.82, 2.15, 4.9, matGoldTrim, false, false);
    addWallBox(0.76, 4.3, 0.22, 3.82, 2.15, 7.3, matGoldTrim, false, false);
    addWallBox(0.76, 0.25, 2.6, 3.82, 4.2, 6.1, matGoldTrim, false, false);
    addWallBox(0.66, 4.05, 2.2, 3.88, 2.02, 6.1, matMetalDoor, false, false);
    addWallBox(0.78, 0.85, 0.12, 3.74, 2.0, 6.85, matMetalDoor, false, false);

    // White Diamond Sign
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 128; signCanvas.height = 160;
    const sctx = signCanvas.getContext('2d')!;
    sctx.fillStyle = '#e5ecee';
    sctx.fillRect(0, 0, 128, 160);
    sctx.strokeStyle = '#9aa5aa';
    sctx.lineWidth = 8;
    sctx.strokeRect(8, 8, 112, 144);
    sctx.save();
    sctx.translate(64, 72);
    sctx.rotate(Math.PI / 4);
    sctx.strokeStyle = '#b59d52';
    sctx.lineWidth = 6;
    sctx.strokeRect(-26, -26, 52, 52);
    sctx.fillStyle = '#73828c';
    sctx.fillRect(-14, -14, 28, 28);
    sctx.restore();
    const signPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.68, 0.88),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) })
    );
    signPlane.position.set(3.78, 2.28, 3.65);
    signPlane.rotation.y = -Math.PI / 2;
    scene.add(signPlane);

    // 3. Midground Blue Pillar Wall
    addWallBox(4.2, 9.5, 0.8, 2.1, 4.75, -2.5, matBrightBlueWall);
    addWallBox(0.32, 9.5, 0.86, 0.05, 4.75, -2.5, matGoldTrim, false, false);
    addWallBox(4.2, 0.35, 0.86, 2.1, 0.17, -2.5, matGoldTrim, false, false);
    for (let y = 0.6; y < 8.8; y += 0.65) {
        addWallBox(0.45, 0.12, 0.88, 1.55, y, -2.48, matBlueWall, false, false);
    }
    addWallBox(0.1, 9.0, 0.88, 1.3, 4.5, -2.48, matBlueWall, false, false);
    addWallBox(0.1, 9.0, 0.88, 1.8, 4.5, -2.48, matBlueWall, false, false);

    // 4. Electrical Box
    addWallBox(1.8, 3.9, 2.6, -1.1, 1.95, -3.1, matBlueWall);
    addWallBox(0.06, 2.8, 0.05, -0.18, 1.8, -2.4, matGoldTrim, false, false);
    addWallBox(0.06, 0.05, 1.1, -0.18, 3.2, -2.9, matGoldTrim, false, false);

    // 5. Back Corridor & Ochre Walls
    addWallBox(0.8, 11.5, 30, -10.5, 5.75, -2, matOchreWall);
    addWallBox(0.86, 0.35, 30, -10.45, 0.17, -2, matGoldTrim, false, false);
    addWallBox(0.9, 3.6, 1.8, -10.1, 1.8, -6.5, matMetalDoor, false, false);
    addWallBox(0.92, 3.8, 0.15, -10.1, 1.9, -5.55, matGoldTrim, false, false);
    addWallBox(0.92, 3.8, 0.15, -10.1, 1.9, -7.45, matGoldTrim, false, false);

    addWallBox(16, 11.5, 0.8, -2.5, 5.75, -13.5, matOchreWall);
    addWallBox(2.8, 9.2, 1.1, -5.2, 4.6, -13.1, matDarkPanel);
    addWallBox(3.0, 0.22, 1.25, -5.2, 5.6, -13.0, matGoldTrim, false, false);
    addWallBox(0.8, 10, 14, 4.1, 5.0, -9.5, matBlueWall);
    addWallBox(16, 9, 0.8, -3, 4.5, 14.0, matOchreWall);

    // Skylight
    addWallBox(14, 0.6, 18, -3.5, 11.2, -5, matDarkPanel, false, false);
    const skylightMat = new THREE.MeshBasicMaterial({ color: 0x8ec5fc });
    const skylight = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 9), skylightMat);
    skylight.rotation.x = Math.PI / 2;
    skylight.position.set(-4.5, 10.88, -8);
    scene.add(skylight);

    // 6. Floor Props
    createFloorPad(-1.6, 2.2);
    createFloorPad(-4.2, -6.8);

    // 7. Cover (skirmish-style): crates for full cover, low walls to peek over
    const matCrate = new THREE.MeshStandardMaterial({ color: 0x8a6d4b, roughness: 0.8 });
    const matCover = new THREE.MeshStandardMaterial({ color: 0x9fb3c2, roughness: 0.7 });
    addWallBox(1.4, 1.4, 1.4, -1.0, 0.7, 10.0, matCrate);   // host spawn cover
    addWallBox(3.2, 1.15, 0.5, 0.6, 0.575, 4.6, matCover);  // low wall: head peeks over
    addWallBox(1.5, 1.5, 1.5, -6.8, 0.75, 6.5, matCrate);
    addWallBox(1.0, 1.0, 1.0, -6.8, 2.0, 6.5, matCrate);    // stacked on top
    addWallBox(1.5, 2.2, 1.5, -4.2, 1.1, 1.0, matCover);    // mid pillar
    addWallBox(0.5, 2.6, 3.0, -7.8, 1.3, -4.5, matCover);   // left lane wall
    addWallBox(2.4, 1.15, 0.5, -4.6, 0.575, -3.2, matCover);// low wall by electrical box (gaps both sides)
    addWallBox(1.5, 1.5, 1.5, 1.6, 0.75, -11.0, matCrate);  // guest spawn cover

    // Dropped Weapon Pad
    const triGeom = new THREE.CircleGeometry(0.65, 3);
    const triMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    const triPad = new THREE.Mesh(triGeom, triMat);
    triPad.rotation.x = -Math.PI / 2;
    triPad.rotation.z = 0.4;
    triPad.position.set(-0.35, 0.03, 2.35);
    scene.add(triPad);

    const droppedGun = new THREE.Group();
    const dgBody = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 0.16), new THREE.MeshStandardMaterial({ color: 0x2b2d38 }));
    const dgGold = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.09, 0.12), new THREE.MeshStandardMaterial({ color: 0xd4af37 }));
    droppedGun.add(dgBody, dgGold);
    droppedGun.position.set(-0.3, 0.07, 2.3);
    droppedGun.rotation.y = 0.55;
    scene.add(droppedGun);

    // Floating Ultimate Orb
    const orbGroup = new THREE.Group();
    const innerOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 20, 20),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2, metalness: 0.8 })
    );
    const outerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.36, 0.04, 12, 32),
        new THREE.MeshBasicMaterial({ color: 0xe2e8f0 })
    );
    orbGroup.add(innerOrb, outerRing);
    orbGroup.position.set(-5.1, 0.85, -10.8);
    scene.add(orbGroup);
    floatingOrb = orbGroup;

    buildSkirmishArena();
}

// 1v1 skirmish arena, built far from the practice map so both coexist (fog hides one from the other).
// Layout: rectangular room, spawn alcove at each end, a shield wall in front of each alcove so
// players can't see each other on spawn and must walk out to fight.
export const ARENA_X = 200;
export const arenaColliders: THREE.Box3[] = [];
export const ARENA_SPAWNS = {
    host: { pos: new THREE.Vector3(ARENA_X, 1.72, 17), yaw: 0 },        // south alcove, facing north (-Z)
    guest: { pos: new THREE.Vector3(ARENA_X, 1.72, -17), yaw: Math.PI } // north alcove, facing south
};

function buildSkirmishArena(): void {
    const matFloor = new THREE.MeshStandardMaterial({ map: createFloorTexture(), roughness: 0.65 });
    const matWall = new THREE.MeshStandardMaterial({ color: 0x799eb5, roughness: 0.65 });
    const matShield = new THREE.MeshStandardMaterial({ color: 0xbc9669, roughness: 0.7 });
    const matCrate = new THREE.MeshStandardMaterial({ color: 0x8a6d4b, roughness: 0.8 });
    const matCover = new THREE.MeshStandardMaterial({ color: 0x9fb3c2, roughness: 0.7 });

    // Arena-relative box (x, z offsets; y is center height)
    const box = (w: number, h: number, d: number, x: number, z: number, mat: THREE.Material, y = h / 2) => {
        const before = wallColliders.length;
        addWallBox(w, h, d, ARENA_X + x, y, z, mat);
        arenaColliders.push(...wallColliders.slice(before));
    };

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 40), matFloor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(ARENA_X, 0, 0);
    floor.receiveShadow = true;
    scene.add(floor);

    const H = 5;
    // Outer walls of the 20 x 28 main room
    box(0.6, H, 28.6, -10.3, 0, matWall);
    box(0.6, H, 28.6, 10.3, 0, matWall);
    for (const s of [1, -1]) {
        // End walls with a 5-wide opening into the spawn alcove
        box(8.1, H, 0.6, -6.55, 14.3 * s, matWall);
        box(8.1, H, 0.6, 6.55, 14.3 * s, matWall);
        // Alcove (5 wide, 5 deep)
        box(0.6, H, 5.6, -2.8, 16.8 * s, matWall);
        box(0.6, H, 5.6, 2.8, 16.8 * s, matWall);
        box(6.2, H, 0.6, 0, 19.3 * s, matWall);
        // Spawn shield: blocks the straight line between alcoves (tall enough to hide a jump)
        box(6, 3.5, 0.6, 0, 11.5 * s, matShield);
    }

    // Scattered cover (mirrored-ish so neither side is favored)
    box(1.4, 1.4, 1.4, -5, 6, matCrate);
    box(3, 1.15, 0.6, 5, 7, matCover);
    box(1.5, 2.5, 1.5, 0, 0, matCover);
    box(0.6, 1.15, 3, -6, -2, matCover);
    box(1.5, 1.5, 1.5, 6, -3, matCrate);
    box(3, 1.15, 0.6, -4, -7, matCover);
    box(1.4, 1.4, 1.4, 5, -7, matCrate);
    box(1.4, 2, 2, -9.3, 3, matCover);
    box(1.4, 2, 2, 9.3, -4, matCover);
}
