import {defineStore} from "pinia";
import {VideoTrackInfo} from "../types/cutTask.ts";
import {convertFileSrc, invoke} from "@tauri-apps/api/core";
import {Message} from "@arco-design/web-vue";

export const useVideoPlayStore = defineStore('videoPlay', {
    state: () => {
        return {
            playCanvasEl: null as HTMLCanvasElement | null,
            canvasCtx: null as CanvasRenderingContext2D | null,
            currentVideo: null as VideoTrackInfo | null,
            videoTracks: [] as VideoTrackInfo[],
            currentVideoIndex: 0,
            isPlaying: false,   // 视频是否播放
            animationId: -1,
        };
    },
    actions: {
        setCanvas(canvasEl: HTMLCanvasElement) {
            this.playCanvasEl = canvasEl;
            this.canvasCtx = canvasEl.getContext('2d');
        },
        async initVideoTracks(cutStore: any) {
            const { videoTracks, currentCutTask } = cutStore;
            if (!videoTracks || !videoTracks.length) {
                return;
            }

            this.videoTracks = videoTracks;
            const rootPath = await invoke('get_root_path');
            videoTracks.forEach((track: VideoTrackInfo, index: number) => {
                track.videoEl = document.createElement('video');
                track.videoEl.src = convertFileSrc(`${rootPath}/${currentCutTask!.folderName}/videoTrack/${track.videoName}`);
                track.videoEl.preload = 'metadata';
                track.videoEl.muted = true;

                // 视频加载完成时自动设置画布尺寸(第一个)
                track.videoEl.addEventListener('loadedmetadata', () => {
                    if(index === 0) {
                        this.playCanvasEl!.width = track.videoEl!.videoWidth;
                        this.playCanvasEl!.height = track.videoEl!.videoHeight;
                    }
                });

                // 监听视频播放结束，切换到下一个视频
                track.videoEl.addEventListener('ended', () => {
                    this.playNextVideo();
                });
            });
            this.currentVideo = videoTracks[0];
            this.preloadNextVideo();
        },
        preloadNextVideo() {
            // 预加载下下个视频
            if (this.currentVideoIndex + 1 < this.videoTracks.length) {
                const nextVideo = this.videoTracks[this.currentVideoIndex + 1];
                // 触发加载
                nextVideo.videoEl!.load();
            }
        },
        renderVideoFrame() {
            // 渲染视频帧
            if (!this.isPlaying || !this.currentVideo) {
                return;
            }

            // 清除Canvas
            this.canvasCtx!.clearRect(0, 0, this.playCanvasEl!.width, this.playCanvasEl!.height);

            // 绘制当前视频帧
            this.canvasCtx!.drawImage(
                this.currentVideo.videoEl!,
                0, 0, this.playCanvasEl!.width, this.playCanvasEl!.height
            );

            // 请求下一帧渲染
            this.animationId = requestAnimationFrame(this.renderVideoFrame);
        },
        playCurrentVideo() {
            if (!this.currentVideo) {
                return;
            }

            this.isPlaying = true;
            this.currentVideo!.videoEl!.play().catch(err => {
                Message.error(`播放失败: ${err}`);
                this.isPlaying = false;
            });

            // 开始渲染循环
            this.renderVideoFrame();
        },
        pauseCurrentVideo() {
            if (!this.currentVideo) {
                return;
            }

            this.isPlaying = false;
            this.currentVideo.videoEl!.pause();

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
            // 播放新的视频
            this.playCurrentVideo();
            // 预加载下下个视频
            this.preloadNextVideo();
        },
    },
});