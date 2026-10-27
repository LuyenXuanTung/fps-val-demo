import * as THREE from 'three';
import Peer, { type DataConnection } from 'peerjs';
import { reactive } from 'vue';
import { gameState } from './state.js';
import { player } from './scene.js';
import { sound } from './audio.js';
import { enemies, createEnemyBot, type EnemyBot } from './enemies.js';
import { registerKill } from './combat.js';
import { ARENA_SPAWNS } from './map.js';
import { resetGameState } from './state.js';

// Close the data channel on tab close so the opponent is kicked out immediately
// instead of waiting for the ICE timeout.
window.addEventListener('beforeunload', () => conn?.close());

// 1v1 over WebRTC (PeerJS free cloud broker for signaling; game data flows peer-to-peer).
// Shooter-authoritative hits: shooter raycasts locally and tells the victim how much damage it took.
// ponytail: trusts the peer (no anti-cheat); fine for friends, needs a server for public matchmaking.

type Msg =
    | { t: 'ready'; v: boolean }
    | { t: 'start' }
    | { t: 'state'; x: number; y: number; z: number; yaw: number; hp: number }
    | { t: 'shot' }
    | { t: 'step' }
    | { t: 'hit'; dmg: number; head: boolean; weapon: string }
    | { t: 'died'; head: boolean; weapon: string };

export type LobbyStatus = 'idle' | 'opening' | 'waiting' | 'connected' | 'playing';

export const lobby = reactive({
    status: 'idle' as LobbyStatus,
    code: '',
    isHost: false,
    myReady: false,
    peerReady: false,
    result: '' as '' | 'win' | 'lose',
    countdown: 0,
    error: ''
});

const WIN_SCORE = 7;
const FREEZE_MS = 5000;
let freezeUntil = 0;
const FOOTSTEP_RANGE = 25;
const ID_PREFIX = 'fpsval-demo-';
const SEND_INTERVAL_MS = 50;
const HOST_SPAWN = ARENA_SPAWNS.host;
const GUEST_SPAWN = ARENA_SPAWNS.guest;

let peer: Peer | null = null;
let conn: DataConnection | null = null;
let remote: EnemyBot | null = null;
const remoteTarget = new THREE.Vector3();
let remoteYaw = 0;
let lastSendAt = 0;

export const isPvp = () => lobby.status === 'playing';

function send(msg: Msg): void {
    if (conn?.open) conn.send(msg);
}

function fail(message: string): void {
    leaveRoom();
    lobby.error = message;
}

export function hostRoom(): void {
    leaveRoom();
    lobby.error = '';
    lobby.isHost = true;
    lobby.status = 'opening';
    lobby.code = String(Math.floor(100000 + Math.random() * 900000));
    peer = new Peer(ID_PREFIX + lobby.code);
    peer.on('open', () => { lobby.status = 'waiting'; });
    peer.on('connection', c => {
        if (conn) { c.on('open', () => c.close()); return; } // room full
        bind(c);
    });
    peer.on('error', e => {
        // Code collision with another room: just roll a new one
        if (e.type === 'unavailable-id') hostRoom();
        else fail('Lỗi kết nối: ' + e.type);
    });
}

export function joinRoom(code: string): void {
    code = code.trim();
    if (!/^\d{6}$/.test(code)) { lobby.error = 'Mã phòng phải gồm 6 chữ số'; return; }
    leaveRoom();
    lobby.error = '';
    lobby.isHost = false;
    lobby.status = 'opening';
    lobby.code = code;
    peer = new Peer();
    peer.on('open', () => bind(peer!.connect(ID_PREFIX + code, { reliable: true })));
    peer.on('error', e => fail(e.type === 'peer-unavailable' ? 'Không tìm thấy phòng ' + code : 'Lỗi kết nối: ' + e.type));
}

function bind(c: DataConnection): void {
    conn = c;
    c.on('open', () => { lobby.status = 'connected'; });
    c.on('data', d => onData(d as Msg));
    c.on('close', () => { if (conn === c) fail('Đối thủ đã rời phòng'); });
    c.on('error', () => { if (conn === c) fail('Mất kết nối với đối thủ'); });
}

export function setReady(v: boolean): void {
    lobby.myReady = v;
    send({ t: 'ready', v });
}

/** Host only: requires guest ready. */
export function startMatch(): void {
    if (!lobby.isHost || !lobby.peerReady) return;
    send({ t: 'start' });
    beginMatch();
}

export function leaveRoom(): void {
    const c = conn, p = peer;
    conn = null;
    peer = null;
    c?.close();
    p?.destroy();
    endMatch();
    Object.assign(lobby, { status: 'idle', code: '', isHost: false, myReady: false, peerReady: false, error: '', result: '' });
}

/** Tear down the match but keep the room open so both can rematch. */
function endMatch(): void {
    const wasPlaying = isPvp();
    if (remote) {
        remote.mesh.removeFromParent();
        enemies.splice(enemies.indexOf(remote), 1);
        remote = null;
    }
    if (!wasPlaying) return;
    lobby.status = 'connected';
    lobby.countdown = 0;
    lobby.myReady = false;
    lobby.peerReady = false;
    enemies.forEach(b => { b.alive = true; b.mesh.visible = true; b.hp = b.maxHp; b.hbFill.scale.x = 1; });
    // Back to the practice map
    resetGameState();
    player.pos.set(2.2, 1.72, 8.8);
    player.yaw = 0.24;
    player.pitch = -0.02;
    if (document.pointerLockElement) document.exitPointerLock();
}

