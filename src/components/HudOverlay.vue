<template>
  <div id="hud">
    <!-- Vignette -->
    <div
      id="vignette"
      class="screen-vignette"
      :class="{
        'empress-active': gameState.empressActive,
        'dismiss-active': gameState.dismissActive
      }"
    ></div>

    <!-- Minimap -->
    <Minimap />

    <!-- 1v1 round-start countdown -->
    <div
      v-if="lobby.countdown > 0"
      role="status"
      class="absolute top-[30%] left-1/2 -translate-x-1/2 text-center text-white pointer-events-none"
    >
      <div class="text-sm font-bold tracking-[0.3em] uppercase text-white/80">Chuẩn bị · {{ gameState.allyScore }} - {{ gameState.enemyScore }}</div>
      <div class="text-7xl font-extrabold hud-number drop-shadow-[0_0_12px_rgba(255,70,85,0.8)]">{{ lobby.countdown }}</div>
    </div>

    <!-- IME warning: Vietnamese Telex swallows W/A/S/D -->
    <div
      v-if="gameState.imeDetected"
      role="alert"
      class="absolute top-[200px] left-1/2 -translate-x-1/2 px-4 py-2 rounded bg-amber-500/90 text-black text-xs font-bold tracking-wide shadow-lg"
    >
      Phát hiện bộ gõ tiếng Việt (Unikey/EVKey) — tắt đi (Ctrl+Shift hoặc chuyển sang E) để WASD không bị khựng
    </div>

    <!-- MID-LEFT: Party Status -->
    <div class="absolute top-[432px] left-2.5 flex items-center space-x-2">
      <div class="relative w-6 h-6 rounded-sm overflow-hidden border border-purple-400/60 bg-[#2a1f3d] shadow">
        <svg viewBox="0 0 40 40" class="w-full h-full">
          <defs>
            <linearGradient id="reynaBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#3b1d5e"/>
              <stop offset="100%" stop-color="#1a1026"/>
            </linearGradient>
          </defs>
          <rect width="40" height="40" fill="url(#reynaBg)"/>
          <path d="M8 38 C6 22 10 8 20 7 C30 8 34 22 32 38 Z" fill="#8b2fc9"/>
          <path d="M12 10 C15 6 25 6 28 10 L30 28 L10 28 Z" fill="#581c87"/>
          <path d="M14 14 Q20 12 26 14 L25 27 Q20 32 15 27 Z" fill="#c68b6b"/>
          <polygon points="15,19 18,18 19,20 16,20.5" fill="#f0abfc"/>
          <polygon points="25,19 22,18 21,20 24,20.5" fill="#f0abfc"/>
          <path d="M18 25 Q20 24 22 25 Q20 26.5 18 25" fill="#4a154b"/>
        </svg>
        <div class="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
      </div>
      <div class="leading-tight">
        <div class="text-[11px] font-bold text-[#e7c97b] tracking-wide drop-shadow">Me</div>
        <div class="text-[10px] font-medium text-[#b5c4d3] tracking-tight drop-shadow">In A Main - Party</div>
      </div>
    </div>

    <!-- TOP-CENTER: Match Scoreboard -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 flex items-start pt-2">
      <!-- Left Teal Team -->
      <div class="relative flex items-center">
        <div class="w-[155px] h-[27px] team-bar-left flex items-center pl-2.5">
          <div class="w-3.5 h-3.5 border border-[#72f6d6] rotate-45 flex items-center justify-center bg-[#72f6d6]/20">
            <div class="w-1.5 h-1.5 bg-[#72f6d6]"></div>
          </div>
        </div>

        <div class="relative -ml-2 flex flex-col items-center">
          <div class="w-[34px] h-[4px] bg-[#e9e268] mb-[1px] shadow-sm"></div>
          <div class="w-[30px] h-[30px] bg-[#2a203b] border border-white/60 overflow-hidden shadow-md">
            <svg viewBox="0 0 40 40" class="w-full h-full">
              <rect width="40" height="40" fill="#2c1b47"/>
              <path d="M6 40 C5 20 10 6 20 5 C30 6 35 20 34 40 Z" fill="#9333ea"/>
              <path d="M13 13 Q20 11 27 13 L25 28 Q20 33 15 28 Z" fill="#d09474"/>
              <polygon points="15,19 18.5,18.5 19,20 15.5,20.5" fill="#f5d0fe"/>
              <polygon points="25,19 21.5,18.5 21,20 24.5,20.5" fill="#f5d0fe"/>
              <path d="M17.5 25 Q20 24 22.5 25 Q20 27 17.5 25" fill="#581c87"/>
            </svg>
          </div>
          <div class="mt-0.5 w-6 h-5 flex items-center justify-center relative">
            <svg viewBox="0 0 28 24" class="w-full h-full drop-shadow">
              <polygon points="2,2 26,2 14,22" fill="rgba(35,45,45,0.85)" stroke="#fef08a" stroke-width="2"/>
              <circle cx="14" cy="9" r="3.5" fill="none" stroke="#ffffff" stroke-width="1.4"/>
              <circle cx="14" cy="9" r="1.3" fill="#fef08a"/>
            </svg>
          </div>
        </div>

        <div class="ml-1 w-[46px] h-[27px] score-box-left flex items-center justify-center text-white font-bold text-[17px] tracking-wider">
          {{ gameState.allyScore }}
        </div>
      </div>

      <!-- Round Timer Box -->
      <div class="relative mx-2 flex flex-col items-center">
        <div class="w-[68px] h-[30px] timer-box flex items-center justify-center">
          <span class="text-white font-bold text-[20px] tracking-wider hud-number">{{ formattedTimer }}</span>
        </div>
        <svg viewBox="0 0 110 34" class="w-[96px] h-[28px] -mt-1 overflow-visible">
          <path d="M 6 0 L 38 24 L 48 18 L 55 28 L 62 18 L 72 24 L 104 0" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="1.2"/>
          <path d="M 55 28 L 55 34" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="1.2"/>
        </svg>
      </div>

      <!-- Right Red Team -->
      <div class="relative flex items-center">
        <div class="mr-1 w-[46px] h-[27px] score-box-right flex items-center justify-center text-white font-bold text-[17px] tracking-wider">
          {{ gameState.enemyScore }}
        </div>

        <div
          class="relative z-10 w-[30px] h-[30px] bg-[#1e2536] border border-white/50 overflow-hidden shadow-md transition-opacity duration-300"
          :class="{ 'opacity-40': gameState.enemyAvatarDim, 'opacity-100': !gameState.enemyAvatarDim }"
        >
          <svg viewBox="0 0 40 40" class="w-full h-full">
            <rect width="40" height="40" fill="#1b2234"/>
            <path d="M6 38 C7 14 13 6 20 6 C27 6 33 14 34 38 Z" fill="#3b4254"/>
            <path d="M12 13 C15 9 25 9 28 13 L27 32 L13 32 Z" fill="#111520"/>
            <rect x="16" y="18" width="8" height="1.4" fill="#67e8f9"/>
            <rect x="15" y="21" width="10" height="1.4" fill="#67e8f9"/>
            <rect x="17" y="24" width="6" height="1.4" fill="#67e8f9"/>
          </svg>
        </div>

        <div class="w-[155px] h-[27px] -ml-2 team-bar-right flex items-center justify-end pr-2.5">
          <div class="w-3.5 h-3.5 border border-[#f87171] rotate-45 flex items-center justify-center bg-[#f87171]/25">
            <div class="w-1.5 h-1.5 bg-[#f87171]"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- TOP-RIGHT: Killfeed -->
    <div class="absolute top-2 right-5 flex flex-col items-end">
      <div class="text-[10px] font-semibold tracking-[0.14em] text-white/65 uppercase">
        SPECTATORS 4
      </div>
      <div class="mt-3 flex flex-col items-end space-y-1.5">
        <div
          v-for="item in gameState.killfeed"
          :key="item.id"
          class="flex items-center space-x-2 px-2.5 py-1 rounded bg-[#111923]/80 border-r-2 border-[#54d6b2] text-xs font-bold shadow"
        >
          <span class="text-[#72f6d6]">Me</span>
          <span class="text-red-400 font-extrabold tracking-tighter">
            [{{ item.weapon }} {{ item.isHeadshot ? '⊕' : '' }}]
          </span>
          <span class="text-[#f87171]">Omen</span>
        </div>
      </div>
    </div>

    <!-- MID-RIGHT: Spike HUD -->
    <div class="absolute right-3 top-[55.5%] flex items-center space-x-2">
      <div class="spike-banner w-[112px] h-[36px] flex items-center justify-end pr-2.5 space-x-3">
        <div class="flex flex-col items-end">
          <span class="text-[11px] font-bold tracking-[0.12em] text-white/95 drop-shadow">SPIKE</span>
          <div class="w-3 h-[2px] bg-white/70 mt-0.5"></div>
        </div>
        <div class="w-6 h-6 flex items-center justify-center">
          <svg viewBox="0 0 32 32" class="w-6 h-6 drop-shadow-[0_0_6px_rgba(255,250,190,0.9)]">
            <polygon points="4,6 28,6 16,28" fill="none" stroke="#ffffff" stroke-width="2.2"/>
            <circle cx="16" cy="14" r="4" fill="none" stroke="#ffffff" stroke-width="1.6"/>
            <circle cx="16" cy="14" r="1.5" fill="#ffffff"/>
          </svg>
        </div>
      </div>
      <span class="text-[10px] font-bold text-white/80">4</span>
    </div>

    <!-- CENTER: Crosshair & Hitmarker -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <div
        id="crosshair"
        class="relative w-8 h-8 flex items-center justify-center transition-opacity duration-100"
        :class="gameState.scoped ? 'opacity-0' : 'opacity-100'"
      >
        <div class="absolute w-[1.8px] h-[5px] bg-white shadow-[0_0_2px_rgba(0,0,0,0.9)] -translate-y-[5px]"></div>
        <div class="absolute w-[1.8px] h-[5px] bg-white shadow-[0_0_2px_rgba(0,0,0,0.9)] translate-y-[5px]"></div>
        <div class="absolute h-[1.8px] w-[5px] bg-white shadow-[0_0_2px_rgba(0,0,0,0.9)] -translate-x-[5px]"></div>
        <div class="absolute h-[1.8px] w-[5px] bg-white shadow-[0_0_2px_rgba(0,0,0,0.9)] translate-x-[5px]"></div>
      </div>

      <svg
        viewBox="0 0 32 32"
        class="w-7 h-7 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-75"
        :class="{ 'opacity-100': gameState.hitmarkerVisible, 'opacity-0': !gameState.hitmarkerVisible }"
      >
        <line x1="6" y1="6" x2="12" y2="12" :stroke="gameState.hitmarkerIsHead ? '#ef4444' : '#ffffff'" stroke-width="2"/>
        <line x1="26" y1="6" x2="20" y2="12" :stroke="gameState.hitmarkerIsHead ? '#ef4444' : '#ffffff'" stroke-width="2"/>
        <line x1="6" y1="26" x2="12" y2="20" :stroke="gameState.hitmarkerIsHead ? '#ef4444' : '#ffffff'" stroke-width="2"/>
        <line x1="26" y1="26" x2="20" y2="20" :stroke="gameState.hitmarkerIsHead ? '#ef4444' : '#ffffff'" stroke-width="2"/>
      </svg>
    </div>

    <!-- Spike Plant Progress Bar -->
    <div
      v-if="gameState.holdingSpike && gameState.plantingProgress > 0"
      class="absolute top-[62%] left-1/2 -translate-x-1/2 flex flex-col items-center"
    >
      <div class="text-xs font-bold tracking-widest uppercase text-amber-300 mb-1 drop-shadow">ĐANG ĐẶT SPIKE...</div>
      <div class="w-48 h-2 bg-black/60 border border-white/40 rounded-full overflow-hidden">
        <div class="h-full bg-amber-400" :style="{ width: Math.min(100, gameState.plantingProgress) + '%' }"></div>
      </div>
    </div>

    <!-- Kill Banner -->
    <div v-if="gameState.killBannerVisible" class="absolute bottom-[105px] left-1/2 -translate-x-1/2 pointer-events-none">
      <div class="kill-banner-anim flex flex-col items-center">
        <div class="w-16 h-16 rounded-full bg-gradient-to-b from-red-500/80 to-purple-900/80 border-2 border-amber-300 flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.85)]">
          <svg viewBox="0 0 32 32" class="w-10 h-10">
            <polygon points="16,2 20,11 30,12 22,19 25,29 16,23 7,29 10,19 2,12 12,11" fill="#fef08a"/>
            <circle cx="16" cy="16" r="4" fill="#ef4444"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Multi-kill streak label (DOUBLE KILL ... ACE) -->
    <div
      v-if="gameState.streakLabel"
      :key="gameState.streakBannerKey"
      class="kill-banner-anim absolute bottom-[185px] left-1/2 pointer-events-none text-3xl font-extrabold tracking-[0.2em] text-amber-300 drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]"
    >
      {{ gameState.streakLabel }}
    </div>

    <!-- BOTTOM-CENTER HUD: HP, Shield, Abilities, Ammo -->
    <div class="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-end space-x-5">
      <!-- Shield & HP -->
      <div class="flex items-center space-x-2.5 pb-1 relative">
        <div class="relative w-[34px] h-[34px] flex items-center justify-center">
          <svg viewBox="0 0 40 40" class="w-full h-full -rotate-90">
            <circle cx="20" cy="20" r="16" fill="rgba(20,35,45,0.5)" stroke="rgba(255,255,255,0.25)" stroke-width="2.5"/>
            <circle cx="20" cy="20" r="16" fill="none" stroke="#42e8d4" stroke-width="3" stroke-dasharray="100" :stroke-dashoffset="shieldOffset"/>
            <circle cx="20" cy="20" r="12" fill="none" stroke="#42e8d4" stroke-width="1.2" opacity="0.8"/>
          </svg>
          <span class="absolute text-[13px] font-bold text-white hud-number">{{ Math.max(0, Math.round(gameState.shield)) }}</span>
        </div>

        <div class="flex flex-col">
          <span
            class="text-[44px] font-bold leading-none hud-number tracking-tight"
            :class="{ 'text-red-400': gameState.hp <= 30, 'text-white': gameState.hp > 30 }"
          >
            {{ Math.max(0, Math.round(gameState.hp)) }}
          </span>
        </div>

        <svg viewBox="0 0 120 24" class="absolute -bottom-1.5 -left-1 w-[124px] h-[22px] pointer-events-none overflow-visible">
          <path d="M 4 18 L 88 18 L 106 2 L 122 2" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.6"/>
          <path d="M 8 21 L 86 21" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
        </svg>
      </div>

      <!-- Abilities -->
      <div class="flex items-end space-x-4 px-3 pb-0.5">
        <!-- Q / Leer -->
        <div class="flex flex-col items-center">
          <div class="w-7 h-7 flex items-center justify-center mb-1 opacity-85">
            <svg viewBox="0 0 32 32" class="w-6 h-6">
              <circle cx="16" cy="16" r="10" fill="rgba(255,255,255,0.35)"/>
              <ellipse cx="16" cy="16" rx="3.2" ry="7.5" fill="#5b6b7a"/>
            </svg>
          </div>
          <div class="flex space-x-1.5 mb-1">
            <div class="w-1.5 h-1.5 rotate-45 bg-white"></div>
          </div>
          <div class="ability-bar-plate"></div>
          <span class="ability-key mt-0.5">Q</span>
        </div>

        <div class="w-2.5 h-[1px] bg-white/40 mb-7"></div>

        <!-- A / Devour -->
        <div class="flex flex-col items-center">
          <div class="w-7 h-7 flex items-center justify-center mb-1 opacity-85">
            <svg viewBox="0 0 32 32" class="w-6 h-6">
              <circle cx="16" cy="16" r="9.5" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="1.8" stroke-dasharray="14 4"/>
              <path d="M16 11 V21 M11 16 H21" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="flex space-x-1.5 mb-1">
            <div class="w-1.5 h-1.5 rotate-45 bg-white"></div>
            <div class="w-1.5 h-1.5 rotate-45 bg-white/35"></div>
          </div>
          <div class="ability-bar-plate"></div>
          <span class="ability-key mt-0.5">A</span>
        </div>

        <div class="w-2.5 h-[1px] bg-white/40 mb-7"></div>

        <!-- E / Dismiss -->
        <div class="flex flex-col items-center">
          <div class="w-7 h-7 flex items-center justify-center mb-1 opacity-85">
            <svg viewBox="0 0 32 32" class="w-6 h-6">
              <circle cx="16" cy="16" r="9.5" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="1.8" stroke-dasharray="12 5"/>
              <circle cx="16" cy="16" r="4" fill="rgba(255,255,255,0.6)"/>
            </svg>
          </div>
          <div class="flex space-x-1.5 mb-1">
            <div class="w-1.5 h-1.5 rotate-45 bg-white"></div>
            <div class="w-1.5 h-1.5 rotate-45 bg-white/35"></div>
          </div>
          <div class="ability-bar-plate"></div>
          <span class="ability-key mt-0.5">E</span>
        </div>

        <div class="w-2.5 h-[1px] bg-white/40 mb-7"></div>

        <!-- X / Empress -->
        <div class="flex flex-col items-center">
          <div class="relative w-8 h-8 flex items-center justify-center mb-0.5">
            <div class="absolute inset-0 rotate-45 border border-teal-300/70 ult-diamond-glow"></div>
            <svg viewBox="0 0 32 32" class="w-6 h-6 relative z-10 drop-shadow-[0_0_5px_rgba(255,255,255,0.9)]">
              <polygon points="16,2 18.5,10 25,5 21,12 29,13 22,17 28,23 20,21 21,29 16,23 11,29 12,21 4,23 10,17 3,13 11,12 7,5 13.5,10" fill="#ffffff"/>
              <circle cx="16" cy="16" r="3.2" fill="#0f766e"/>
              <circle cx="16" cy="16" r="1.5" fill="#ffffff"/>
            </svg>
          </div>
          <div class="flex space-x-1 mb-1">
            <div class="w-1 h-1 rotate-45 bg-white"></div>
            <div class="w-1 h-1 rotate-45 bg-white"></div>
            <div class="w-1 h-1 rotate-45 bg-white"></div>
            <div class="w-1 h-1 rotate-45 bg-white"></div>
            <div class="w-1 h-1 rotate-45 bg-white"></div>
            <div class="w-1 h-1 rotate-45 bg-white"></div>
          </div>
          <div class="ult-bar-plate"></div>
          <span class="ability-key mt-0.5 text-teal-200">X</span>
        </div>
      </div>

      <!-- Ammo -->
      <div class="flex items-baseline space-x-2 pb-1 relative pl-3">
        <svg viewBox="0 0 40 24" class="absolute -bottom-1.5 -left-3 w-[44px] h-[22px] pointer-events-none overflow-visible">
          <path d="M 0 2 L 14 2 L 32 18" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.6"/>
        </svg>

        <span v-if="gameState.holdingKnife" class="text-[22px] font-bold leading-none text-white hud-number tracking-widest">KNIFE</span>
        <span v-else-if="gameState.reloadEndsAt" class="text-[22px] font-bold leading-none text-amber-300 hud-number tracking-widest">RELOAD</span>
        <template v-else>
          <span :class="gameState.ammo <= 5 ? 'text-red-400' : 'text-white'" class="text-[38px] font-bold leading-none hud-number">{{ gameState.ammo }}</span>
          <span class="text-[16px] font-bold leading-none text-white/60 hud-number">/ ∞</span>
        </template>

        <div v-if="!gameState.holdingKnife" class="flex space-x-[2px] self-center translate-y-0.5">
          <div class="w-[2.5px] h-3 bg-white/90 rounded-t-sm"></div>
          <div class="w-[2.5px] h-3 bg-white/90 rounded-t-sm"></div>
          <div class="w-[2.5px] h-3 bg-white/90 rounded-t-sm"></div>
        </div>
      </div>
    </div>

    <!-- BOTTOM-RIGHT: Credits -->
    <div class="absolute bottom-1.5 right-3 flex flex-col items-end">
      <div class="w-7 h-5 mb-1 rounded-t-full bg-gradient-to-b from-red-500/50 to-red-700/20 border border-red-400/50 flex items-center justify-center">
        <div class="w-2.5 h-2.5 rounded-full bg-red-400/70"></div>
      </div>
      <div class="flex items-center space-x-1 text-white/95 font-bold text-[14px] tracking-wide drop-shadow">
        <span class="text-[12px] text-white/80">¤</span>
        <span>{{ gameState.credits }}</span>
      </div>
      <div class="text-[9px] text-white/35 tracking-tight -mt-0.5">
        Client Version: 13.08.00.5678910
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { gameState } from '../game/state.js';
import { lobby } from '../game/net.js';
import Minimap from './Minimap.vue';

const shieldOffset = computed(() => {
  const pct = Math.max(0, Math.min(1, gameState.shield / 50));
  return 100 - (pct * 100);
});

const formattedTimer = computed(() => {
  const mins = Math.floor(gameState.roundSeconds / 60);
  const secs = gameState.roundSeconds % 60;
  return `${mins}:${secs < 10 ? '0' + secs : secs}`;
});
</script>
