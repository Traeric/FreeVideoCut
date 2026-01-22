import {defineStore} from 'pinia';
import {
    DELETE_AUDIO_TRACK,
    DELETE_VIDEO_TRACK,
    executeDb,
    INSERT_AUDIO_TRACK,
    INSERT_CUT_TASK,
    INSERT_VIDEO_TRACK,
    QUERY_CUT_TASK,
    SELECT_AUDIO_TRACK,
    SELECT_IMPORT_VIDEO,
    SELECT_VIDEO_TRACK
} from "../utils/db.ts";
import Database from "@tauri-apps/plugin-sql";
import {AudioTrackInfo, CutTask, ImportVideo, VideoFrameInfo, VideoTrackInfo} from '../types/cutTask.ts';
import {convertFileSrc, invoke} from "@tauri-apps/api/core";
import {getUUid, timeStep, unitLength} from "../utils/comonUtils.ts";
import {Message} from "@arco-design/web-vue";


export const useCutTaskStore = defineStore('cutTask', {
    state: () => {
        return {
            cutTaskList: [] as CutTask[],
            importVideoList: [] as ImportVideo[],
            videoEl: null as HTMLVideoElement | null,
            videoLoading: false,
            videoTracks: [] as VideoTrackInfo[],
            audioTracks: [] as AudioTrackInfo[],
            currentCutTask: null as CutTask | null,
            displayUrl: "",
            displayUrlPullTimer: null as number | null,
            videoFrameInfo: {} as VideoFrameInfo,
            selectFrameData: {
                show: false,
                width: 0,
                left: 0,
                track: null,
                trackIndex: 0,
            } as Record<string, any>,
        };
    },
    getters: {
        /**
         * 获取所有视频轨道的缩略图集合
         *
         * @param state 当前state的变量
         */
        getVideoThumbnail: (state) => {
            let allThumbnails: any[] = [];
            for (const track of state.videoTracks) {
                const thumbnailList = track.thumbnailList! as any[];
                if (!thumbnailList || !thumbnailList.length) {
                    allThumbnails.push({
                        placeholder: true,
                        width: track.videoTime / timeStep * unitLength,
                    });
                    continue;
                }
                thumbnailList[0].first = true;
                thumbnailList[thumbnailList.length - 1].last = true;
                thumbnailList.forEach(item => item.hasAudio = track.hasAudio);
                allThumbnails = [...allThumbnails, ...thumbnailList];
            }
            return allThumbnails;
        },
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
                await this.refreshVideoTrack();
                // 获取播放视频链接
                this.refreshDisplayUrl();
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
        async refreshVideoTrack() {
            // 获取视频轨道的数据
            await executeDb(async (db: Database) => {
                // 先取消缩略图获取的定时器
                this.videoTracks.forEach(track => clearInterval(track.thumbnailGetTimer));
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
                let count = 0;
                videoTrack.thumbnailGetTimer = setInterval(async () => {
                    const thumbNameList = await invoke('get_thumbnail', { workspace: this.currentCutTask!.folderName, thumbnail: videoTrack.thumbnail }) as string[];
                    if (thumbNameList.length === videoTrack.thumbnailList?.length) {
                        if (count > 5) {
                            clearInterval(videoTrack.thumbnailGetTimer);
                            return;
                        }
                        count++;
                        return;
                    }

                    videoTrack.thumbnailList = thumbNameList.map(item => ({
                        url: convertFileSrc(item),
                        width: videoTrack.width! / thumbNameList.length,
                    }));
                    count = 0;
                }, 50);
            }
        },
        refreshDisplayUrl() {
            this.videoLoading = true;
            this.displayUrlPullTimer = setInterval(() => {
                const finalVideoName = localStorage.getItem("finalVideoName");
                invoke("get_final_video_path", {
                    workspace: this.currentCutTask!.folderName,
                    videoName: finalVideoName,
                }).then((res) => {
                    const url = res as string;
                    if (this.displayUrlPullTimer && url) {
                        clearInterval(this.displayUrlPullTimer);
                        this.displayUrlPullTimer = null;

                        this.displayUrl = convertFileSrc(url) as string;
                        this.videoLoading = false;
                    }
                });
            }, 200);
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
        async updateVideoTracks(newVideoTracks: VideoTrackInfo[], selectIndex: number = -1) {
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
                        track.hasAudio,
                    ]);
                }

                // 刷新track
                await this.refreshVideoTrack();
                this.setSelectFrameData(selectIndex);

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
                    audio.left = (audio.startTime / timeStep) * unitLength;
                    audio.width = (audio.audioTime / timeStep) * unitLength;
                });
            });
        },
        setSelectFrameData(selectTrackIndex: number) {
            if (selectTrackIndex === -1) {
                this.removeSelectFrame();
                return;
            }

            const selectTrack = this.videoTracks[selectTrackIndex];
            // 标记当前轨道被选中
            this.videoTracks.forEach(track => track.select = false);
            selectTrack.select = true;

            this.selectFrameData.show = true;
            this.selectFrameData.left = selectTrack.left!;
            this.selectFrameData.width = selectTrack.width!;
            this.selectFrameData.track = selectTrack;
            this.selectFrameData.trackIndex = selectTrackIndex;
        },
        removeSelectFrame() {
            this.videoTracks.forEach(track => track.select = false);
            this.selectFrameData.show = false;
            this.selectFrameData.left = 0;
            this.selectFrameData.width = 0;
            this.selectFrameData.track = null;
            this.selectFrameData.trackIndex = -1;
        }
    },
});
