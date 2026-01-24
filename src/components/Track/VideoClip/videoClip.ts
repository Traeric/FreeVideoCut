import {onMounted, reactive, Ref, ref} from "vue";
import {ONE_SECOND_LENGTH, TIME_STEP, TRACK_GAP, TRACK_SPLIT, UNIT_LENGTH} from "../../../utils/comonUtils.ts";
import {convertFileSrc, invoke} from "@tauri-apps/api/core";
import {useCutTaskStore} from "../../../store/cutTaskStore.ts";

export const useVideoClip = (clip: any,
                             clipCanvasRef: Ref<HTMLCanvasElement | undefined>, emit: any) => {
    const clipWidth = ref(0);
    const trackGap = ref(TRACK_GAP);
    const trackSplit = ref(TRACK_SPLIT);
    const { currentCutTask } = useCutTaskStore();
    const videoInfo = reactive({
        width: 0,
        height: 0,
        videoThumbnailCount: 0,
        timeGap: 0,
    });
    let clipCanvasCtx: CanvasRenderingContext2D | null = null;
    const renderQueue = [] as any[];


    onMounted(async () => {
        const rootPath = await invoke('get_root_path');
        const videoSrc = `${convertFileSrc(`${rootPath}/${currentCutTask!.folderName}/videoTrack/${clip.videoName}`)}?id=${clip.id}`;
        // 加载视频
        const videoEL = document.createElement('video');
        clip.videoEl = videoEL;
        videoEL.preload = 'metadata';
        videoEL.muted = true;
        videoEL.src = videoSrc;
        videoEL.load();

        clipCanvasCtx = clipCanvasRef.value!.getContext('2d');

        // 计算视频长度
        clipWidth.value = clip.videoTime / TIME_STEP * UNIT_LENGTH - TRACK_SPLIT;

        videoEL.addEventListener('loadedmetadata', () => {
            // 计算视频长宽比
            const radio = clip.videoEl.videoWidth / clip.videoEl.videoHeight;
            // 计算视频轨道固定高度 是否多了音轨
            videoInfo.height = clip.hasAudio ? 70 : 90;
            // 视频宽度
            videoInfo.width = Math.ceil(videoInfo.height * radio);
            // 按照宽度计算当前轨道应该展示多少张图片 （视频区域：轨道宽度 - padding宽度）
            videoInfo.videoThumbnailCount = Math.ceil((clipWidth.value - 2 * trackGap.value) / videoInfo.width);
            // 计算间隔的秒数
            videoInfo.timeGap = videoInfo.width / ONE_SECOND_LENGTH;

            // 设置canvas的高度
            clipCanvasRef.value!.width = clipWidth.value - 2 * trackGap.value;
            clipCanvasRef.value!.height = videoInfo.height;

            // 渲染当前轨道
            emit('renderSingleTrack', { id: clip.id });
        });

        videoEL.addEventListener('timeupdate', renderVideoFrame);
    });

    const renderVideoTrack = (start: number, end: number) => {
        // 计算起始显示第几张图片
        const picStartNum = Math.floor(start / videoInfo.width);
        const picEndNum = Math.min(Math.ceil(end / videoInfo.width), videoInfo.videoThumbnailCount);

        console.log("start", start, end);
        console.log("pic", picStartNum, picEndNum);
        console.log("width", videoInfo.width, videoInfo.videoThumbnailCount)
        // 开始渲染
        renderQueue.length = 0;
        for (let i = picStartNum; i<= picEndNum; i++) {
            renderQueue.push({
                currentTime: Number(clip.startTime) + Math.min((i + 1) * videoInfo.timeGap, clip.videoTime),
                x: i * videoInfo.width,
            });
        }
        console.log("queue", renderQueue.length)

        if (renderQueue.length) {
            clip.videoEl.currentTime = renderQueue[0].currentTime;
        }
    };

    function renderVideoFrame() {
        const renderInfo = renderQueue.shift();
        console.log(clip.videoTime);
        clipCanvasCtx?.drawImage(
            clip.videoEl,
            renderInfo?.x, 0, videoInfo.width, videoInfo.height
        );

        // 设置下一个视频时间
        if (renderQueue.length) {
            clip.videoEl.currentTime = renderQueue[0].currentTime;
        }
    }

    return {
        clipWidth,
        renderVideoTrack,
        trackGap,
        trackSplit,
    };
};