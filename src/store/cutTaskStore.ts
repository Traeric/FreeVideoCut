import {defineStore} from 'pinia';
import {
    DELETE_AUDIO_TRACK,
    executeDb,
    INSERT_AUDIO_TRACK,
    INSERT_CUT_TASK,
    QUERY_CUT_TASK,
    SELECT_AUDIO_TRACK,
    SELECT_IMPORT_VIDEO
} from "../utils/db.ts";
import Database from "@tauri-apps/plugin-sql";
import {AudioTrackInfo, CutTask, ImportVideo} from '../types/cutTask.ts';
import {convertFileSrc, invoke} from "@tauri-apps/api/core";
import {getUUid, TIME_STEP, UNIT_LENGTH} from "../utils/comonUtils.ts";
import {useVideoPlayStore} from "./videoPlayStore.ts";


export const useCutTaskStore = defineStore('cutTask', {
    state: () => {
        return {
            cutTaskList: [] as CutTask[],
            importVideoList: [] as ImportVideo[],
            videoEl: null as HTMLVideoElement | null, // TODO 待删除
            audioTracks: [] as AudioTrackInfo[],
            currentCutTask: null as CutTask | null,
            displayUrl: "",
            displayUrlPullTimer: null as number | null,
        };
    },
    getters: {
    },
    actions: {
        async cutTaskInit() {
            // 获取所有的剪辑任务
            await executeDb(async db => {
                let cutList = await db.select(QUERY_CUT_TASK) as any;
                if (!cutList || !cutList.length) {
                    // 创建一个剪辑任务
                    const folderName = getUUid();
                    await db.execute(INSERT_CUT_TASK, [folderName]);
                    // 创建相应文件夹
                    await invoke('create_cut_task_workspace', { folderName });
                    cutList = await db.select(QUERY_CUT_TASK) as any;
                }

                this.cutTaskList = cutList;
                // 选择第一个当作当前的剪辑任务
                this.currentCutTask = this.cutTaskList[0];
                // 查询导入视频
                await this.refreshImportVideos();
                // 查询视频轨道
                await useVideoPlayStore().refreshVideoTrack();
                // 获取音频轨道
                await this.refreshAudioTracks();
            });
        },
        async refreshImportVideos() {
            const rootPath = await invoke("get_root_path");
            await executeDb(async (db: Database) => {
                this.importVideoList = await db.select(SELECT_IMPORT_VIDEO, [this.currentCutTask!.id]);
                // 处理视频信息
                this.importVideoList.forEach((videoInfo: any) => {
                    videoInfo.url = convertFileSrc(`${rootPath}\\${this.currentCutTask!.folderName}\\import\\${videoInfo.importName}`);
                });
            });
        },
        async updateAudioTracks(newAudioTracks: AudioTrackInfo[]) {
            await executeDb(async (db: Database) => {
                // 先清除所有音频
                await db.execute(DELETE_AUDIO_TRACK, [this.currentCutTask!.id]);

                // 插入新的视频轨道
                let display = 0;
                for (const audioTrack of newAudioTracks) {
                    await db.execute(INSERT_AUDIO_TRACK, [
                        this.currentCutTask!.id,
                        audioTrack.audioName,
                        audioTrack.audioTime,
                        audioTrack.startTime,
                        display++,
                    ]);
                }

                await this.refreshAudioTracks();
            });
        },
        async refreshAudioTracks() {
            await executeDb(async (db: Database) => {
                // 获取视频轨道
                this.audioTracks = await db.select(SELECT_AUDIO_TRACK, [this.currentCutTask!.id]) as AudioTrackInfo[];
                this.audioTracks.sort((o1, o2) => o1.display - o2.display);
                // 计算轨道位置
                this.audioTracks.forEach(audio => {
                    audio.left = (audio.startTime / TIME_STEP) * UNIT_LENGTH;
                    audio.width = (audio.audioTime / TIME_STEP) * UNIT_LENGTH;
                });
            });
        },
    },
});
