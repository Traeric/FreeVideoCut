export interface CutTask {
    id: number,
    folderName: string,
    createTime: string,
}

export interface ImportVideo {
    id: number,
    cutTaskId: number,
    importName: string,
    originalName: string,
    createTime: string,
    url?: string,
}

export interface VideoTrackInfo {
    id?: number,
    cutTaskId: number,
    videoName: string,
    display: number,
    thumbnail: string,
    hasAudio?: number,
    videoTime: number, // 单位秒
    originName: string,
    startTime: number,
    endTime: number,
    thumbnailList?: Array<{ url: string, width: number }>,
    select?: boolean,
    left?: number,
    width?: number,
    videoEl?: HTMLVideoElement,
    trackStartTime?: number,
}

export interface AudioTrackInfo {
    id?: number,
    cutTaskId: number,
    audioName: string,
    originName: string,
    audioTime: number,
    startTime: number,
    display: number,
    left?: number,
    width?: number,
    src?: string,
    select?: boolean,
}

export interface AudioPlayInfo {
    id: string,

    /**
     * 音频在轨道上的起始位置
     */
    trackStartTime: number;

    /**
     * 音频在轨道上的结束位置
     */
    trackEndTime: number;

    /**
     * 当前音轨在源音频的起始位置
     */
    startTime: number;

    /**
     * 当前音轨在源音频的结束位置
     */
    endTime: number;

    /**
     * 音频链接
     */
    src: string;

    audioName: string;
}

export interface VideoFrameInfo {
    left: number,
    timer: number,
}