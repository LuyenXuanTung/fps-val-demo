import * as THREE from 'three';
import { viewmodelScene } from './scene.js';

export const weaponPivot = new THREE.Group();
export const vandalGroup = new THREE.Group();
export const spikeViewGroup = new THREE.Group();
export const knifeViewGroup = new THREE.Group();
export const knifeBlade = new THREE.Group();
export const KNIFE_REST_POS = new THREE.Vector3(0.26, -0.24, -0.46);
export const KNIFE_REST_ROT = new THREE.Euler(0.15, 0.45, -0.3);

// Weapon draw animation: time of last equip switch (ms, performance.now clock)
export const DRAW_MS = 380;
export const equipState = { time: -1e9 };
export function isDrawing(now: number): boolean {
    return now - equipState.time < DRAW_MS;
}

// Aim-down-sights blend: 0 = hip, 1 = fully scoped. Written by engine, read by combat/input.
export const ads = { t: 0 };
// Red-dot reticle height above the gun origin. In ADS the gun is placed at y = -RETICLE_Y with
// zero rotation, so the reticle lands exactly on the viewmodel camera's optical axis (screen center).
export const RETICLE_Y = 0.17;
const SIGHT_Z = 0.0;
export const ADS_POS = new THREE.Vector3(0, -RETICLE_Y, -0.32);
export const HIP_POS = new THREE.Vector3(0.34, -0.25, -0.58);
export const HIP_ROT = new THREE.Euler(0.06, 0.22, -0.04);

function buildRedDot(matBody: THREE.Material, matTrim: THREE.Material): void {
    const sight = new THREE.Group();
    sight.position.set(0, 0, SIGHT_Z);

    // Mount sitting on the top rail
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.07), matBody);
    mount.position.y = 0.117;
    // Window frame around the lens
    const post = new THREE.BoxGeometry(0.006, 0.054, 0.05);
    const bar = new THREE.BoxGeometry(0.062, 0.006, 0.05);
    const left = new THREE.Mesh(post, matBody); left.position.set(-0.028, RETICLE_Y, 0);
    const right = new THREE.Mesh(post, matBody); right.position.set(0.028, RETICLE_Y, 0);
    const top = new THREE.Mesh(bar, matTrim); top.position.y = RETICLE_Y + 0.027;
    const bottom = new THREE.Mesh(bar, matBody); bottom.position.y = RETICLE_Y - 0.027;

    // Faint blue-tinted glass
    const lens = new THREE.Mesh(
        new THREE.PlaneGeometry(0.05, 0.048),
        new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.12, depthWrite: false })
    );
    lens.position.y = RETICLE_Y;

    // Reticle: hot core + soft glow. toneMapped:false keeps it pure saturated red under ACES.
    const dot = new THREE.Mesh(
        new THREE.CircleGeometry(0.0009, 16),
        new THREE.MeshBasicMaterial({ color: 0xff1a1a, toneMapped: false, depthTest: false })
    );
    dot.position.set(0, RETICLE_Y, 0.001);
    dot.renderOrder = 10;
    const glow = new THREE.Mesh(
        new THREE.CircleGeometry(0.002, 16),
        new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.35, toneMapped: false, depthTest: false })
    );
    glow.position.set(0, RETICLE_Y, 0.0008);
    glow.renderOrder = 9;

    sight.add(mount, left, right, top, bottom, lens, glow, dot);
    vandalGroup.add(sight);
}
export let gunBuddyMesh: THREE.Group | null = null;
export let muzzleFlashMesh: THREE.Mesh | null = null;
export const auraFlames: THREE.Mesh[] = [];

