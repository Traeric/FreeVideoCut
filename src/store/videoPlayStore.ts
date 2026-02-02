import {defineStore} from "pinia";
import {VideoFrameInfo, VideoTrackInfo} from "../types/cutTask.ts";
import {convertFileSrc, invoke} from "@tauri-apps/api/core";
import {Message} from "@arco-design/web-vue";
import {TIME_STEP, UNIT_LENGTH} from "../utils/comonUtils.ts";
import {
    DELETE_VIDEO_TRACK,
    executeDb,
    INSERT_VIDEO_TRACK,
    INSERT_VIDEO_TRACK_WITH_ID,
    SELECT_VIDEO_TRACK
} from "../utils/db.ts";
import Database from "@tauri-apps/plugin-sql";
import {useCutTaskStore} from "./cutTaskStore.ts";
import {useAudioPlayStore} from "./audioPlayStore.ts";

export const useVideoPlayStore = defineStore('videoPlay', {
    state: () => {
        return {
            playCanvasEl: null as HTMLCanvasElement | null,
            progressLineEl: null as HTMLDivElement | null,
            progressLineRect: null as DOMRect | null,
            canvasCtx: null as CanvasRenderingContext2D | null,
            currentVideo: null as VideoTrackInfo | null,
            videoTracks: [] as VideoTrackInfo[],
            currentVideoIndex: 0,
            isPlaying: false,   // 视频是否播放
            animationId: -1,
            videoTotalTime: 0,  // 视频总时长
            videoCurrentTime: 0, // 当前视频时长
            currentTimeSnapshot: 0, // 当前时间快照，用于作为参照，在播放中计算当前时间走了多久
            progressRate: 0,
            progressDotLeft: 0,
            lastStatisticsProgressTime: Date.now(),
            videoFrameInfo: {} as VideoFrameInfo, // 剪辑轨道时间指针
        };
    },
    getters: {

    },
    actions: {
        init(canvasEl: HTMLCanvasElement, progressLineEl: HTMLDivElement) {
            this.setCanvas(canvasEl);
            this.progressLineEl = progressLineEl;
            this.progressLineRect = progressLineEl.getBoundingClientRect();
            document.addEventListener("resize", () => {
                this.progressLineRect = progressLineEl.getBoundingClientRect();
            });
        },
        setCanvas(canvasEl: HTMLCanvasElement) {
            this.playCanvasEl = canvasEl;
            this.canvasCtx = canvasEl.getContext('2d');
        },
        async initVideoTracks() {
            const { currentCutTask } = useCutTaskStore();
            if (!this.videoTracks || !this.videoTracks.length) {
                return;
            }

            const rootPath = await invoke('get_root_path');
            this.videoTracks.forEach((track: VideoTrackInfo) => {
                const videoSrc = convertFileSrc(`${rootPath}/${currentCutTask!.folderName}/videoTrack/${track.videoName}`);
                track.videoEl = document.createElement('video');
                track.videoEl.src = videoSrc;
                track.videoEl.preload = 'metadata';
                track.videoEl.muted = true;
            });

            this.isPlaying = false;
            this.currentVideo = this.videoTracks[0];
            this.preloadNextVideo();
            this.videoTotalTime = this.getTotalTime();
            // 设置视频当前时间
            this.movePointVideo(this.videoTotalTime < this.videoCurrentTime ? this.videoTotalTime : this.videoCurrentTime);
        },
        getTotalTime() {
            let totalTime = 0;
            for (const track of this.videoTracks) {
                totalTime += track.endTime - track.startTime;
            }
            return totalTime;
        },
        preloadNextVideo() {
            // 预加载下下个视频
            if (this.currentVideoIndex + 1 < this.videoTracks.length) {
                const nextVideo = this.videoTracks[this.currentVideoIndex + 1];
                // 视频轨道中可能存在切分过的轨道，两个轨道会用同一个视频文件，如果下一个轨道的视频文件名和当前一致则不需要再加载了
                if (nextVideo.videoName !== this.currentVideo!.videoName) {
                    // 触发加载
                    nextVideo.videoEl!.load();
                }
            }
        },
        renderVideoFrame() {
            // 渲染视频帧
            if (!this.isPlaying || !this.currentVideo) {
                return;
            }

            // 当前时间
            const curTime = Date.now();
            this.videoCurrentTime += (curTime - this.currentTimeSnapshot) / 1000;
            this.videoCurrentTime = Math.min(this.videoTotalTime, this.videoCurrentTime);
            this.currentTimeSnapshot = curTime

            // 计算视频进度相关 10ms一次
            if (Date.now() - this.lastStatisticsProgressTime > 10) {
                this.lastStatisticsProgressTime = Date.now();
                this.calcProgress();
            }

            // 渲染视频画面
            this.renderSingleFrame();
            // 播放音频
            useAudioPlayStore().playAudio(this.videoCurrentTime);

            // 判断是否需要进入到下一个视频 可能存在剪切的视频，需要提前从剪切的地方结束
            const currentVideoTime = this.currentVideo.videoEl!.currentTime;
            if (currentVideoTime >= this.currentVideo.endTime || currentVideoTime >= this.currentVideo.videoEl!.duration) {
                this.playNextVideo();
            }

            // 请求下一帧渲染
            this.animationId = requestAnimationFrame(this.renderVideoFrame);
        },
        playCurrentVideo() {
            if (!this.videoTracks.length) {
                return;
            }

            if (!this.currentVideo) {
                this.currentVideo = this.videoTracks[0];
                this.currentVideoIndex = 0;
                this.currentVideo!.videoEl!.currentTime = 0;
            }

            this.isPlaying = true;
            this.currentTimeSnapshot = Date.now();
            this.currentVideo!.videoEl!.play().catch(err => {
                Message.error(`播放失败: ${err}`);
                this.isPlaying = false;
            });
            // 当前视频初始播放
            if (this.currentVideo.videoEl!.currentTime <= this.currentVideo.startTime) {
                // 存在切分的视频 需要从指定位置开始播放 前面的内容为切分后的
                this.currentVideo!.videoEl!.currentTime = this.currentVideo.startTime;
            }

            // 开始渲染循环
            this.renderVideoFrame();
        },
        calcProgress() {
            // 计算进度条位置
            this.progressRate = this.videoCurrentTime / this.videoTotalTime;
            this.progressDotLeft = this.progressLineRect!.width * this.progressRate;

            // 计算剪辑轨道时间帧的信息
            this.videoFrameInfo.left = this.videoCurrentTime / TIME_STEP * UNIT_LENGTH;
        },
        pauseCurrentVideo() {
            if (!this.videoTracks.length || !this.currentVideo) {
                return;
            }

            this.isPlaying = false;
            this.currentVideo.videoEl!.pause();
            useAudioPlayStore().stopAudio();

            // 取消动画帧请求
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = -1;
            }
        },
        playNextVideo() {
            // 暂停当前视频
            this.pauseCurrentVideo();
            // 更新索引
            this.currentVideoIndex++;
            // 已播放完毕所有视频
            if (this.currentVideoIndex >= this.videoTracks.length) {
                this.currentVideo = null;
                this.isPlaying = false;
                return;
            }

            // 切换到下一个视频
            this.currentVideo = this.videoTracks[this.currentVideoIndex];
            this.currentVideo!.videoEl!.currentTime = 0;
            // 播放新的视频
            this.playCurrentVideo();
            // 预加载下下个视频
            this.preloadNextVideo();
        },
        movePointVideo(second: number) {
            // 当前时间
            this.videoCurrentTime = second;
            this.currentTimeSnapshot = Date.now();
            this.calcProgress();
            let currentTime = second;
            for (let i = 0; i < this.videoTracks!.length; i++) {
                const track = this.videoTracks[i];
                if (currentTime <= track.videoTime) {
                    this.currentVideo = track;
                    this.currentVideoIndex = i;
                    break;
                }

                // 不是当前视频 扣除当前视频的时间
                currentTime -= track.videoTime;
            }

            // 设置视频时间 需要注意加上前面裁剪掉的时间
            this.currentVideo!.videoEl!.currentTime = this.currentVideo!.startTime + currentTime;

            // 渲染当前帧
            const renderFrame = () => {
                this.renderSingleFrame();

                // 监听一次即可
                this.currentVideo!.videoEl!.removeEventListener('timeupdate', renderFrame);
            };

            this.currentVideo!.videoEl!.addEventListener('timeupdate', renderFrame);
        },
        renderSingleFrame() {
            // 清除Canvas画面
            this.canvasCtx!.clearRect(0, 0, this.playCanvasEl!.width, this.playCanvasEl!.height);

            // 绘制当前视频帧
            this.playCanvasEl!.width = this.currentVideo!.videoEl!.videoWidth;
            this.playCanvasEl!.height = this.currentVideo!.videoEl!.videoHeight;
            this.canvasCtx!.drawImage(
                this.currentVideo!.videoEl!,
                0, 0, this.playCanvasEl!.width, this.playCanvasEl!.height
            );
        },
        async refreshVideoTrack() {
            const { currentCutTask } = useCutTaskStore();
            // 获取视频轨道的数据
            await executeDb(async (db: Database) => {
                this.videoTracks = await db.select(SELECT_VIDEO_TRACK, [currentCutTask!.id]) as VideoTrackInfo[];
            });

            // 轨道排序
            this.videoTracks.sort((o1, o2) => o1.display - o2.display);

            // 计算每个轨道的位置信息
            let prevTrack: VideoTrackInfo | null = null;
            this.videoTracks.forEach(track => {
                track.width = track.videoTime * (UNIT_LENGTH / TIME_STEP);
                track.left = (prevTrack !== null && prevTrack !== undefined) ? (prevTrack.left! + prevTrack.width!) : 0;

                track.videoTime = Number(track.videoTime);
                track.startTime = Number(track.startTime);
                track.endTime = Number(track.endTime);
                track.trackStartTime = prevTrack ? (prevTrack.trackStartTime! + prevTrack.videoTime) : 0;
                prevTrack = track;
            });

            // 给每个视频绑定video标签
            await useVideoPlayStore().initVideoTracks();
            // 初始化音频
            await useAudioPlayStore().initAudioPlay();
        },
        async updateVideoTracks(newVideoTracks: VideoTrackInfo[], selectIndex: number = -1) {
            const { currentCutTask } = useCutTaskStore();
            await executeDb(async db => {
                // 先删除已有的视频轨道
                await db.execute(DELETE_VIDEO_TRACK, [currentCutTask!.id]);

                let display = 0;
                for (const track of newVideoTracks) {
                    if (track.id) {
                        await db.execute(INSERT_VIDEO_TRACK_WITH_ID, [
                            track.id,
                            currentCutTask!.id,
                            track.videoName,
                            track.thumbnail,
                            track.videoTime,
                            track.startTime,
                            track.endTime,
                            display++,
                            track.hasAudio,
                            track.originName,
                        ]);
                    } else {
                        await db.execute(INSERT_VIDEO_TRACK, [
                            currentCutTask!.id,
                            track.videoName,
                            track.thumbnail,
                            track.videoTime,
                            track.startTime,
                            track.endTime,
                            display++,
                            track.hasAudio,
                            track.originName,
                        ]);
                    }
                }

                // 刷新track
                await this.refreshVideoTrack();
                // 选中track
                if (this.videoTracks[selectIndex]) {
                    this.videoTracks[selectIndex].select = true;
                }
            });
        },
    },
});