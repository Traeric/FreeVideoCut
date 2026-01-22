<script setup lang="ts">
import {onMounted, onUnmounted, ref} from "vue";
import { useTrack, useWheel } from './track.ts';

const rightPanelEl = ref<HTMLDivElement>();
const frameLineRef = ref<HTMLDivElement>();
const {
  cutVideo,
  removeSelectFrame,
  cutTaskStore,
  moveFramePoint,
  selectVideoTrack,
  timeUtilCount,
  getFormatTime,
  selectFrameContextmenu,
  trackTotalWith,
  gotoClickTime,
} = useTrack(rightPanelEl, frameLineRef);

const { rightMouseWheel } = useWheel(rightPanelEl);

onMounted(() => {
  document.addEventListener("click", removeSelectFrame);
});

onUnmounted(() => {
  document.removeEventListener("click", removeSelectFrame);
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
          <template #default>导出</template>
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
        <div class="video-frame-point" :style="{left: `${cutTaskStore.videoFrameInfo.left}px`}">
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
          <div class="single-track" @click="selectVideoTrack">
            <div class="select-frame"
                 v-show="cutTaskStore.selectFrameData.show"
                 :style="{left: `${cutTaskStore.selectFrameData.left}px`, width: `${cutTaskStore.selectFrameData.width}px`}"
                 @contextmenu="selectFrameContextmenu"
            ></div>
            <template v-for="thumbnail in cutTaskStore.getVideoThumbnail">
              <div v-if="thumbnail.placeholder" class="thumbnail-placeholder" :style="{width: `${thumbnail.width}px`}">
                <a-skeleton-line :rows="3" />
              </div>
              <div v-else :class="{'thumbnail-border': true, 'last-thumbnail-border': thumbnail.last}" :style="{width: `${thumbnail?.width}px`}">
                <div :class="{'thumbnail-img': true, 'first-thumbnail': thumbnail.first, 'last-thumbnail': thumbnail.last}">
                  <img :src="thumbnail?.url" alt="NO IMG">
                </div>
                <div class="audio" v-if="thumbnail.hasAudio === 1"></div>
              </div>
            </template>
          </div>
        </div>
        <div class="cut-track audio-track" :style="{width: `${trackTotalWith}px`}">
          <div class="track-item" v-for="audio of cutTaskStore.audioTracks" :style="{left: `${audio.left}px`, width: `${audio.width}px`}"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="stylus" src="./track.styl">

</style>