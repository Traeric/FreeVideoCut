import {defineStore} from 'pinia';
import {DELETE_VIDEO_TRACK, executeDb, INSERT_VIDEO_TRACK, SELECT_VIDEO_TRACK} from "../utils/db.ts";
import Database from "@tauri-apps/plugin-sql";
import {CutTask, VideoFrameInfo, VideoTrackInfo} from '../types/cutTask.ts';
import {convertFileSrc, invoke} from "@tauri-apps/api/core";
import {timeStep, unitLength} from "../utils/comonUtils.ts";
import {Message} from "@arco-design/web-vue";


export const useCutTaskStore = defineStore('cutTask', {
    state: () => {
        return {
            videoEl: null as HTMLVideoElement | null,
            videoTracks: [] as VideoTrackInfo[],
            currentCutTask: null as CutTask | null,
            displayUrl: "",
            videoFrameInfo: {} as VideoFrameInfo,
        };
    },
    getters: {
        getVideoThumbnail: (state) => {
            return state.videoTracks.flatMap(track => track.thumbnailList);
        },
    },
    actions: {
        async refreshVideoTrack() {
            // 获取视频轨道的数据
            await executeDb(async (db: Database) => {
                this.videoTracks = await db.select(SELECT_VIDEO_TRACK, [this.currentCutTask!.id]) as VideoTrackInfo[];
            });

            // 轨道排序
            this.videoTracks.sort((o1, o2) => o1.display - o2.display);

            // 计算每个轨道的位置信息
            let prevTrack: VideoTrackInfo | null = null;
            this.videoTracks.forEach(track => {
                track.width = track.videoTime * (unitLength / timeStep);
                // @ts-ignore
                track.left = (prevTrack !== null && prevTrack !== undefined) ? (prevTrack.left + prevTrack.width) : 0;
                prevTrack = track;
            });

            // 转换图片url
            for (const videoTrack of this.videoTracks) {
                const thumbNameList = await invoke('get_thumbnail', { workspace: this.currentCutTask!.folderName, thumbnail: videoTrack.thumbnail }) as string[];
                videoTrack.thumbnailList = thumbNameList.map(item => ({
                    url: convertFileSrc(item),
                    width: videoTrack.width! / thumbNameList.length,
                }));
            }
        },
        async refreshDisplayUrl() {
            const finalVideoName = localStorage.getItem("finalVideoName");
            const rootPath = await invoke("get_root_path");
            const displayUrl = `${rootPath}${this.currentCutTask!.folderName}\\final_video\\${finalVideoName}`;
            this.displayUrl = convertFileSrc(displayUrl) as string;

            // 记录视频时间
            // const currentTime = this.videoEl!.currentTime;
            // this.videoEl?.load();
            // this.videoEl!.addEventListener("loadedmetadata", () => {
            //     debugger
            //     this.videoEl!.currentTime = currentTime > this.videoEl!.duration ? this.videoEl!.duration : currentTime;
            // });
        },
        refreshVideoFrame() {
            // 获取当前视频时长
            const currentSecond = this.videoEl!.currentTime;
            // 计算单元格个数
            const unitCount = currentSecond / timeStep;
            // 计算视频帧需要在轨道上走多远
            this.videoFrameInfo.left = unitCount * unitLength;
        },
        setVideoTime(left: number) {
            // 计算时间
            this.videoEl!.currentTime = (left / unitLength) * timeStep;
        },
        async updateVideoTracks(newVideoTracks: VideoTrackInfo[]) {
            await executeDb(async db => {
                // 先删除已有的视频轨道
                await db.execute(DELETE_VIDEO_TRACK, [this.currentCutTask!.id]);

                let display = 0;
                for (const track of newVideoTracks) {
                    await db.execute(INSERT_VIDEO_TRACK, [
                        this.currentCutTask!.id,
                        track.videoName,
                        track.thumbnail,
                        track.videoTime,
                        display++,
                    ]);
                }

                // 刷新track
                await this.refreshVideoTrack();

                // 生成最终的视频
                invoke('synthesis_final_video', {
                    workspace: this.currentCutTask!.folderName,
                    videoTrackList: this.videoTracks.map(item => item.videoName),
                }).then(finalVideoName => {
                    if ("bad path" === finalVideoName) {
                        Message.error("合成视频出错");
                        return;
                    }
                    localStorage.setItem("finalVideoName", finalVideoName as string);

                    this.refreshDisplayUrl();
                });
            });
        }
    },
});
