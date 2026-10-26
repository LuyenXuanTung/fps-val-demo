<template>
  <div class="absolute top-1.5 left-3 flex flex-col items-center">
    <div id="location-callout" class="text-[11px] font-semibold text-white/85 tracking-wide mb-0.5 drop-shadow">
      A Main
    </div>
    <div class="relative w-[178px] h-[178px] rounded-full border border-white/40 bg-[#4b5663]/45 backdrop-blur-[2px] shadow-lg overflow-hidden">
      <canvas ref="mmCanvasRef" width="178" height="178" class="w-full h-full"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { initMinimap } from '../game/minimap.js';

const mmCanvasRef = ref<HTMLCanvasElement | null>(null);

onMounted(() => {
  if (mmCanvasRef.value) {
    initMinimap(mmCanvasRef.value);
  }
});
</script>
