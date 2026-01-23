import {useCutTaskStore} from "../../store/cutTaskStore.ts";
import {computed, h, Ref} from "vue";
import {CUT_VIDEO_MIN_LENG, EXCEPT_CLASS_NAME, formatTime, TIME_STEP, UNIT_LENGTH} from "../../utils/comonUtils.ts";
import {Message, Notification} from "@arco-design/web-vue";
import {VideoTrackInfo} from "../../types/cutTask.ts";
import ContextMenu from '@imengyu/vue3-context-menu';
import {deleteVideoTrack, splitVideoAudio} from "./trackMenu.ts";
import {useVideoPlayStore} from "../../store/videoPlayStore.ts";

export const useTrack = (rightPanelEl: Ref<HTMLDivElement | undefined>, frameLineRef: Ref<HTMLDivElement | undefined>) => {
    const cutTaskStore = useCutTaskStore();
    const videoPlayStore = useVideoPlayStore();

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
            let left = currentX - progressLineRect!.x;
            // 限制位置
            left = Math.max(0, left);
            left = Math.min(left, videoPlayStore.videoTotalTime / TIME_STEP * UNIT_LENGTH);

            // 设置到视频对应位置
            videoPlayStore.movePointVideo((left / UNIT_LENGTH) * TIME_STEP);
        };

        document.onmouseup = () => {
            document.onmousemove = null;
            // 恢复播放
            if (videoIsPlayed) {
                videoPlayStore.playCurrentVideo();
            }
        };
    };

    const gotoClickTime = (e: MouseEvent) => {
        e.preventDefault();
        const progressLineRect = rightPanelEl.value?.getBoundingClientRect();
        let left = e.clientX - progressLineRect!.x + rightPanelEl.value!.scrollLeft;
        // 限制位置
        left = Math.max(0, left);
        left = Math.min(left, trackTotalWith.value);

        videoPlayStore.movePointVideo((left / UNIT_LENGTH) * TIME_STEP);
        if (videoPlayStore.isPlaying) {
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
        for (const track of cutTaskStore.videoTracks) {
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
            videoTime: seconds,
            startTime: cutVideoTrack.startTime,
            endTime: cutVideoTrack.startTime + seconds,
            display: 0,
            hasAudio: cutVideoTrack.hasAudio,
        };
        const partTwoVideo: VideoTrackInfo = {
            cutTaskId: cutTaskStore.currentCutTask!.id,
            videoName: cutVideoTrack.videoName,
            thumbnail: cutVideoTrack.thumbnail,
            videoTime: cutVideoTrack.endTime - seconds,
            startTime: cutVideoTrack.startTime + seconds,
            endTime: cutVideoTrack.endTime,
            display: 0,
            hasAudio: cutVideoTrack.hasAudio,
        };
        const newVideoTracks = [];
        for (const track of cutTaskStore.videoTracks) {
            if (track === cutVideoTrack) {
                // 替换成两个切分后的视频
                newVideoTracks.push(partOneVideo);
                newVideoTracks.push(partTwoVideo);
                continue;
            }

            newVideoTracks.push(track);
        }

        const currentSelectIndex = cutTaskStore.videoTracks.findIndex(item => item.select);
        await cutTaskStore.updateVideoTracks(newVideoTracks, currentSelectIndex);
    };

    /**
     * 选择视频轨道
     *
     * @param e MouseEvent
     */
    const selectVideoTrack = (e: MouseEvent) => {
        e.stopPropagation();
        const rightRect = rightPanelEl.value!.getBoundingClientRect();
        const left = (e.clientX + rightPanelEl.value!.scrollLeft) - rightRect.x;
        // 计算当前选中了哪个轨道
        const selectTrackIndex = cutTaskStore.videoTracks.findIndex(track => left > track.left! && left < track.left! + track.width!);
        const selectTrack = cutTaskStore.videoTracks[selectTrackIndex] as VideoTrackInfo;
        if (!selectTrack) {
            Message.warning("无法选中轨道");
            return;
        }

        // 设置选中框信息
        cutTaskStore.setSelectFrameData(selectTrackIndex);
    };

    const removeSelectFrame = (e: MouseEvent) => {
        let parentNode = e.target as any;
        while (parentNode && parentNode.tagName !== 'BODY') {
            if (EXCEPT_CLASS_NAME.some(name => parentNode.classList.contains(name))) {
                return;
            }
            parentNode = parentNode.parentNode;
        }

        cutTaskStore.removeSelectFrame();
    };

    const selectFrameContextmenu = (e: MouseEvent) => {
        e.preventDefault();
        ContextMenu.showContextMenu({
            x: e.x,
            y: e.y,
            theme: 'mac dark',
            items: [
                {
                    label: "删除视频轨道",
                    icon: h('img', {
                        src: '/delete.svg',
                        style: {
                            width: '20px',
                            height: '20px',
                        },
                    }),
                    onClick: () => {
                        deleteVideoTrack(cutTaskStore);
                    },
                },
                {
                    label: "音频分离",
                    icon: h('img', {
                        src: '/split.svg',
                        style: {
                            width: '20px',
                            height: '20px',
                        }
                    }),
                    disabled: !cutTaskStore.selectFrameData.track.hasAudio,
                    onClick: () => {
                        splitVideoAudio(cutTaskStore);
                    },
                }
            ]
        });
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
        selectFrameContextmenu,
        trackTotalWith,
        gotoClickTime,
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