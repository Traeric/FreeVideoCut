import {AudioTrackInfo} from "../../../types/cutTask.ts";
import {onMounted, Ref} from "vue";
import WaveSurfer from 'wavesurfer.js';
import {useVideoPlayStore} from "../../../store/videoPlayStore.ts";
import {renderTrackContextmenu} from "./trackMenu.ts";
import {useAudioPlayStore} from "../../../store/audioPlayStore.ts";

export const useAudioTrack = (audio: AudioTrackInfo, waveContainerEl: Ref<HTMLDivElement | undefined>) => {
    const videoPlayStore = useVideoPlayStore();

    onMounted(() => {
        WaveSurfer.create({
            container: waveContainerEl.value!,
            waveColor: '#0e81b3',
            progressColor: '#0e81b3', // 和waveColor一致，隐藏播放进度
            url: audio.src,
            normalize: true,
            width: '100%',
            height: 56,
            cursorColor: 'transparent', // 隐藏光标线
            // 核心：禁用交互相关配置
            interact: false, // 禁用所有内置交互（关键参数）
            dragToSeek: false, // 禁用拖拽定位
            hideScrollbar: true, // 隐藏滚动条（如果有）
            fillParent: true, // 填满容器，无需滚动
            barAlign: 'bottom',
            barHeight: 2,
        });
    });

    const selectAudioTrack = () => {
        // 取消其他音频选中
        useAudioPlayStore().audioTracks.forEach(track => track.select = false);
        audio.select = true;

        // 取消视频轨道选中
        videoPlayStore.videoTracks.forEach(track => track.select = false);
    };

    const audioContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        renderTrackContextmenu(e, audio);
    };
    return {
        selectAudioTrack,
        audioContextMenu,
    };
};
