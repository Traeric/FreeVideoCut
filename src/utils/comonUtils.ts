/**
 * 获取uuid
 */
export function getUUid() {
    const uuidV4 = crypto.randomUUID();
    return (uuidV4 as any).replaceAll("-", "");
}

export function formatTime(seconds: number): string {
    // 处理 NaN/负数（视频未加载时）
    if (isNaN(seconds) || seconds < 0) return "00:00:00";
    // 计算小时、分钟、秒
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    // 补零：确保每部分都是两位数
    return [h, m, s].map(num => num.toString().padStart(2, '0')).join(':');
}

export const TIME_STEP = 5;

/**
 * 单位: px
 */
export const UNIT_LENGTH = 90;

/**
 * 1秒中的长度
 */
export const ONE_SECOND_LENGTH = UNIT_LENGTH / TIME_STEP;

/**
 * 剪切视频最短单位
 */
export const CUT_VIDEO_MIN_LENG = 1;

/**
 * 不需要去除轨道选择框的class
 */
export const EXCEPT_CLASS_NAME = ['import-block', 'video-frame-point', 'time-track', 'track-controls', 'mx-context-menu', 'audio-clip'];

/**
 * 轨道padding
 */
export const TRACK_GAP = 3;

/**
 * 轨道间距
 */
export const TRACK_SPLIT = 2;

/**
 * 默认导出名称
 */
export const DEFAULT_EXPORT_VIDEO_NAME = 'FreeVideoCut';

export enum VideoFormatEnum {
    MP4,
    MOV
}

export const VIDEO_SUFFIX_NAME = ['mp4', 'mov'];