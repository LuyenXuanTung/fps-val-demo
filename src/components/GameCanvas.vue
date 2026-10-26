<template>
  <canvas ref="canvasRef" id="game-canvas"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { startGameEngine } from '../game/engine.js';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let cleanup: (() => void) | null = null;

onMounted(() => {
  if (canvasRef.value) {
    cleanup = startGameEngine(canvasRef.value);
  }
});

onBeforeUnmount(() => {
  if (cleanup) cleanup();
});
</script>
