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

export const timeStep = 5;

/**
 * 单位: px
 */
export const unitLength = 90;