<script setup lang="ts">
import {useVideoClip} from "./videoClip.ts";
import {ref} from "vue";
import {VideoTrackInfo} from "../../../types/cutTask.ts";

const { clip } = defineProps<{
  clip: VideoTrackInfo,
}>();

const emit = defineEmits(['renderSingleTrack', 'selectTrack']);

const clipCanvasRef = ref<HTMLCanvasElement>();
const {
  renderVideoTrack,
  clipWidth,
  trackGap,
  trackSplit,
  selectTrack,
  selectTrackContextmenu,
} = useVideoClip(clip, clipCanvasRef, emit);

defineExpose({
  renderVideoTrack,
});
</script>

<template>
  <div
      :class="{
        'video-clip': true,
        'select-frame': clip.select,
      }"
      :style="{
        width: `${clipWidth}px`,
        padding: `0 ${trackGap}px`,
        marginRight: `${trackSplit}px`,
      }"
      @click="selectTrack"
      @contextmenu="selectTrackContextmenu"
  >
    <img class="select-icon" src="../../../assets/icons/pig.svg" alt="NO IMG">
    <canvas ref="clipCanvasRef"></canvas>
    <div class="audio-track" v-if="clip.hasAudio"></div>
  </div>
</template>

<style scoped lang="stylus">
.video-clip
  cursor move
  background-color rgba(255, 125, 0, .2)
  border 2px solid transparent
  position relative
  border-radius 4px
  canvas
    border-radius 4px
  .select-icon
    width 26px
    height 26px
    position absolute
    top -13px
    right -13px
    z-index 10
    display none
  &.select-frame
    border-color #fdbfae
    .select-icon
      display block
  .audio-track
    height 20px
    background-image url("/audio.svg")
    background-size contain
    background-repeat repeat

</style>