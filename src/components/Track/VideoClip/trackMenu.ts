import {invoke} from "@tauri-apps/api/core";
import {AudioTrackInfo, VideoTrackInfo} from "../../../types/cutTask.ts";
import {executeDb, UPDATE_VIDEO_HAS_AUDIO} from "../../../utils/db.ts";
import Database from "@tauri-apps/plugin-sql";
import ContextMenu from "@imengyu/vue3-context-menu";
import {h} from "vue";
import {useCutTaskStore} from "../../../store/cutTaskStore.ts";
import {useVideoPlayStore} from "../../../store/videoPlayStore.ts";

/**
 * 删除视频轨道
 *
 * @param clip 当前视频
 */
export async function deleteVideoTrack(clip: VideoTrackInfo) {
    const cutTaskStore = useCutTaskStore();
    const videoPlayStore = useVideoPlayStore();
    const deleteVideoName = clip.videoName;
    // 如果当前视频只有这一个轨道引用 则删除
    const curNameTracks = videoPlayStore.videoTracks.filter((track: VideoTrackInfo) => track.videoName === deleteVideoName);
    if (curNameTracks.length === 1) {
        await invoke('delete_video_track', {
            workspace: cutTaskStore.currentCutTask!.folderName,
            videoTrackName: deleteVideoName,
        });
    }

    // 刷新数据
    const removeIndex = videoPlayStore.videoTracks.findIndex((track: VideoTrackInfo) => track.id === clip.id);
    videoPlayStore.videoTracks.splice(removeIndex, 1);
    await videoPlayStore.updateVideoTracks(videoPlayStore.videoTracks);
}

/**
 * 分离音频
 *
 * @param cutTaskStore 剪辑信息
 */
export async function splitVideoAudio(cutTaskStore: any) {
    const audioName = await invoke('split_video_audio', {
        workspace: cutTaskStore.currentCutTask.folderName,
        trackName: cutTaskStore.selectFrameData.track.videoName,
        pureTrackName: cutTaskStore.selectFrameData.track.thumbnail,
    }) as string;

    // 更新视频轨道的音频信息
    const selectTrack = cutTaskStore.selectFrameData.track;
    await executeDb(async (db: Database) => {
        await db.execute(UPDATE_VIDEO_HAS_AUDIO, [selectTrack.id]);
        selectTrack.hasAudio = 0;
    });

    // 音频入库
    const audioTracks = cutTaskStore.audioTracks as AudioTrackInfo[];
    const lastTrack = audioTracks[audioTracks.length - 1];
    audioTracks.push({
        cutTaskId: cutTaskStore.currentCutTask.id,
        audioName,
        audioTime: cutTaskStore.selectFrameData.track.videoTime,
        startTime: lastTrack ? (lastTrack.startTime + lastTrack.audioTime) : 0,
        display: 0,
    });
    cutTaskStore.updateAudioTracks(audioTracks);
}

/**
 * 渲染视频轨道菜单
 *
 * @param e 鼠标事件
 * @param clip 当前视频轨道信息
 */
export function renderTrackContextmenu(e: MouseEvent, clip: VideoTrackInfo) {
    return ContextMenu.showContextMenu({
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
                    deleteVideoTrack(clip);
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
                // disabled: !cutTaskStore.selectFrameData.track.hasAudio,
                onClick: () => {
                    // splitVideoAudio(cutTaskStore);
                },
            }
        ]
    });
}