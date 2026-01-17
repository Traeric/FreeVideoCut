import {useCutTaskStore} from "../../store/cutTaskStore.ts";
import {computed, Ref, ref, h} from "vue";
import {formatTime, timeStep, unitLength} from "../../utils/comonUtils.ts";
import {Message} from "@arco-design/web-vue";
import {invoke} from "@tauri-apps/api/core";
import {VideoTrackInfo} from "../../types/cutTask.ts";
import ContextMenu from '@imengyu/vue3-context-menu';

export const useTrack = (rightPanelEl: Ref<HTMLDivElement | undefined>, frameLineRef: Ref<HTMLDivElement | undefined>) => {
    const cutTaskStore = useCutTaskStore();
    const selectFrameData: Record<string, any> = ref({
        show: false,
        width: 0,
        left: 0,
        track: null,
        trackIndex: 0,
    });

    // 计算需要多少个单元 5s一个单元
    const timeUtilCount = computed(() => {
        // 计算一共需要多少秒
        let totalTime = 0;
        cutTaskStore.videoTracks.forEach(track => {
            totalTime += Number(track.videoTime);
        });
        return Math.ceil(totalTime / timeStep);
    });

    const getFormatTime = (currentUnit: number) => {
        return formatTime(currentUnit * timeStep);
    };

    const moveFramePoint = (e: MouseEvent) => {
        e.preventDefault();
        const progressLineRect = rightPanelEl.value?.getBoundingClientRect();
        document.onmousemove = (moveE: MouseEvent) => {
            let currentX = moveE.clientX;
            let left = currentX - progressLineRect!.x;
            // 限制位置
            left = Math.max(0, left);
            left = Math.min(left, progressLineRect!.width);

            cutTaskStore.videoFrameInfo.left = left;
            cutTaskStore.setVideoTime(left);
        };

        document.onmouseup = () => {
            document.onmousemove = null;
        };
    };

    /**
     * 裁剪视频
     */
    const cutVideo = async () => {
        const left = frameLineRef.value!.getBoundingClientRect().left - rightPanelEl.value!.getBoundingClientRect().left;
        let seconds = left / unitLength * timeStep;
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

        let newVideoTrackNames = await invoke('cut_video', {
            workspace: cutTaskStore.currentCutTask!.folderName,
            cutVideoName: cutVideoTrack.videoName,
            thumbnail: cutVideoTrack.thumbnail,
            cutTime: formatTime(seconds),
        }) as number[];

        // 刷新视频轨道
        const partOneVideo: VideoTrackInfo = {
            cutTaskId: cutTaskStore.currentCutTask!.id,
            videoName: `${newVideoTrackNames[0]}.mp4`,
            thumbnail: String(newVideoTrackNames[0]),
            videoTime: seconds,
            display: 0
        };
        const partTwoVideo: VideoTrackInfo = {
            cutTaskId: cutTaskStore.currentCutTask!.id,
            videoName: `${newVideoTrackNames[1]}.mp4`,
            thumbnail: String(newVideoTrackNames[1]),
            videoTime: cutVideoTrack.videoTime - seconds,
            display: 0
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

        cutTaskStore.updateVideoTracks(newVideoTracks);
    };

    /**
     * 选择视频轨道
     *
     * @param e MouseEvent
     */
    const selectVideoTrack = (e: MouseEvent) => {
        e.stopPropagation();
        const rightRect = rightPanelEl.value!.getBoundingClientRect();
        const left = e.clientX - rightRect.x;
        // 计算当前选中了哪个轨道
        const selectTrackIndex = cutTaskStore.videoTracks.findIndex(track => left > track.left! && left < track.left! + track.width!);
        const selectTrack = cutTaskStore.videoTracks[selectTrackIndex] as VideoTrackInfo;
        if (!selectTrack) {
            Message.warning("无法选中轨道");
            return;
        }
        selectFrameData.value.show = true;
        selectFrameData.value.left = selectTrack.left!;
        selectFrameData.value.width = selectTrack.width!;
        selectFrameData.value.track = selectTrack;
        selectFrameData.value.trackIndex = selectTrackIndex;
    };

    const removeSelectFrame = () => {
        selectFrameData.value.show = false;
        selectFrameData.value.left = 0;
        selectFrameData.value.width = 0;
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
                    onClick: async () => {
                        await invoke('delete_video_track', {
                            workspace: cutTaskStore.currentCutTask!.folderName,
                            videoTrackName: selectFrameData.value.track.videoName,
                            thumbnail: selectFrameData.value.track.thumbnail,
                        });
                        // 刷新数据
                        cutTaskStore.videoTracks.splice(selectFrameData.value.trackIndex, 1);
                        cutTaskStore.updateVideoTracks(cutTaskStore.videoTracks);
                    }
                },
            ]
        });
    };

    return {
        cutVideo,
        removeSelectFrame,
        cutTaskStore,
        moveFramePoint,
        selectVideoTrack,
        selectFrameData,
        timeUtilCount,
        getFormatTime,
        selectFrameContextmenu,
    };
};
