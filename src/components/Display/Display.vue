<script setup lang="ts">
import {useCutTaskStore} from "../../store/cutTaskStore.ts";
import {onMounted, ref, watch} from "vue";
import {formatTime} from "../../utils/comonUtils.ts";

const cutTaskStore = useCutTaskStore();
const displayVideoEl = ref<HTMLVideoElement>();
const progressLineEl = ref<HTMLDivElement>();
const played = ref(false);
const playedTime = ref(formatTime(0));
const totalTime = ref(formatTime(0));
const progressRate = ref(0);
const progressDotLeft = ref(0);
const mute = ref(false);
const videoVolume = ref(50);
let positionCalcTimer = 0;

watch(videoVolume, (newVal, _) => {
  displayVideoEl.value!.volume = newVal / 100;
  mute.value = newVal === 0;
});

const playVideo = () => {
  displayVideoEl.value!.volume = videoVolume.value / 100;
  displayVideoEl.value!.play();
  played.value = true;
};
const pauseVideo = () => {
  displayVideoEl.value!.pause();
  played.value = false;
  clearInterval(positionCalcTimer);
};

const dragVideoDown = (e: MouseEvent) => {
  e.preventDefault();
  const progressLineRect = progressLineEl.value?.getBoundingClientRect();
  document.onmousemove = (moveE: MouseEvent) => {
    let currentX = moveE.clientX;
    let left = currentX - progressLineRect!.x;
    // 限制位置
    left = Math.max(0, left);
    left = Math.min(left, progressLineRect!.width);
    setVideoDisplay(left, progressLineRect!);
  };

  document.onmouseup = () => {
    document.onmousemove = null;
  };
};

function setVideoDisplay(left: number, progressLineRect: DOMRect) {
  progressDotLeft.value = left;
  progressRate.value = left / progressLineRect!.width;
  displayVideoEl.value!.currentTime = displayVideoEl.value!.duration * progressRate.value;
  playedTime.value = formatTime(displayVideoEl.value?.currentTime ?? 0);
}

const gotoPosition = (e: MouseEvent) => {
  const clientX = e.clientX;
  const progressRect = progressLineEl.value!.getBoundingClientRect();
  const left = clientX - progressRect!.x;
  setVideoDisplay(left, progressRect!);
};

const muteVideo = (isMute: boolean) => {
  mute.value = isMute;
  displayVideoEl.value!.muted = isMute;
};

onMounted(() => {
  cutTaskStore.videoEl = displayVideoEl.value!;

  displayVideoEl.value?.addEventListener('loadedmetadata', () => {
    // 获取播放时间
    totalTime.value = formatTime(displayVideoEl.value?.duration ?? 0);
  });

  displayVideoEl.value?.addEventListener('timeupdate', () => {
    positionCalcTimer = setInterval(() => {
      const progressLineRect = progressLineEl.value?.getBoundingClientRect();
      playedTime.value = formatTime(displayVideoEl.value?.currentTime ?? 0);
      progressRate.value = (displayVideoEl.value?.currentTime ?? 0) / (displayVideoEl.value?.duration ?? 0);
      progressDotLeft.value = progressLineRect!.width * progressRate.value;

      if (displayVideoEl.value!.currentTime >= displayVideoEl.value!.duration) {
        // 播放结束
        played.value = false;
      }

      cutTaskStore.refreshVideoFrame();
    }, 10);
  });
});
</script>

<template>
  <div class="display">
    <div class="video-player">
      <video
          :src="cutTaskStore.displayUrl"
          ref="displayVideoEl"
      ></video>
    </div>
    <div class="play-area">
      <div class="control">
        <icon-play-arrow v-if="!played" class="icon" @click="playVideo" />
        <icon-pause v-else class="icon pause" @click="pauseVideo" />

        <a-popover>
          <icon-sound v-if="!mute" class="icon" @click="muteVideo(!mute)" />
          <template #content>
            <div class="volum-setting">
              <a-slider v-model="videoVolume" class="setting" :default-value="50" status="warning" />
              <a-progress :steps="10" size="small" :percent="videoVolume / 100" status="warning" />
            </div>
          </template>
        </a-popover>
        <icon-mute v-if="mute" class="icon" @click="muteVideo(!mute)" />
      </div>
      <div class="progress">
        <div
            class="progress-line"
            ref="progressLineEl"
            @click="gotoPosition"
        >
          <div class="passed" :style="{width: `${progressDotLeft}px`}"></div>
          <div class="progress-bar" :style="{left: `${progressDotLeft}px`}">
            <img
              @mousedown="dragVideoDown"
              src="../../assets/progress-dot.svg"
              alt="NO IMG"
            >
          </div>
        </div>
        <a-progress size="mini" status='warning' :percent="progressRate"/>
      </div>
      <div class="time">
        <span class="played">{{ playedTime }}</span>
        <icon-oblique-line />
        <span>{{ totalTime }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="stylus" src="./display.styl">

</style>