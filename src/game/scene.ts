import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface Player {
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    yaw: number;
    pitch: number;
    onGround: boolean;
}

export let renderer: THREE.WebGLRenderer;
export let scene: THREE.Scene;
export let camera: THREE.PerspectiveCamera;
export let player: Player;
export let viewmodelScene: THREE.Scene;
export let viewmodelCamera: THREE.PerspectiveCamera;

export const HIP_FOV = 72;
export const ADS_FOV = 50;
export const VM_HIP_FOV = 60;
export const VM_ADS_FOV = 45;

export function initScene(canvas: HTMLCanvasElement) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.autoClear = false;
    // Filmic tone mapping: highlights roll off instead of clipping, emissive glows read better
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // Image-based lighting so metal (gold trim, chrome, knife blade) has something to reflect.
    // Without an env map, metalness ~1 surfaces render nearly black.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // World Scene & Camera
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x5d829c);
    scene.fog = new THREE.FogExp2(0x6c8fa8, 0.014);
    scene.environment = envMap;

    camera = new THREE.PerspectiveCamera(HIP_FOV, window.innerWidth / window.innerHeight, 0.1, 200);
    player = {
        pos: new THREE.Vector3(2.2, 1.72, 8.8),
        vel: new THREE.Vector3(),
        yaw: 0.24,
        pitch: -0.02,
        onGround: true
    };

    // Viewmodel Scene & Camera
    viewmodelScene = new THREE.Scene();
    viewmodelScene.environment = envMap;
    viewmodelCamera = new THREE.PerspectiveCamera(VM_HIP_FOV, window.innerWidth / window.innerHeight, 0.01, 20);

    // World Lighting
    // Env map now supplies most fill light; keep ambient low to preserve contrast
    const ambientLight = new THREE.AmbientLight(0xd8ecff, 0.35);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff4d6, 1.4);
    dirLight.position.set(-12, 24, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    // Default shadow frustum is only ±5 units; cover the whole corridor (~46 x 52)
    const sc = dirLight.shadow.camera;
    sc.left = -26; sc.right = 26; sc.top = 28; sc.bottom = -28;
    sc.near = 1; sc.far = 70;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.normalBias = 0.02;
    scene.add(dirLight);

    const skylightGlow = new THREE.PointLight(0x63b3ed, 1.2, 28);
    skylightGlow.position.set(-6, 9.5, -10);
    scene.add(skylightGlow);

    // Viewmodel Lighting
    const vmAmbient = new THREE.AmbientLight(0xffffff, 0.4);
    viewmodelScene.add(vmAmbient);
    const vmPoint = new THREE.PointLight(0xff4d4d, 1.4, 5);
    vmPoint.position.set(0.4, 0.5, -0.5);
    viewmodelScene.add(vmPoint);
    const vmKeyLight = new THREE.DirectionalLight(0xfffbeb, 1.1);
    vmKeyLight.position.set(1, 2, 1);
    viewmodelScene.add(vmKeyLight);

    window.addEventListener('resize', onWindowResize);

    return { renderer, scene, camera, player, viewmodelScene, viewmodelCamera };
}

export function onWindowResize(): void {
    if (!renderer || !camera || !viewmodelCamera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    viewmodelCamera.aspect = w / h;
    viewmodelCamera.updateProjectionMatrix();
    renderer.setSize(w, h);
}
