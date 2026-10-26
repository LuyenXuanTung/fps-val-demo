import { player } from './scene.js';
import { enemies } from './enemies.js';

let mmCanvas: HTMLCanvasElement | null = null;
let mmCtx: CanvasRenderingContext2D | null = null;

export function initMinimap(canvasEl: HTMLCanvasElement): void {
    mmCanvas = canvasEl;
    mmCtx = mmCanvas.getContext('2d');
}

export function drawMinimap(): void {
    if (!mmCtx) return;

    mmCtx.clearRect(0, 0, 178, 178);
    mmCtx.save();
    mmCtx.translate(89, 89);
    mmCtx.rotate(-0.62);

    mmCtx.fillStyle = '#9ca3af';
    mmCtx.strokeStyle = '#374151';
    mmCtx.lineWidth = 2;

    const corridors: [number, number, number, number][] = [
        [-22, -62, 44, 118],
        [-68, -42, 48, 30],
        [-56, -78, 38, 36],
        [18, -48, 42, 65],
        [-45, 10, 28, 42]
    ];

    corridors.forEach(([x, y, w, h]) => {
        if (!mmCtx) return;
        mmCtx.fillRect(x, y, w, h);
        mmCtx.strokeRect(x, y, w, h);
    });

    // Spike Zone A
    mmCtx.fillStyle = 'rgba(234, 179, 8, 0.28)';
    mmCtx.fillRect(18, 2, 36, 36);

    // Barrier
    mmCtx.strokeStyle = '#e0f2fe';
    mmCtx.lineWidth = 2.5;
    mmCtx.beginPath();
    mmCtx.moveTo(-20, 25);
    mmCtx.lineTo(20, 25);
    mmCtx.stroke();

    // Callout Letters
    mmCtx.save();
    mmCtx.rotate(0.62);
    mmCtx.fillStyle = '#fef08a';
    mmCtx.font = 'bold 12px Rajdhani';
    mmCtx.fillText('A', 40, -2);
    mmCtx.fillStyle = '#e5e7eb';
    mmCtx.fillText('B', -52, -46);
    mmCtx.restore();

    // Player position
    const px = (player.pos.x - 1.5) * 3.2;
    const pz = (player.pos.z - 2.0) * 3.8;

    // Vision Cone
    mmCtx.save();
    mmCtx.translate(px, pz);
    mmCtx.rotate(-player.yaw + 0.62);
    const coneGrad = mmCtx.createRadialGradient(0, 0, 2, 0, 0, 48);
    coneGrad.addColorStop(0, 'rgba(186, 230, 253, 0.55)');
    coneGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
    mmCtx.fillStyle = coneGrad;
    mmCtx.beginPath();
    mmCtx.moveTo(0, 0);
    mmCtx.arc(0, 0, 48, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45);
    mmCtx.closePath();
    mmCtx.fill();

    // Player Icon
    mmCtx.fillStyle = '#bef264';
    mmCtx.beginPath();
    mmCtx.arc(0, 0, 5.2, 0, Math.PI * 2);
    mmCtx.fill();
    mmCtx.strokeStyle = '#ffffff';
    mmCtx.lineWidth = 1.5;
    mmCtx.stroke();
    mmCtx.restore();

    // Enemies
    enemies.forEach(bot => {
        if (!bot.alive || !mmCtx) return;
        const ex = (bot.mesh.position.x - 1.5) * 3.2;
        const ez = (bot.mesh.position.z - 2.0) * 3.8;
        mmCtx.fillStyle = '#ef4444';
        mmCtx.beginPath();
        mmCtx.arc(ex, ez, 4.2, 0, Math.PI * 2);
        mmCtx.fill();
        mmCtx.strokeStyle = '#ffffff';
        mmCtx.lineWidth = 1;
        mmCtx.stroke();
    });

    mmCtx.restore();
}
