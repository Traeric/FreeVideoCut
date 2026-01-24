import {invoke} from "@tauri-apps/api/core";
import {AudioTrackInfo, VideoTrackInfo} from "../../types/cutTask.ts";
import {executeDb, UPDATE_VIDEO_HAS_AUDIO} from "../../utils/db.ts";
import Database from "@tauri-apps/plugin-sql";

/**
 * 删除视频轨道
 *
 * @param cutTaskStore 剪辑信息
 */
export async function deleteVideoTrack(cutTaskStore: any) {
    const deleteVideoName = cutTaskStore.selectFrameData.track.videoName;
    // 如果当前视频只有这一个轨道引用 则删除
    const curNameTracks = cutTaskStore.videoTracks.filter((track: VideoTrackInfo) => track.videoName === deleteVideoName);
    if (curNameTracks.length === 1) {
        await invoke('delete_video_track', {
            workspace: cutTaskStore.currentCutTask!.folderName,
            videoTrackName: deleteVideoName,
            thumbnail: cutTaskStore.selectFrameData.track.thumbnail,
        });
    }

    // 刷新数据
    cutTaskStore.videoTracks.splice(cutTaskStore.selectFrameData.trackIndex, 1);
    await cutTaskStore.updateVideoTracks(cutTaskStore.videoTracks);
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