<script setup lang="ts">
import {onMounted, onUnmounted, ref} from "vue";
import { useTrack } from './track.ts';

const rightPanelEl = ref<HTMLDivElement>();
const frameLineRef = ref<HTMLDivElement>();
const {
  cutVideo,
  removeSelectFrame,
  cutTaskStore,
  moveFramePoint,
  selectVideoTrack,
  selectFrameData,
  timeUtilCount,
  getFormatTime,
  selectFrameContextmenu,
} = useTrack(rightPanelEl, frameLineRef);

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
        <div class="btn" @click="cutVideo">
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
        <div class="title">
          <icon-music class="icon" />
          <span>音频轨</span>
        </div>
      </div>
      <div class="right" ref="rightPanelEl">
        <div class="video-frame-point" :style="{left: `${cutTaskStore.videoFrameInfo.left}px`}">
          <div class="point-head" @mousedown="moveFramePoint">
            <img src="../../assets/video-frame-dot.svg" alt="NO IMG">
          </div>
          <div class="point-line" ref="frameLineRef"></div>
        </div>
        <div class="time-track">
          <div class="time-unit" v-for="item in timeUtilCount">
            <div class="time-title">{{ getFormatTime(item - 1) }}</div>
            <div class="cells">
              <div class="cell"></div>
              <div class="cell"></div>
              <div class="cell"></div>
              <div class="cell"></div>
              <div class="cell"></div>
              <div class="cell"></div>
              <div class="cell"></div>
              <div class="cell"></div>
              <div class="cell"></div>
              <div class="cell"></div>
            </div>
          </div>
        </div>
        <div class="cut-track video-track">
          <div class="single-track" @click="selectVideoTrack">
            <div class="select-frame"
                 v-show="selectFrameData.show"
                 :style="{left: `${selectFrameData.left}px`, width: `${selectFrameData.width}px`}"
                 @contextmenu="selectFrameContextmenu"
            ></div>
            <template v-for="thumbnail in cutTaskStore.getVideoThumbnail">
              <img :src="thumbnail?.url" alt="NO IMG" :width="thumbnail?.width">
            </template>
          </div>
        </div>
        <div class="cut-track"></div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="stylus" src="./track.styl">

</style>