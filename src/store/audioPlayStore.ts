import {defineStore} from "pinia";
import {AudioPlayInfo, AudioTrackInfo} from "../types/cutTask.ts";
import {executeDb, INSERT_AUDIO_TRACK, SELECT_AUDIO_TRACK} from "../utils/db.ts";
import Database from "@tauri-apps/plugin-sql";
import {useCutTaskStore} from "./cutTaskStore.ts";
import {getSrc, getUUid, ONE_SECOND_LENGTH} from "../utils/comonUtils.ts";
import {convertFileSrc, invoke} from "@tauri-apps/api/core";
import {useVideoPlayStore} from "./videoPlayStore.ts";

export const useAudioPlayStore = defineStore('audioPlay', {
    state() {
        return {
            audioTracks: [] as AudioTrackInfo[],
            audioPlayList: [] as AudioPlayInfo[],
            audioContext: new AudioContext(), // Web Audio上下文，全局唯一的播放上下文
            gainNode: null as GainNode | null, // 主音量节点
            activeAudioSources: [] as Array<Record<string, any>>, // 当前激活的音频源
            audioCache: {} as Record<string, any>, // 音频缓存列表
        };
    },
    actions: {
        async initAudioPlay() {
            // 先从视频中获取原生音频
            this.audioPlayList.push(...await this.fetchFromVideo());
            // 获取音频轨道
            this.audioPlayList.push(...await this.fetchFromAudioTrack());

            // 预加载加载音频片段
            await this.preloadAllFragments();
            // 初始化Web Audio混音引擎
            this.initAudioEngine();
        },
        async fetchFromAudioTrack() {
            const audioPlayList = [];
            for (const track of this.audioTracks) {
                const audioPlay = await this.createAudioPlayInfo(
                    track.trackStartTime, track.startTime, track.endTime, track.audioTime, track.audioName,
                    track.id
                );
                audioPlayList.push(audioPlay);
            }
            return audioPlayList;
        },
        async fetchFromVideo() {
            const audioPlayList = [];
            const videoPlayStore = useVideoPlayStore();
            let trackStartTime = 0;
            for (const track of videoPlayStore.videoTracks) {
                if (!track.hasAudio) {
                    trackStartTime += track.videoTime;
                    continue;
                }

                const audioPlay = await this.createAudioPlayInfo(trackStartTime, track.startTime, track.endTime, track.videoTime, track.videoName);
                trackStartTime += track.videoTime;
                audioPlayList.push(audioPlay);
            }
            return audioPlayList;
        },
        async createAudioPlayInfo(trackStartTime: number, startTime: number, endTime: number, sourceTime: number, sourceName: string, id: number = -1) {
            const audioPlay: AudioPlayInfo = {
                id: getUUid(),
                audioId: id,
                trackStartTime: trackStartTime,
                trackEndTime: trackStartTime + sourceTime,
                startTime: startTime,
                endTime: endTime,
                src: await getSrc(sourceName),
                audioName: sourceName,
            };
            return audioPlay;
        },
        async preloadAllFragments() {
            // TODO 转到Rust后台获取 以后要考虑大视频的情况
            // 预加载音频：转AudioBuffer
            for (const frag of this.audioPlayList) {
                const response = await fetch(frag.src!);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
                // 缓存音频信息
                this.audioCache[frag.audioName] = {
                    ...frag,
                    buffer: audioBuffer,
                    source: null, // 播放时动态创建AudioBufferSourceNode
                };
            }
        },
        initAudioEngine() {
            // 创建主音量节点（统一控制所有音频的音量，可做全局音量调节）
            this.gainNode = this.audioContext.createGain();
            // 全局音量
            this.gainNode.gain.value = 0.5;
            // 链接到扬声器
            this.gainNode.connect(this.audioContext.destination);
        },
        async initAudioTrack() {
            const { currentCutTask } = useCutTaskStore();
            const rootPath = await invoke('get_root_path');
            await executeDb(async (db: Database) => {
                // 获取视频轨道
                this.audioTracks = await db.select(SELECT_AUDIO_TRACK, [currentCutTask!.id]) as AudioTrackInfo[];
                this.audioTracks.sort((o1, o2) => o1.trackStartTime - o2.trackStartTime);
                // 计算轨道位置
                this.audioTracks.forEach(audio => {
                    audio.startTime = Number(audio.startTime);
                    audio.endTime = Number(audio.endTime);
                    audio.audioTime = Number(audio.audioTime);
                    audio.trackStartTime = Number(audio.trackStartTime);
                    audio.trackEndTime = audio.trackStartTime + audio.audioTime;
                    audio.left = audio.trackStartTime * ONE_SECOND_LENGTH;
                    audio.width = audio.audioTime * ONE_SECOND_LENGTH;
                    // 计算src
                    audio.src = `${convertFileSrc(`${rootPath}/${currentCutTask!.folderName}/videoTrack/${audio.audioName}`)}?id=${audio.id}`;
                    audio.select = false;
                });
            });

            // 初始化播放列表
            await this.initAudioPlay();
        },
        async addAudioTrack(addAudioTrack: AudioTrackInfo) {
            const { currentCutTask } = useCutTaskStore();
            await executeDb(async (db: Database) => {
                // 插入新的视频轨道
                await db.execute(INSERT_AUDIO_TRACK, [
                    currentCutTask!.id,
                    addAudioTrack.audioName,
                    addAudioTrack.originName,
                    addAudioTrack.audioTime,
                    addAudioTrack.startTime,
                    addAudioTrack.endTime,
                    addAudioTrack.trackStartTime,
                    addAudioTrack.display,
                ]);

                addAudioTrack.left = addAudioTrack.trackStartTime * ONE_SECOND_LENGTH;
                // 计算轨道宽度
                addAudioTrack.width = addAudioTrack.audioTime * ONE_SECOND_LENGTH;
                // 计算src
                addAudioTrack.src = await getSrc(addAudioTrack.audioName);
                addAudioTrack.select = false;
                this.audioTracks.push(addAudioTrack);
            });
        },
        playAudio(playTime: number) {
            // 获取当前激活的区域
            const activeFrags = this.getActiveFragments(playTime);
            // 停止失效的音源（片段结束播放）
            this.activeAudioSources = this.activeAudioSources.filter(source => {
                const isActive = activeFrags.some(frag => frag.id === source.id);
                if (!isActive) {
                    source.node.stop(); // 停止音频源
                    source.node.disconnect(); // 断开连接，释放资源
                }
                return isActive;
            });

            // 启动新的未激活的音频源
            for (const frag of activeFrags) {
                // 判断当前音频是否应该播放
                const isAlreadyActive = this.activeAudioSources.some(s => s.id === frag.id);
                if (isAlreadyActive) {
                    continue;
                }

                // 创建AudioBufferSourceNode
                const sourceNode = this.audioContext!.createBufferSource();
                sourceNode.buffer = this.audioCache[frag.audioName].buffer;

                // 当前音频播放的起始时间 音频在源音频上的起始位置(存在裁切) + 轨道指针在当前音频上的位置
                const startOffset = frag.startTime + Math.max(0, Math.min(playTime - frag.trackStartTime, frag.trackEndTime - frag.trackStartTime));
                // 计算视频剩余播放时长
                const playDuration = frag.trackEndTime - playTime;

                // 连接节点: source -> 主音量 -> 扬声器
                sourceNode.connect(this.gainNode!);
                // 播放音频
                sourceNode.start(this.audioContext!.currentTime, startOffset, playDuration);

                // 缓存激活的音频
                this.activeAudioSources.push({
                    id: frag.id,
                    node: sourceNode,
                });
            }
        },
        stopAudio() {
            this.activeAudioSources.forEach(source => {
                source.node.stop();
                source.node.disconnect();
            });
            this.activeAudioSources = [];
        },
        mute() {
            this.setVolume(0);
        },
        setVolume(volume: number) {
            this.gainNode!.gain.setValueAtTime(volume, this.audioContext.currentTime);
        },
        getActiveFragments(playTime: number) {
            return this.audioPlayList.filter(frag => {
                return frag.trackStartTime <= playTime && frag.trackEndTime >= playTime;
            });
        },
        getTrackMoveLimit(audio: AudioTrackInfo) {
            let startLimit = 0;
            let endLimit = Infinity;
            const currentTrackIndex = this.audioTracks.findIndex(track => track.id === audio.id);
            if (currentTrackIndex > 0) {
                const prevAudio = this.audioTracks[currentTrackIndex - 1];
                startLimit = prevAudio.trackEndTime * ONE_SECOND_LENGTH;
            }

            if (currentTrackIndex < this.audioTracks.length - 1) {
                const nextAudio = this.audioTracks[currentTrackIndex + 1];
                endLimit = (nextAudio.trackStartTime - audio.audioTime) * ONE_SECOND_LENGTH;
            }

            return [startLimit, endLimit];
        },
    },
})