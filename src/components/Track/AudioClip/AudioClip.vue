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


defineExpose({
  selectAudioTrack,
});
</script>

<template>
  <div
      class="audio-clip"
      :style="{
        width: `${audio.width}px`,
      }"
  >
    <div
        :class="{
          'select-border': true,
          'select': audio.select,
        }"
        @contextmenu="audioContextMenu"
    >
      <img src="../../../assets/icons/audio-select.svg" alt="NO ING" class="icon">
    </div>
    <div
      class="waveform"
      ref="waveContainerEl"
      @click="selectAudioTrack"
    >
      <div class="audio-name">{{ audio.originName }}</div>
    </div>
  </div>
</template>

<style scoped lang="stylus" src="./audioClip.styl">
</style>