export function buildFirstPersonVandal(): void {
    const matDarkBody = new THREE.MeshStandardMaterial({ color: 0x221d24, roughness: 0.45, metalness: 0.5 });
    const matGold = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.85 });
    const matChrome = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.9 });
    const matRedCore = new THREE.MeshBasicMaterial({ color: 0xff1e27 });
    const matRedGlow = new THREE.MeshBasicMaterial({
        color: 0xff2a2a,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide
    });
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xc88d6c, roughness: 0.65 });
    const matWristband = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.8 });

    // 1. Main Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.16, 0.95), matDarkBody);
    receiver.position.set(0, 0, -0.15);
    vandalGroup.add(receiver);

    // 2. Glowing Crimson Energy Core
    const redCore = new THREE.Mesh(new THREE.BoxGeometry(0.116, 0.09, 0.68), matRedCore);
    redCore.position.set(0, 0.01, -0.12);
    vandalGroup.add(redCore);

    for (let i = 0; i < 4; i++) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.11, 0.025), matDarkBody);
        rib.position.set(0, 0.01, 0.1 - i * 0.15);
        rib.rotation.x = 0.45;
        vandalGroup.add(rib);
    }

    // 3. Metallic Gold Rails
    const topGoldRail = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.032, 0.88), matGold);
    topGoldRail.position.set(0, 0.088, -0.15);
    vandalGroup.add(topGoldRail);

    const sideGoldArch = new THREE.Mesh(new THREE.BoxGeometry(0.124, 0.024, 0.72), matGold);
    sideGoldArch.position.set(0, 0.065, -0.16);
    vandalGroup.add(sideGoldArch);

    const lowerGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.022, 0.45), matGold);
    lowerGoldTrim.position.set(0, -0.068, 0.02);
    vandalGroup.add(lowerGoldTrim);

    // 4. Chrome Wing Accent
    const chromeWing = new THREE.Mesh(new THREE.BoxGeometry(0.132, 0.045, 0.22), matChrome);
    chromeWing.position.set(0, 0.055, 0.12);
    chromeWing.rotation.x = -0.12;
    vandalGroup.add(chromeWing);

    // 5. Raised Golden Sights
    const rearSightL = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.075, 0.06), matGold);
    rearSightL.position.set(-0.035, 0.125, 0.09);
    rearSightL.rotation.x = -0.25;
    const rearSightR = rearSightL.clone();
    rearSightR.position.x = 0.035;
    const rearSightCenter = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.04), matRedCore);
    rearSightCenter.position.set(0, 0.11, 0.09);
    vandalGroup.add(rearSightL, rearSightR, rearSightCenter);

    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.055, 0.08), matGold);
    frontSight.position.set(0, 0.11, -0.52);
    vandalGroup.add(frontSight);

    buildRedDot(matDarkBody, matGold);

    // 6. Glowing Red Rear Ring Emblem
    const emblemMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.018, 0.032, 6),
        new THREE.MeshBasicMaterial({ color: 0xff5533, side: THREE.DoubleSide })
    );
    emblemMesh.position.set(-0.064, -0.02, 0.22);
    emblemMesh.rotation.y = -Math.PI / 2;
    vandalGroup.add(emblemMesh);

    // 7. Fiery Aura Fins
    for (let i = 0; i < 12; i++) {
        const flame = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.08), matRedGlow.clone());
        flame.position.set(
            (Math.random() - 0.5) * 0.06,
            0.12 + Math.random() * 0.03,
            0.26 - i * 0.075
        );
        flame.rotation.y = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        flame.rotation.z = -0.35;
        vandalGroup.add(flame);
        auraFlames.push(flame);
    }

    // 8. Magazine
    const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.13), matDarkBody);
    magazine.position.set(0, -0.19, -0.08);
    magazine.rotation.x = 0.22;
    vandalGroup.add(magazine);

    // 9. Riot Fist Gun Buddy
    const buddyMount = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.018, 0.04), matGold);
    buddyMount.position.set(-0.07, -0.025, -0.16);
    vandalGroup.add(buddyMount);

    const bc = document.createElement('canvas');
    bc.width = 128; bc.height = 128;
    const bctx = bc.getContext('2d')!;
    bctx.fillStyle = '#231f20';
    bctx.fillRect(0, 0, 128, 128);
    bctx.strokeStyle = '#52525b';
    bctx.lineWidth = 8;
    bctx.strokeRect(8, 8, 112, 112);
    bctx.fillStyle = '#ffffff';
    bctx.fillRect(38, 42, 52, 36);
    bctx.fillRect(44, 82, 40, 16);
    bctx.fillStyle = '#231f20';
    bctx.fillRect(48, 42, 4, 18);
    bctx.fillRect(60, 42, 4, 18);
    bctx.fillRect(72, 42, 4, 18);

    gunBuddyMesh = new THREE.Group();
    gunBuddyMesh.position.set(-0.082, -0.03, -0.16);
    const redCord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.004, 0.045),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    redCord.position.y = -0.022;
    const hexCharm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.042, 0.014, 6),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc) })
    );
    hexCharm.rotation.z = Math.PI / 2;
    hexCharm.position.y = -0.062;
    gunBuddyMesh.add(redCord, hexCharm);
    vandalGroup.add(gunBuddyMesh);

    // 10. Reyna's Hand
    const handGroup = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.15, 0.14), matSkin);
    palm.position.set(-0.055, -0.055, -0.34);
    palm.rotation.z = -0.35;
    palm.rotation.x = 0.25;

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.34, 12), matSkin);
    forearm.position.set(-0.08, -0.22, -0.18);
    forearm.rotation.x = -0.65;
    forearm.rotation.z = -0.18;

    const wristband = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.058, 0.07, 12), matWristband);
    wristband.position.set(-0.07, -0.15, -0.24);
    wristband.rotation.x = -0.65;
    wristband.rotation.z = -0.18;

    handGroup.add(palm, forearm, wristband);
    vandalGroup.add(handGroup);

    // 11. Muzzle Flash
    muzzleFlashMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.11, 0.28, 6),
        new THREE.MeshBasicMaterial({ color: 0xff5533, transparent: true, opacity: 0 })
    );
    muzzleFlashMesh.rotation.x = -Math.PI / 2;
    muzzleFlashMesh.position.set(0, 0.03, -0.75);
    vandalGroup.add(muzzleFlashMesh);

    vandalGroup.position.set(0.34, -0.25, -0.58);
    vandalGroup.rotation.set(0.06, 0.22, -0.04);
    weaponPivot.add(vandalGroup);

    // Spike Viewmodel
    const spikeBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.11, 0.28, 6),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 })
    );
    const spikeCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.16, 12),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    spikeBody.add(spikeCore);
    spikeViewGroup.add(spikeBody);
    spikeViewGroup.position.set(0.24, -0.24, -0.5);
    spikeViewGroup.visible = false;
    weaponPivot.add(spikeViewGroup);

    buildKnife();
    weaponPivot.add(knifeViewGroup);

    viewmodelScene.add(weaponPivot);
}