function checkWin(): boolean {
    if (gameState.allyScore >= WIN_SCORE) lobby.result = 'win';
    else if (gameState.enemyScore >= WIN_SCORE) lobby.result = 'lose';
    else return false;
    endMatch();
    return true;
}

/**
 * New round: both players back in their alcove, frozen for 5s (can look, can't move/shoot/take damage).
 * Each side calls this locally on the same kill event, so clocks only differ by one-way latency.
 */
function startRound(): void {
    const s = lobby.isHost ? HOST_SPAWN : GUEST_SPAWN;
    player.pos.copy(s.pos);
    player.vel.set(0, 0, 0);
    player.yaw = s.yaw;
    player.pitch = 0;
    gameState.hp = 100;
    gameState.shield = 50;
    gameState.ammo = 30;
    gameState.reloadEndsAt = 0;
    gameState.scoped = false;
    freezeUntil = performance.now() + FREEZE_MS;
    lobby.countdown = FREEZE_MS / 1000;
    if (remote) {
        // Snap (don't lerp) the opponent back to their alcove
        const o = lobby.isHost ? GUEST_SPAWN : HOST_SPAWN;
        remoteTarget.set(o.pos.x, 0, o.pos.z);
        remote.mesh.position.copy(remoteTarget);
        remoteYaw = o.yaw;
        remote.alive = true;
        remote.mesh.visible = true;
        remote.hbFill.scale.x = 1;
    }
}

export const isFrozen = (now = performance.now()) => isPvp() && now < freezeUntil;

function beginMatch(): void {
    lobby.status = 'playing';
    lobby.result = '';
    // Hide practice bots; the only target is the opponent
    enemies.forEach(b => { b.alive = false; b.mesh.visible = false; });
    const other = lobby.isHost ? GUEST_SPAWN : HOST_SPAWN;
    remote = createEnemyBot(new THREE.Vector3(other.pos.x, 0, other.pos.z), -1);
    remote.onHit = (dmg, head, weapon) => send({ t: 'hit', dmg, head, weapon });
    remoteTarget.copy(remote.mesh.position);
    remoteYaw = other.yaw;
    gameState.allyScore = 0;
    gameState.enemyScore = 0;
    gameState.killStreak = 0;
    // Pure gunplay: drop any practice buffs / spike / knife state
    gameState.holdingSpike = false;
    gameState.empressActive = false;
    gameState.dismissActive = false;
    startRound();
}

function onData(m: Msg): void {
    switch (m.t) {
        case 'ready': lobby.peerReady = m.v; break;
        case 'start': if (!lobby.isHost) beginMatch(); break;
        case 'state':
            if (!remote) break;
            remoteTarget.set(m.x, m.y - 1.72, m.z);
            remoteYaw = m.yaw;
            remote.hbFill.scale.x = Math.max(0.001, m.hp / 100);
            break;
        case 'shot': sound.playVandalShot(false); break;
        case 'step': {
            // Running footsteps fade out with distance (inaudible past ~25m)
            if (!remote) break;
            const d = remote.mesh.position.distanceTo(player.pos);
            sound.playFootstep(Math.max(0, 1 - d / FOOTSTEP_RANGE));
            break;
        }
        case 'hit': {
            if (isFrozen()) break;
            // Shield soaks damage first
            const soak = Math.min(gameState.shield, m.dmg);
            gameState.shield -= soak;
            gameState.hp -= m.dmg - soak;
            if (gameState.hp <= 0) {
                send({ t: 'died', head: m.head, weapon: m.weapon });
                gameState.enemyScore++;
                gameState.killStreak = 0;
                if (!checkWin()) startRound();
            }
            break;
        }
        case 'died':
            if (!remote) break;
            gameState.allyScore++;
            registerKill(m.head, m.weapon, remote.mesh.position);
            if (!checkWin()) startRound();
            break;
    }
}

/** Called once per frame by the engine. */
export function updateNet(dt: number, now: number): void {
    if (!isPvp() || !remote) return;
    lobby.countdown = Math.max(0, Math.ceil((freezeUntil - now) / 1000));
    // Smooth 20Hz updates into 60fps motion
    const k = 1 - Math.exp(-dt * 15);
    remote.mesh.position.lerp(remoteTarget, k);
    remote.mesh.rotation.y = remoteYaw + Math.PI; // bot model faces +Z, player forward is -Z
    if (now - lastSendAt >= SEND_INTERVAL_MS) {
        lastSendAt = now;
        send({ t: 'state', x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: player.yaw, hp: Math.max(0, gameState.hp) });
    }
}

export function notifyShot(): void {
    if (isPvp()) send({ t: 'shot' });
}

export function notifyStep(): void {
    if (isPvp()) send({ t: 'step' });
}
