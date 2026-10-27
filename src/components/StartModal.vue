<template>
  <div
    v-if="gameState.isModalOpen"
    id="start-overlay"
    class="fixed inset-0 z-50 bg-[#0f1923]/80 backdrop-blur-md flex items-center justify-center p-4"
  >
    <div class="max-w-lg w-full bg-[#18232f] border border-white/15 rounded-lg shadow-2xl overflow-hidden">
      <!-- Header Strip -->
      <div class="bg-gradient-to-r from-[#ff4655] to-[#b91c1c] px-6 py-4 flex items-center justify-between">
        <div>
          <div class="text-xs font-bold tracking-[0.2em] text-white/80 uppercase">TACTICAL 5V5 SHOOTER</div>
          <h1 class="text-3xl font-extrabold text-white tracking-wider">VALORANT // A MAIN</h1>
        </div>
        <div class="w-10 h-10 rounded bg-black/25 flex items-center justify-center border border-white/20">
          <span class="text-white font-bold text-lg">V</span>
        </div>
      </div>

      <!-- Controls & Features -->
      <div class="p-6 space-y-4 text-slate-200">
        <p class="text-sm text-slate-300 leading-relaxed">
          Bản sao 3D tái hiện khu vực hành lang <strong class="text-amber-300">A Main</strong>, khẩu súng <strong class="text-red-400">Vandal Huyết Long / Champions</strong> cùng giao diện HUD của đặc vụ <strong class="text-purple-400">Reyna</strong> (Vue 3 + Three.js).
        </p>

        <div class="grid grid-cols-2 gap-2.5 text-xs bg-[#0f1720] p-4 rounded border border-white/10">
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 bg-slate-800 border border-slate-600 rounded font-bold text-white">W A S D</span>
            <span>Di chuyển chiến thuật</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 bg-slate-800 border border-slate-600 rounded font-bold text-white">CHUỘT TRÁI</span>
            <span>Bắn Vandal / Đặt Spike</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 bg-slate-800 border border-slate-600 rounded font-bold text-white">LĂN CHUỘT / R</span>
            <span>Rút dao / Nạp đạn (30 viên)</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 bg-slate-800 border border-slate-600 rounded font-bold text-white">SPACE / SHIFT</span>
            <span>Nhảy / Đi bộ (không tiếng chân)</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 bg-purple-900/60 border border-purple-400/50 rounded font-bold text-purple-200">C / Q / E</span>
            <span>Kỹ năng Mù / Hồi máu / Tàng hình</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 bg-teal-900/60 border border-teal-400/50 rounded font-bold text-teal-200">X / Phím 4</span>
            <span>Chiêu cuối Empress / Cầm Spike</span>
          </div>
        </div>

        <!-- Mouse Sensitivity Setting -->
        <div class="bg-[#0f1720] p-4 rounded border border-white/10">
          <label for="sens-range" class="flex items-center justify-between text-xs font-bold tracking-wider uppercase text-slate-300 mb-2">
            <span>Độ nhạy chuột</span>
            <input
              type="number"
              :min="SENS_MIN"
              :max="SENS_MAX"
              step="0.05"
              :value="gameState.mouseSensitivity"
              @change="setSens(($event.target as HTMLInputElement).valueAsNumber)"
              aria-label="Giá trị độ nhạy chuột"
              class="w-20 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-right"
            />
          </label>
          <input
            id="sens-range"
            type="range"
            :min="SENS_MIN"
            :max="SENS_MAX"
            step="0.05"
            :value="gameState.mouseSensitivity"
            @input="setSens(($event.target as HTMLInputElement).valueAsNumber)"
            class="w-full accent-[#ff4655] cursor-pointer"
          />
        </div>

        <!-- 1v1 Room (WebRTC P2P) -->
        <div class="bg-[#0f1720] p-4 rounded border border-white/10 space-y-3">
          <div class="text-xs font-bold tracking-wider uppercase text-slate-300">Đấu 1v1 với bạn (chỉ bắn, không skill, ai đạt 7 mạng trước thắng)</div>

          <div v-if="lobby.status === 'idle'" class="flex items-center gap-2">
            <button @click="hostRoom" class="px-3 py-2 rounded bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs uppercase cursor-pointer">Tạo phòng</button>
            <input
              v-model="joinCode"
              inputmode="numeric"
              maxlength="6"
              placeholder="Mã 6 số"
              aria-label="Mã phòng"
              @keydown.enter="joinRoom(joinCode)"
              class="w-24 px-2 py-2 bg-slate-800 border border-slate-600 rounded text-white text-center tracking-widest"
            />
            <button @click="joinRoom(joinCode)" class="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs uppercase cursor-pointer">Nhập phòng</button>
          </div>

          <div v-else class="space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span>Mã phòng: <strong class="text-amber-300 text-lg tracking-[0.3em]">{{ lobby.code }}</strong></span>
              <button @click="leaveRoom" class="text-xs text-slate-400 hover:text-white underline cursor-pointer">Rời phòng</button>
            </div>
            <div class="text-slate-300" role="status">{{ statusText }}</div>
            <div
              v-if="lobby.result"
              :class="lobby.result === 'win' ? 'text-green-400' : 'text-red-400'"
              class="text-center text-2xl font-extrabold tracking-widest"
            >
              {{ lobby.result === 'win' ? 'CHIẾN THẮNG' : 'THẤT BẠI' }} {{ gameState.allyScore }} - {{ gameState.enemyScore }}
            </div>

            <template v-if="lobby.status === 'connected'">
              <button
                v-if="lobby.isHost"
                @click="onStartMatch"
                :disabled="!lobby.peerReady"
                class="w-full py-2.5 rounded bg-[#ff4655] hover:bg-[#ff5e6b] disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-extrabold text-sm uppercase cursor-pointer"
              >Vào trận</button>
              <button
                v-else
                @click="setReady(!lobby.myReady)"
                :class="lobby.myReady ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-700 hover:bg-slate-600'"
                class="w-full py-2.5 rounded text-white font-extrabold text-sm uppercase cursor-pointer"
              >{{ lobby.myReady ? 'Đã sẵn sàng (bấm để huỷ)' : 'Sẵn sàng' }}</button>
            </template>
          </div>

          <div v-if="lobby.error" class="text-xs text-red-400" role="alert">{{ lobby.error }}</div>
        </div>

        <div class="flex items-center justify-between pt-2">
          <button
            v-if="!isPvp()"
            @click="onReset"
            class="px-4 py-2.5 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs tracking-wider uppercase transition cursor-pointer"
          >
            Đặt lại Vòng Đấu (54 HP)
          </button>
          <button
            v-if="lobby.status === 'idle' || isPvp()"
            @click="onPlay"
            class="ml-auto px-7 py-2.5 rounded bg-[#ff4655] hover:bg-[#ff5e6b] text-white font-extrabold text-sm tracking-widest uppercase shadow-lg shadow-red-600/30 transition transform hover:scale-105 cursor-pointer"
          >
            {{ isPvp() ? 'VÀO TRẬN 1V1' : 'LUYỆN TẬP (CLICK)' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { gameState, clampSensitivity, SENS_MIN, SENS_MAX } from '../game/state.js';
import { requestGameLock, resetGameSession } from '../game/input.js';
import { lobby, hostRoom, joinRoom, leaveRoom, setReady, startMatch, isPvp } from '../game/net.js';

const joinCode = ref('');

const statusText = computed(() => {
  switch (lobby.status) {
    case 'opening': return 'Đang kết nối...';
    case 'waiting': return 'Gửi mã cho bạn và chờ họ vào phòng...';
    case 'connected':
      if (lobby.isHost) return lobby.peerReady ? 'Đối thủ đã sẵn sàng!' : 'Đối thủ đã vào, chờ họ bấm Sẵn sàng...';
      return lobby.myReady ? 'Chờ chủ phòng bấm Vào trận...' : 'Đã vào phòng. Bấm Sẵn sàng.';
    case 'playing': return 'Đang trong trận 1v1';
    default: return '';
  }
});

function onStartMatch() {
  startMatch();
  requestGameLock();
}

function setSens(v: number) {
  gameState.mouseSensitivity = clampSensitivity(v);
}

function onPlay() {
  requestGameLock();
}

function onReset() {
  resetGameSession();
}
</script>
