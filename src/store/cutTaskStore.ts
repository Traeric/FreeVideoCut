import {defineStore} from 'pinia';
import {executeDb, INSERT_CUT_TASK, QUERY_CUT_TASK, SELECT_IMPORT_VIDEO} from "../utils/db.ts";
import Database from "@tauri-apps/plugin-sql";
import {CutTask, ImportVideo} from '../types/cutTask.ts';
import {convertFileSrc, invoke} from "@tauri-apps/api/core";
import {getUUid} from "../utils/comonUtils.ts";
import {useVideoPlayStore} from "./videoPlayStore.ts";
import {Notification} from "@arco-design/web-vue";
import {useAudioPlayStore} from "./audioPlayStore.ts";


export const useCutTaskStore = defineStore('cutTask', {
    state: () => {
        return {
            cutTaskList: [] as CutTask[],
            importVideoList: [] as ImportVideo[],
            currentCutTask: null as CutTask | null,
            displayUrl: "",
            displayUrlPullTimer: null as number | null,
        };
    },
    getters: {
    },
    actions: {
        async cutTaskInit() {
            // 清除正在播放的音频/视频
            useAudioPlayStore().destroy();
            useVideoPlayStore().destroy();

            // 获取所有的剪辑任务
            await executeDb(async db => {
                let cutList = await db.select(QUERY_CUT_TASK) as any;
                if (!cutList || !cutList.length) {
                    // 创建一个剪辑任务
                    await this.addCutTask(db);
                    cutList = await db.select(QUERY_CUT_TASK) as any;
                }

                // 按照时间倒排任务
                cutList.sort((o1: any, o2: any) => o2.id - o1.id);
                this.cutTaskList = cutList;
                const cutTaskId = localStorage.getItem('cutTaskFolder') ?? cutList[0].folderName;
                await this.loadTaskInfo(cutTaskId);
            });
        },
        async loadTaskInfo(cutTaskFolder: string) {
            // 切换剪辑任务
            this.currentCutTask = this.cutTaskList.find(item => item.folderName === cutTaskFolder) ?? null;
            if (!this.currentCutTask) {
                Notification.error({
                    title: '无法加载',
                    content: `无法切换到当前剪辑任务`,
                });
                return;
            }
            localStorage.setItem('cutTaskFolder', cutTaskFolder);
            // 查询导入视频
            await this.refreshImportVideos();
            // 初始化音频轨道
            await useAudioPlayStore().initAudioTrack();
            // 查询视频轨道
            await useVideoPlayStore().refreshVideoTrack();
        },
        async addCutTask(db: Database): Promise<string> {
            const folderName = getUUid();
            await db.execute(INSERT_CUT_TASK, [folderName]);
            // 创建相应文件夹
            await invoke('create_cut_task_workspace', { folderName });
            return folderName;
        },
        createCutTask() {
            executeDb((db: Database) => {
                this.addCutTask(db).then((folderName) => {
                    // 初始化当前剪辑任务
                    localStorage.setItem('cutTaskFolder', folderName);
                    this.cutTaskInit();
                });
            })
        },
        switchCutTask(switchTask: CutTask) {
            localStorage.setItem('cutTaskFolder', switchTask.folderName);
            this.cutTaskInit();
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
    },
});
