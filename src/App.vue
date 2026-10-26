<template>
  <div class="relative w-full h-full overflow-hidden select-none">
    <GameCanvas />
    <HudOverlay />
    <StartModal />
  </div>
</template>

<script setup lang="ts">
import GameCanvas from './components/GameCanvas.vue';
import HudOverlay from './components/HudOverlay.vue';
import StartModal from './components/StartModal.vue';
</script>
