import Database from "@tauri-apps/plugin-sql";
import {invoke} from "@tauri-apps/api/core";

export const QUERY_CUT_TASK = 'SELECT id, folder_name as folderName, create_time as createTime FROM cut_task';

export const INSERT_CUT_TASK = 'INSERT INTO cut_task (folder_name) VALUES ($1)';

export const INSERT_IMPORT_VIDEO = 'INSERT INTO import_video (cut_task_id, import_name, original_name) VALUES ($1, $2, $3)';

export const SELECT_IMPORT_VIDEO = `
    SELECT id, cut_task_id as cutTaskId, import_name as importName, original_name as originalName, create_time as createTime
    FROM import_video
    WHERE cut_task_id = $1
`;

export const INSERT_VIDEO_TRACK = `
    INSERT INTO video_track (cut_task_id, video_name, thumbnail, video_time, start_time, end_time, display, has_audio)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
`;

export const INSERT_VIDEO_TRACK_WITH_ID = `
    INSERT INTO video_track (id, cut_task_id, video_name, thumbnail, video_time, start_time, end_time, display, has_audio)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
`;

export const SELECT_VIDEO_TRACK = `
    SELECT
        id, cut_task_id as cutTaskId, video_name as videoName, display, thumbnail, has_audio as hasAudio, video_time as videoTime,
        start_time as startTime, end_time as endTime
    FROM video_track
    WHERE
        cut_task_id = $1
`;

export const DELETE_VIDEO_TRACK = 'DELETE FROM video_track WHERE cut_task_id = $1';

export const UPDATE_VIDEO_HAS_AUDIO = 'UPDATE video_track SET has_audio = 0 WHERE id = $1';

export const INSERT_AUDIO_TRACK = 'INSERT INTO audio_track (cut_task_id, audio_name, audio_time, start_time, display) VALUES ($1, $2, $3, $4, $5)';

export const DELETE_AUDIO_TRACK = 'DELETE FROM audio_track WHERE cut_task_id = $1';

export const SELECT_AUDIO_TRACK = `
    SELECT
        id, cut_task_id as cutTaskId, audio_name as audioName, display, audio_time as audioTime, start_time as startTime
    FROM audio_track
    WHERE
        cut_task_id = $1
`;

export async function executeDb(executeCallback: (db: Database) => any) {
    const dbUrl = await invoke('get_db_url') as string;
    const db = await Database.load(dbUrl);
    await executeCallback(db);
    await db.close(dbUrl);
}