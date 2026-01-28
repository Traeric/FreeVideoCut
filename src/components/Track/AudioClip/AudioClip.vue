<script setup lang="ts">
import {AudioTrackInfo} from "../../../types/cutTask.ts";
import {useAudioTrack} from "./audioClip.ts";
import {ref} from "vue";

const { audio } = defineProps<{
  audio: AudioTrackInfo
}>();

const waveContainerEl = ref<HTMLDivElement>();

const {
  selectAudioTrack,
  audioContextMenu,
} = useAudioTrack(audio, waveContainerEl);
</script>

<template>
  <div class="audio-clip" :style="{ width: `${audio.width}px` }">
    <div
        :class="{
          'select-border': true,
          'select': audio.select,
        }"
        @contextmenu="audioContextMenu"
    >
      <img src="../../../assets/icons/audio-select.svg" alt="NO ING" class="icon">
    </div>
    <div class="waveform" ref="waveContainerEl" @click="selectAudioTrack">
      <div class="audio-name">{{ audio.originName }}</div>
    </div>
  </div>
</template>

<style scoped lang="stylus">
.audio-clip
  height 100%
  display flex
  align-items center
  position relative
  user-select none
  .select-border
    border 2px solid #fff
    position absolute
    height calc(100% - 20px)
    inset 10px 0 10px 0
    border-radius 4px
    z-index 9
    display none
    cursor move
    &.select
      display block
    .icon
      width 28px
      height 28px
      position absolute
      right -14px
      top -14px
  .waveform
    background-color #0e3058
    width 100%
    height calc(100% - 20px)
    border-radius 4px
    overflow hidden
    cursor move
    position relative
    .audio-name
      position absolute
      top 2px
      left 2px
      padding 0 5px
      background-color rgba(255, 255, 255, .15)
      color rgba(255, 255, 255, .9)
      border-radius 4px
      font-size 12px
</style>