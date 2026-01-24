<script setup lang="ts">
import {useVideoClip} from "./videoClip.ts";
import {ref} from "vue";
import {VideoTrackInfo} from "../../../types/cutTask.ts";

const { clip } = defineProps<{
  clip: VideoTrackInfo,
}>();

const emit = defineEmits(['renderSingleTrack']);

const clipCanvasRef = ref<HTMLCanvasElement>();
const {
  renderVideoTrack,
  clipWidth,
  trackGap,
  trackSplit,
} = useVideoClip(clip, clipCanvasRef, emit);

defineExpose({
  renderVideoTrack,
});
</script>

<template>
  <div class="video-clip" :style="{
      width: `${clipWidth}px`,
      padding: `0 ${trackGap}px`,
      marginRight: `${trackSplit}px`,
    }">
    <canvas ref="clipCanvasRef"></canvas>
  </div>
</template>

<style scoped lang="stylus">
.video-clip
  background-color rgba(255, 125, 0, .2)
  border 2px solid rgba(255, 125, 0, .3)
</style>