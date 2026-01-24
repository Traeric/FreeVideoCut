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
    display: 0,
    thumbnail: string,
    hasAudio?: number,
    videoTime: number, // 单位秒
    startTime: number,
    endTime: number,
    thumbnailList?: Array<{ url: string, width: number }>,
    select?: boolean,
    left?: number,
    width?: number,
    videoEl?: HTMLVideoElement,
}

export interface AudioTrackInfo {
    id?: number,
    cutTaskId: number,
    audioName: string,
    audioTime: number,
    startTime: number,
    display: number,
    left?: number,
    width?: number,
}

export interface VideoFrameInfo {
    left: number,
    timer: number,
}