import {useCutTaskStore} from "../../store/cutTaskStore.ts";
import {computed, Ref} from "vue";
import {
    CUT_VIDEO_MIN_LENG,
    EXCEPT_CLASS_NAME,
    formatTime,
    ONE_SECOND_LENGTH,
    TIME_STEP,
    UNIT_LENGTH
} from "../../utils/comonUtils.ts";
import {Message, Notification} from "@arco-design/web-vue";
import {AudioTrackInfo, VideoTrackInfo} from "../../types/cutTask.ts";
import {useVideoPlayStore} from "../../store/videoPlayStore.ts";
import {useAudioPlayStore} from "../../store/audioPlayStore.ts";
import {executeDb, UPDATE_AUDIO_TRACK_START_TIME} from "../../utils/db.ts";
import Database from "@tauri-apps/plugin-sql";

export const useTrack = (rightPanelEl: Ref<HTMLDivElement | undefined>,
                         frameLineRef: Ref<HTMLDivElement | undefined>, videoClipRefs: any, audioClipRefs: any) => {
    const cutTaskStore = useCutTaskStore();
    const videoPlayStore = useVideoPlayStore();
    const audioPlayStore = useAudioPlayStore();

    // 计算需要多少个单元 5s一个单元
    const timeUtilCount = computed(() => {
        const minWidth = window.window.innerWidth - 90;

        // 计算一共需要多少秒
        let totalTime = videoPlayStore.videoTotalTime;
        return Math.ceil(Math.max(totalTime / TIME_STEP, minWidth / UNIT_LENGTH));
    });

    // 计算轨道总长度
    const trackTotalWith = computed(() => {
        return timeUtilCount.value * UNIT_LENGTH;
    });

    const getFormatTime = (currentUnit: number) => {
        return formatTime(currentUnit * TIME_STEP);
    };

    const moveFramePoint = (e: MouseEvent) => {
        e.preventDefault();
        const progressLineRect = rightPanelEl.value?.getBoundingClientRect();
        // 暂停视频
        const videoIsPlayed = videoPlayStore.isPlaying;
        if (videoIsPlayed) {
            videoPlayStore.pauseCurrentVideo();
        }
        document.onmousemove = (moveE: MouseEvent) => {
            let currentX = moveE.clientX;
            let left = currentX - progressLineRect!.x + rightPanelEl.value!.scrollLeft;
            // 限制位置
            left = Math.max(0, left);
            left = Math.min(left, videoPlayStore.videoTotalTime * ONE_SECOND_LENGTH);

            // 设置到视频对应位置
            videoPlayStore.movePointVideo((left / UNIT_LENGTH) * TIME_STEP);
        };

        document.onmouseup = () => {
            document.onmousemove = null;
            document.onmouseup = null;
            // 恢复播放
            if (videoIsPlayed) {
                videoPlayStore.playCurrentVideo();
            }
        };
    };

    const gotoClickTime = (e: MouseEvent) => {
        e.preventDefault();
        // 暂停视频
        const videoIsPlayed = videoPlayStore.isPlaying;
        if (videoIsPlayed) {
            videoPlayStore.pauseCurrentVideo();
        }

        const progressLineRect = rightPanelEl.value?.getBoundingClientRect();
        let left = e.clientX - progressLineRect!.x + rightPanelEl.value!.scrollLeft;
        // 限制位置
        left = Math.max(0, left);
        left = Math.min(left, videoPlayStore.videoTotalTime * ONE_SECOND_LENGTH);

        videoPlayStore.movePointVideo((left / UNIT_LENGTH) * TIME_STEP);
        // 恢复播放
        if (videoIsPlayed) {
            videoPlayStore.playCurrentVideo();
        }
    };

    /**
     * 裁剪视频
     */
    const cutVideo = async () => {
        const left = (frameLineRef.value!.getBoundingClientRect().left + rightPanelEl.value!.scrollLeft) - rightPanelEl.value!.getBoundingClientRect().left;
        let seconds = (left / UNIT_LENGTH) * TIME_STEP;
        // 计算是第几个视频
        let cutVideoTrack = null;
        for (const track of videoPlayStore.videoTracks) {
            if (track.videoTime === seconds) {
                Message.error('不可剪切');
                return;
            }

            if (track.videoTime > seconds) {
                // 需要剪辑的视频
                cutVideoTrack = track;
                break;
            }
            seconds = seconds - track.videoTime;
        }

        if (!cutVideoTrack) {
            Message.error('获取不到视频轨道');
            return;
        }

        if (seconds < CUT_VIDEO_MIN_LENG || cutVideoTrack.videoTime - seconds < CUT_VIDEO_MIN_LENG) {
            Notification.error({
                title: '无法分割',
                content: `无法分割长度小于${CUT_VIDEO_MIN_LENG}秒的视频`,
            });
            return;
        }

        // 刷新视频轨道
        const partOneVideo: VideoTrackInfo = {
            cutTaskId: cutTaskStore.currentCutTask!.id,
            videoName: cutVideoTrack.videoName,
            thumbnail: cutVideoTrack.thumbnail,
            startTime: cutVideoTrack.startTime,
            endTime: cutVideoTrack.startTime + seconds,
            videoTime: seconds,
            display: 0,
            originName: cutVideoTrack.originName,
            hasAudio: cutVideoTrack.hasAudio,
        };
        const partTwoVideo: VideoTrackInfo = {
            cutTaskId: cutTaskStore.currentCutTask!.id,
            videoName: cutVideoTrack.videoName,
            thumbnail: cutVideoTrack.thumbnail,
            startTime: cutVideoTrack.startTime + seconds,
            endTime: cutVideoTrack.endTime,
            videoTime: cutVideoTrack.endTime - (cutVideoTrack.startTime + seconds),
            display: 0,
            originName: cutVideoTrack.originName,
            hasAudio: cutVideoTrack.hasAudio,
        };
        const newVideoTracks = [];
        for (const track of videoPlayStore.videoTracks) {
            if (track === cutVideoTrack) {
                // 替换成两个切分后的视频
                newVideoTracks.push(partOneVideo);
                newVideoTracks.push(partTwoVideo);
                continue;
            }

            newVideoTracks.push(track);
        }

        const currentSelectIndex = videoPlayStore.videoTracks.findIndex(item => item.select);
        await videoPlayStore.updateVideoTracks(newVideoTracks, currentSelectIndex);
    };

    /**
     * 选择视频轨道
     *
     * @param e MouseEvent
     */
    const selectVideoTrack = ({ id }: { id: number }) => {
        // 取消所有选框
        videoPlayStore.videoTracks.forEach(track => track.select = false);
        // 选中当前框
        videoPlayStore.videoTracks!.find(track => track.id === id)!.select = true;
    };

    const removeSelectFrame = (e: MouseEvent) => {
        let parentNode = e.target as any;
        while (parentNode && parentNode.tagName !== 'BODY') {
            if (EXCEPT_CLASS_NAME.some(name => parentNode.classList.contains(name))) {
                return;
            }
            parentNode = parentNode.parentNode;
        }

        videoPlayStore.videoTracks.forEach(track => track.select = false);
        audioPlayStore.audioTracks.forEach(track => track.select = false);
    };

    function panelScrollEvent ()  {
        const scrollPosition = rightPanelEl.value!.scrollLeft;
        const panelRect = rightPanelEl.value!.getBoundingClientRect();
        // 计算每个轨道需要展示的区域
        let preWidth = 0;
        for (const track of videoPlayStore.videoTracks) {
            const trackWidth = track.videoTime * ONE_SECOND_LENGTH;
            // 当前视频轨道起始显示区域
            const trackStartPosition = Math.max(scrollPosition - preWidth, 0);
            // 当前视频轨道结束显示区域
            const trackOverrideLength = Math.max((preWidth + trackWidth) - (scrollPosition + panelRect.width), 0);
            const trackEndPosition = Math.max(trackWidth - trackOverrideLength, 0);

            const videoClipComp = videoClipRefs.value.find((item: any) => item.$props.clip.id === track.id);
            videoClipComp?.renderVideoTrack(trackStartPosition, trackEndPosition);
            preWidth += trackWidth;
        }
    }

    const renderSingleTrack = (params: any) => {
        const scrollPosition = rightPanelEl.value!.scrollLeft;
        const panelRect = rightPanelEl.value!.getBoundingClientRect();
        // 计算每个轨道需要展示的区域
        let preWidth = 0;
        for (const track of videoPlayStore.videoTracks) {
            const trackWidth = track.videoTime * ONE_SECOND_LENGTH;
            if (track.id === params.id) {
                // 当前视频轨道起始显示区域
                const trackStartPosition = Math.max(scrollPosition - preWidth, 0);
                // 当前视频轨道结束显示区域
                const trackOverrideLength = Math.max((preWidth + trackWidth) - (scrollPosition + panelRect.width), 0);
                const trackEndPosition = Math.max(trackWidth - trackOverrideLength, 0);

                const videoClipComp = videoClipRefs.value.find((item: any) => item.$props.clip.id === track.id);
                videoClipComp?.renderVideoTrack(trackStartPosition, trackEndPosition);
                break;
            }
            preWidth += trackWidth;
        }
    };

    const audioMoveDown = (e: MouseEvent, audio: AudioTrackInfo) => {
        const startX = e.clientX;
        const startLeft = audio.left!;

        // 获取当前轨道移动的前后限制
        const [startLimit, endLimit] = useAudioPlayStore().getTrackMoveLimit(audio);
        document.onmousemove = (moveE: MouseEvent) => {
            // 拖动前先选中轨道
            audioClipRefs.value.find((item: any) => item.$props.audio.id === audio.id)?.selectAudioTrack();

            const moveDistance = moveE.clientX - startX;
            let currentLeft = startLeft + moveDistance;
            currentLeft = Math.min(endLimit, Math.max(startLimit, currentLeft));
            audio.left = currentLeft;
            audio.trackStartTime = currentLeft / ONE_SECOND_LENGTH;
            audio.trackEndTime = audio.trackStartTime + audio.audioTime;
        };

        document.onmouseup = () => {
            document.onmousemove = null;
            document.onmouseup = null;
            // 更新音频播放数据并保存
            const playAudio = useAudioPlayStore().audioPlayList.find(item => item.audioId === audio.id);
            if (playAudio) {
                playAudio.trackStartTime = audio.trackStartTime;
                playAudio.trackEndTime = audio.trackEndTime;
            }
            executeDb((db: Database) => {
                db.execute(UPDATE_AUDIO_TRACK_START_TIME, [audio.trackStartTime, audio.id]);
            });
        };
    };

    return {
        cutVideo,
        removeSelectFrame,
        cutTaskStore,
        videoPlayStore,
        moveFramePoint,
        selectVideoTrack,
        timeUtilCount,
        getFormatTime,
        trackTotalWith,
        gotoClickTime,
        panelScrollEvent,
        renderSingleTrack,
        audioMoveDown,
    };
};

/**
 * 滚轮事件
 *
 * @param rightPanelEl 右侧可滚动面板
 */
export const useWheel = (rightPanelEl: Ref<HTMLDivElement | undefined>) => {
    const rightMouseWheel = (e: WheelEvent) => {
        e.preventDefault();
        rightPanelEl.value!.scrollLeft += e.deltaY * 1.1;
    };

    return {
        rightMouseWheel,
    };
}