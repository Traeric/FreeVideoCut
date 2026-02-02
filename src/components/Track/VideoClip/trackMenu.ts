import {invoke} from "@tauri-apps/api/core";
import {AudioTrackInfo, VideoTrackInfo} from "../../../types/cutTask.ts";
import {executeDb, UPDATE_VIDEO_HAS_AUDIO} from "../../../utils/db.ts";
import Database from "@tauri-apps/plugin-sql";
import ContextMenu from "@imengyu/vue3-context-menu";
import {h} from "vue";
import {useCutTaskStore} from "../../../store/cutTaskStore.ts";
import {useVideoPlayStore} from "../../../store/videoPlayStore.ts";
import {useAudioPlayStore} from "../../../store/audioPlayStore.ts";

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
 */
export async function splitVideoAudio(clip: VideoTrackInfo) {
    const cutTaskStore = useCutTaskStore();
    // 更新视频轨道的音频信息
    await executeDb(async (db: Database) => {
        await db.execute(UPDATE_VIDEO_HAS_AUDIO, [clip.id]);
        clip.hasAudio = 0;
    });

    // 音频入库
    const audioTracks = useAudioPlayStore().audioTracks as AudioTrackInfo[];
    const lastTrack = audioTracks[audioTracks.length - 1];
    const audioTrack = {
        cutTaskId: cutTaskStore.currentCutTask!.id,
        audioName: clip.videoName,
        originName: clip.originName,
        audioTime: clip.videoTime,
        startTime: 0,
        endTime: clip.endTime,
        trackStartTime: lastTrack ? (lastTrack.trackStartTime + lastTrack.audioTime) : 0,
        display: lastTrack ? lastTrack.display + 1 : 0,
    } as AudioTrackInfo;
    useAudioPlayStore().addAudioTrack(audioTrack);
}

/**
 * 渲染视频轨道菜单
 *
 * @param e 鼠标事件
 * @param clip 当前视频轨道信息
 * @param loadVideoTrack 重新加载视频轨道
 */
export function renderTrackContextmenu(e: MouseEvent, clip: VideoTrackInfo, loadVideoTrack: () => void) {
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
                disabled: !clip.hasAudio,
                onClick: () => {
                    splitVideoAudio(clip).then(() => {
                        loadVideoTrack();
                    });
                },
            }
        ]
    });
}