<script setup lang="ts">
import {onMounted, onUnmounted, ref, watch} from "vue";
import {formatTime} from "../../utils/comonUtils.ts";
import {useVideoPlayStore} from "../../store/videoPlayStore.ts";
import Export from "../Export/Export.vue";
import {useAudioPlayStore} from "../../store/audioPlayStore.ts";

const videoPlayStore = useVideoPlayStore();
const progressLineEl = ref<HTMLDivElement>();
const playCanvasEl = ref<HTMLCanvasElement>();
const exportModelVisible = ref(false);
const mute = ref(false);
const videoVolume = ref(50);

watch(videoVolume, (newVal, _) => {
  useAudioPlayStore().setVolume(newVal / 100);
  mute.value = newVal === 0;
});

const playVideo = () => {
  videoPlayStore.playCurrentVideo();
};
const pauseVideo = () => {
  videoPlayStore.pauseCurrentVideo();
};

const dragVideoDown = (e: MouseEvent) => {
  e.preventDefault();
  const progressLineRect = progressLineEl.value?.getBoundingClientRect();
  const videoIsPlayed = videoPlayStore.isPlaying;
  if (videoIsPlayed) {
    // 先暂停视频
    videoPlayStore.pauseCurrentVideo();
  }
  document.onmousemove = (moveE: MouseEvent) => {
    let currentX = moveE.clientX;
    let left = currentX - progressLineRect!.x;
    // 限制位置
    left = Math.max(0, left);
    left = Math.min(left, progressLineRect!.width);
    videoPlayStore.movePointVideo(videoPlayStore.videoTotalTime * left / progressLineRect!.width);
  };

  document.onmouseup = () => {
    document.onmousemove = null;
    // 恢复播放
    if (videoIsPlayed) {
      videoPlayStore.playCurrentVideo();
    }
  };
};

const gotoPosition = (e: MouseEvent) => {
  e.preventDefault();
  const videoIsPlayed = videoPlayStore.isPlaying;
  if (videoIsPlayed) {
    // 先暂停视频
    videoPlayStore.pauseCurrentVideo();
  }

  const clientX = e.clientX;
  const progressRect = progressLineEl.value!.getBoundingClientRect();
  const left = clientX - progressRect!.x;
  videoPlayStore.movePointVideo(videoPlayStore.videoTotalTime * left / progressRect!.width);
  // 恢复播放
  if (videoIsPlayed) {
    videoPlayStore.playCurrentVideo();
  }
};

const muteVideo = (isMute: boolean) => {
  mute.value = isMute;
  if (isMute) {
    useAudioPlayStore().mute();
  } else {
    useAudioPlayStore().setVolume(videoVolume.value / 100);
  }
};

const exportVideo = async () => {
  exportModelVisible.value = true;
};

const spaceKeyPlay = (e: KeyboardEvent) => {
  if (e.code !== 'Space') {
    return;
  }

  if (videoPlayStore.isPlaying) {
    videoPlayStore.pauseCurrentVideo();
  } else {
    videoPlayStore.playCurrentVideo();
  }
};

onMounted(() => {
  videoPlayStore.init(playCanvasEl.value!, progressLineEl.value!);
  document.addEventListener('keyup', spaceKeyPlay);
});

onUnmounted(() => {
  document.removeEventListener('keyup', spaceKeyPlay);
});
</script>

<template>
  <div class="display">
    <div class="video-area">
      <div class="video-player">
        <canvas ref="playCanvasEl"></canvas>
      </div>
      <div class="export">
        <div class="export-btn" @click="exportVideo">
          <img class="export-icon" src="../../assets/icons/dog.svg" alt="NO MG">
          <div class="text">导出视频</div>
        </div>
        <Export v-model:visible="exportModelVisible" />
      </div>
    </div>
    <div class="play-area">
      <div class="control">
        <div class="play-icon">
          <img
              v-if="!videoPlayStore.isPlaying"
              @click="playVideo"
              src="../../assets/icons/play.svg"
              alt="NO IMG"
              class="icon"
          >
          <img
              v-else
              @click="pauseVideo"
              src="../../assets/icons/pause.svg"
              alt="NO IMG"
              class="icon pause-icon"
          >
        </div>

        <div class="audio-icon">
          <a-popover>
            <img
                v-if="!mute"
                @click="muteVideo(!mute)"
                src="../../assets/icons/audio.svg"
                alt="NO IMG"
                class="icon"
            >
            <template #content>
              <div class="volum-setting">
                <a-slider v-model="videoVolume" class="setting" :default-value="50" status="warning" />
                <a-progress :steps="10" size="small" :percent="videoVolume / 100" status="warning" />
              </div>
            </template>
          </a-popover>
          <img
              v-if="mute"
              src="../../assets/icons/mute.svg"
              alt="NO IMG"
              class="icon mute-icon"
              @click="muteVideo(!mute)"
          >
        </div>
      </div>
      <div class="progress">
        <div
            class="progress-line"
            ref="progressLineEl"
            @click="gotoPosition"
        >
          <div class="passed" :style="{width: `${videoPlayStore.progressDotLeft}px`}"></div>
          <div class="progress-bar" :style="{left: `${videoPlayStore.progressDotLeft}px`}">
            <img
              @mousedown="dragVideoDown"
              src="../../assets/progress-dot.svg"
              alt="NO IMG"
            >
          </div>
        </div>
        <a-progress size="mini" status='warning' :percent="videoPlayStore.progressRate"/>
      </div>
      <div class="time">
        <span class="played">{{ formatTime(videoPlayStore.videoCurrentTime) }}</span>
        <icon-oblique-line />
        <span>{{ formatTime(videoPlayStore.videoTotalTime) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="stylus" src="./display.styl">

</style>