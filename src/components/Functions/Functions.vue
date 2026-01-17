<script setup lang="ts">
import {open} from "@tauri-apps/plugin-dialog";
import {convertFileSrc, invoke} from "@tauri-apps/api/core";
import {getUUid} from '../../utils/comonUtils.ts';
import {
  executeDb,
  INSERT_CUT_TASK,
  INSERT_IMPORT_VIDEO,
  INSERT_VIDEO_TRACK,
  QUERY_CUT_TASK,
  SELECT_IMPORT_VIDEO
} from '../../utils/db.ts';
import {onMounted, ref} from "vue";
import {CutTask, ImportVideo, VideoTrackInfo} from "../../types/cutTask.ts";
import Database from "@tauri-apps/plugin-sql";
import { useCutTaskStore } from "../../store/cutTaskStore.ts";
import {Message} from "@arco-design/web-vue";


const cutTaskList = ref<CutTask[]>([]);
const importVideoList = ref<ImportVideo[]>([]);
const cutTaskStore = useCutTaskStore();

const openUploadVideo = async () => {
  const selectPath = await open({
    multiple: false,
    title: '选择视频文件',
    filters: [
      { name: '视频文件', extensions: ['mp4'] },
    ]
  });

  const importName = await invoke("import_user_video", {
    importPath: selectPath as string,
    folderName: cutTaskStore.currentCutTask!.folderName
  });
  // 插入import记录
  const selectPaths = selectPath?.split("\\") as string[];
  await executeDb(async (db: Database) => {
    await db.execute(INSERT_IMPORT_VIDEO, [
      cutTaskStore.currentCutTask!.id,
      importName,
      selectPaths[selectPaths.length - 1],
    ]);

    // 查询视频列表
    await refreshImportVideos();
  })
};

const refreshImportVideos = async () => {
  const rootPath = await invoke("get_root_path");
  await executeDb(async (db: Database) => {
    importVideoList.value = await db.select(SELECT_IMPORT_VIDEO, [cutTaskStore.currentCutTask!.id]);
    // 处理视频信息
    importVideoList.value.forEach((videoInfo: any) => {
      videoInfo.url = convertFileSrc(`${rootPath}\\${cutTaskStore.currentCutTask!.folderName}\\import\\${videoInfo.importName}`);
    });
  });
};

const addVideoInTrack = async (videoInfo: ImportVideo) => {
  // 生成当前的display
  let selectIndex = cutTaskStore.videoTracks.findIndex(item => item.select);
  if (selectIndex === -1) {
    selectIndex = 0;
  }

  const videoInfos = await invoke('add_video_in_track', {
    workspace: cutTaskStore.currentCutTask!.folderName,
    importName: videoInfo.importName,
  }) as string;

  // 数据入库
  const videoInfoArr = videoInfos.split("|");

  const addVideo: VideoTrackInfo = {
    cutTaskId: cutTaskStore.currentCutTask!.id,
    videoName: `${videoInfoArr[0]}.mp4`,
    thumbnail: String(videoInfoArr[0]),
    videoTime: Number(videoInfoArr[1]),
    display: 0
  };
  const newVideoTracks = cutTaskStore.videoTracks.slice(0);
  newVideoTracks.splice(selectIndex, 0, addVideo);

  await cutTaskStore.updateVideoTracks(newVideoTracks, selectIndex);
};

onMounted(async () => {
  // 获取所有的剪辑任务
  await executeDb(async db => {
    let cutList = await db.select(QUERY_CUT_TASK) as any;
    if (!cutList || !cutList.length) {
      // 创建一个剪辑任务
      const folderName = getUUid();
      await db.execute(INSERT_CUT_TASK, [folderName]);
      // 创建相应文件夹
      await invoke('create_cut_task_workspace', { folderName });
      cutList = await db.select(QUERY_CUT_TASK) as any;
    }

    cutTaskList.value = cutList;
    // 选择第一个当作当前的剪辑任务
    cutTaskStore.currentCutTask = cutTaskList.value[0];
    // 查询导入视频
    await refreshImportVideos();
    // 查询视频轨道
    await cutTaskStore.refreshVideoTrack();
    // 获取播放视频链接
    cutTaskStore.refreshDisplayUrl();
  });
});
</script>

<template>
  <div class="functions">
    <div class="actions">
      <a-button
        type="primary"
        shape="round"
        class="import-video"
        @click="openUploadVideo"  
      >
        导入视频
      </a-button>
      <a-button
        type="primary"
        shape="round"
        class="new-cut-task"
      >
        新建剪辑
      </a-button>
      <a-dropdown-button type="primary" shape="round">
        历史剪辑
        <template #content>
          <a-doption v-for="value in cutTaskList">{{ value.createTime }}</a-doption>
        </template>
      </a-dropdown-button>
    </div>
    <div class="import-video-list">
      <div v-for="videoInfo in importVideoList" class="import-block">
        <div class="view">
          <video
            type="video/mp4"
            :src="videoInfo.url"
          />
          <a-button
            class="add"
            type="dashed"
            shape="circle"
            size="mini"
            status="warning"
            @click="addVideoInTrack(videoInfo)"
          >
            <icon-plus />
          </a-button>
        </div>
        <div class="file-name" :title="videoInfo.originalName">{{ videoInfo.originalName }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="stylus" src="./functions.styl">

</style>