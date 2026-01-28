import {defineStore} from "pinia";
import {AudioTrackInfo} from "../types/cutTask.ts";
import {DELETE_AUDIO_TRACK, executeDb, INSERT_AUDIO_TRACK, SELECT_AUDIO_TRACK} from "../utils/db.ts";
import Database from "@tauri-apps/plugin-sql";
import {useCutTaskStore} from "./cutTaskStore.ts";
import {ONE_SECOND_LENGTH} from "../utils/comonUtils.ts";
import {convertFileSrc, invoke} from "@tauri-apps/api/core";

export const useAudioPlayStore = defineStore('audioPlay', {
    state() {
        return {
            audioTracks: [] as AudioTrackInfo[],
        };
    },
    actions: {
        async initAudioTrack() {
            const { currentCutTask } = useCutTaskStore();
            const rootPath = await invoke('get_root_path');
            await executeDb(async (db: Database) => {
                // 获取视频轨道
                this.audioTracks = await db.select(SELECT_AUDIO_TRACK, [currentCutTask!.id]) as AudioTrackInfo[];
                this.audioTracks.sort((o1, o2) => o1.display - o2.display);
                // 计算轨道位置
                this.audioTracks.forEach(audio => {
                    audio.width = audio.audioTime * ONE_SECOND_LENGTH;
                    // 计算src
                    audio.src = `${convertFileSrc(`${rootPath}/${currentCutTask!.folderName}/videoTrack/${audio.audioName}`)}?id=${audio.id}`;
                    audio.select = false;
                });
            });
        },
        async updateAudioTracks(newAudioTracks: AudioTrackInfo[]) {
            const { currentCutTask } = useCutTaskStore();
            await executeDb(async (db: Database) => {
                // 先清除所有音频
                await db.execute(DELETE_AUDIO_TRACK, [currentCutTask!.id]);

                // 插入新的视频轨道
                let display = 0;
                for (const audioTrack of newAudioTracks) {
                    await db.execute(INSERT_AUDIO_TRACK, [
                        currentCutTask!.id,
                        audioTrack.audioName,
                        audioTrack.audioTime,
                        audioTrack.startTime,
                        display++,
                    ]);
                }

                // await this.refreshAudioTracks();
            });
        },
    },
})