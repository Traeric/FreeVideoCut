<script setup lang="ts">
import {onMounted, onUnmounted, ref} from "vue";
import {useTrack, useWheel} from './track.ts';
import VideoClip from "./VideoClip/VideoClip.vue";
import AudioClip from "./AudioClip/AudioClip.vue";
import {useAudioPlayStore} from "../../store/audioPlayStore.ts";

const rightPanelEl = ref<HTMLDivElement>();
const frameLineRef = ref<HTMLDivElement>();
const videoClipRefs = ref([]);
const audioClipRefs = ref([]);
const {
  cutVideo,
  removeSelectFrame,
  videoPlayStore,
  moveFramePoint,
  timeUtilCount,
  getFormatTime,
  trackTotalWith,
  gotoClickTime,
  panelScrollEvent,
  renderSingleTrack,
  selectVideoTrack,
  audioMoveDown,
} = useTrack(rightPanelEl, frameLineRef, videoClipRefs, audioClipRefs);

const { rightMouseWheel } = useWheel(rightPanelEl);
const audioPlayStore = useAudioPlayStore();
onMounted(() => {
  document.addEventListener("click", removeSelectFrame);
  rightPanelEl.value!.addEventListener('scroll', panelScrollEvent);
});

onUnmounted(() => {
  document.removeEventListener("click", removeSelectFrame);
  rightPanelEl.value?.removeEventListener('scroll', panelScrollEvent);
});
</script>

<template>
  <div class="track">
    <div class="actions">
      <div class="controls">
        <div class="track-controls btn" @click="cutVideo">
          <a-tooltip content="分割">
            <img src="../../assets/cut.svg" alt="NO IMG">
          </a-tooltip>
        </div>
        <div class="split-line"></div>
        <a-button type="primary" size="small" status="warning">
          <template #icon>
            <icon-upload />
          </template>
          <template #default>鼠标控制横向滚动条</template>
        </a-button>
      </div>
      <div class="right-controls">
      </div>
    </div>
    <div class="tracks">
      <div class="left">
        <div class="title time-title">
          <icon-schedule class="icon" />
          <span>时间轴</span>
        </div>
        <div class="title video-title">
          <icon-live-broadcast class="icon" />
          <span>视频轨</span>
        </div>
        <div class="title audio-title ">
          <icon-music class="icon" />
          <span>音频轨</span>
        </div>
      </div>
      <div class="right track-right" ref="rightPanelEl" :style="{width: `${trackTotalWith}px`}" @wheel="rightMouseWheel">
        <div class="video-frame-point" :style="{left: `${videoPlayStore.videoFrameInfo.left}px`}">
          <div class="point-head" @mousedown="moveFramePoint">
            <img src="../../assets/video-frame-dot.svg" alt="NO IMG">
          </div>
          <div class="point-line" ref="frameLineRef"></div>
        </div>
        <div class="time-track" @click="gotoClickTime">
          <div class="time-unit" v-for="item in timeUtilCount">
            <div class="time-title">{{ getFormatTime(item - 1) }}</div>
            <div class="cells">
              <div class="cell" v-for="_ in 10"></div>
            </div>
          </div>
        </div>
        <div class="cut-track video-track" :style="{width: `${trackTotalWith}px`}">
          <template v-for="track of videoPlayStore.videoTracks" :key="track.id">
            <VideoClip
                :clip="track"
                ref="videoClipRefs"
                @renderSingleTrack="renderSingleTrack"
                @selectTrack="selectVideoTrack"
            />
          </template>
        </div>
        <div class="cut-track audio-track" :style="{width: `${trackTotalWith}px`}">
          <template v-for="audio of audioPlayStore.audioTracks">
            <AudioClip
                :audio="audio"
                ref="audioClipRefs"
                @mousedown="audioMoveDown($event, audio)"
                class="audio-track-item"
                :style="{
                  left: `${audio.left}px`,
                }"
            >
            </AudioClip>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="stylus" src="./track.styl">

</style>