function buildKnife(): void {
    const matBlade = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.12, metalness: 1.0 });
    const matFuller = new THREE.MeshStandardMaterial({ color: 0x3a0a0a, emissive: 0xff2020, emissiveIntensity: 1.6, roughness: 0.4 });
    const matHandle = new THREE.MeshStandardMaterial({ color: 0x1f1b24, roughness: 0.75 });
    const matGuard = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.9 });
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xc88d6c, roughness: 0.6 });
    const matSleeve = new THREE.MeshStandardMaterial({ color: 0x2a1840, roughness: 0.8 });
    const matWrap = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.85 });

    // Blade profile drawn in XY (X = length, Y = height), extruded for thickness,
    // then rotated so the blade points forward (-Z). Origin = grip point.
    const s = new THREE.Shape();
    s.moveTo(0, -0.018);
    s.lineTo(0, 0.022);
    s.lineTo(0.22, 0.024);                     // spine
    s.quadraticCurveTo(0.31, 0.022, 0.345, -0.004); // clip point to tip
    s.quadraticCurveTo(0.26, -0.03, 0, -0.018);     // curved belly edge
    const bladeGeom = new THREE.ExtrudeGeometry(s, {
        depth: 0.006, bevelEnabled: true, bevelThickness: 0.0025, bevelSize: 0.0025, bevelSegments: 2, curveSegments: 16
    });
    bladeGeom.translate(0, 0, -0.003);
    bladeGeom.rotateY(Math.PI / 2);
    const blade = new THREE.Mesh(bladeGeom, matBlade);
    blade.position.z = -0.06;

    // Glowing red fuller (blood groove) on both faces
    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.0125, 0.006, 0.17), matFuller);
    fuller.position.set(0, 0.008, -0.17);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.075, 0.018), matGuard);
    guard.position.z = -0.055;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.02, 0.12, 10), matHandle);
    handle.rotation.x = Math.PI / 2;
    handle.position.z = 0.005;
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.021, 12, 8), matGuard);
    pommel.position.z = 0.07;

    // Blade sub-group spins on its own during the draw flip while the hand stays put
    knifeBlade.add(blade, fuller, guard, handle, pommel);
    knifeViewGroup.add(knifeBlade);

    // Right hand wrapped around the handle + forearm running off-screen bottom-right
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.085), matSkin);
    palm.position.set(0.012, -0.006, 0.005);
    const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.08), matSkin);
    fingers.position.set(-0.024, -0.004, 0.002);
    const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.05), matSkin);
    thumb.position.set(-0.012, 0.028, -0.02);
    thumb.rotation.y = 0.3;

    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.05, 12), matWrap);
    wrist.rotation.x = Math.PI / 2 - 0.35;
    wrist.position.set(0.02, -0.025, 0.07);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.045, 0.32, 12), matSkin);
    forearm.rotation.x = Math.PI / 2 - 0.35;
    forearm.position.set(0.03, -0.08, 0.24);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.056, 0.14, 12), matSleeve);
    sleeve.rotation.x = Math.PI / 2 - 0.35;
    sleeve.position.set(0.036, -0.12, 0.38);

    knifeViewGroup.add(palm, fingers, thumb, wrist, forearm, sleeve);
    knifeViewGroup.position.copy(KNIFE_REST_POS);
    knifeViewGroup.rotation.copy(KNIFE_REST_ROT);
    knifeViewGroup.visible = false;
}
