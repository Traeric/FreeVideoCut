<script setup lang="ts">
import {open} from "@tauri-apps/plugin-dialog";
import {invoke} from "@tauri-apps/api/core";
import {executeDb, INSERT_IMPORT_VIDEO} from '../../utils/db.ts';
import {ImportVideo, VideoTrackInfo} from "../../types/cutTask.ts";
import Database from "@tauri-apps/plugin-sql";
import {useCutTaskStore} from "../../store/cutTaskStore.ts";

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
    await cutTaskStore.refreshImportVideos();
  })
};

const addVideoInTrack = async (videoInfo: ImportVideo) => {
  // 生成当前的display
  let selectIndex = cutTaskStore.videoTracks.findIndex(item => item.select);
  if (selectIndex === -1) {
    selectIndex = cutTaskStore.videoTracks.length;
  }

  invoke('add_video_in_track', {
    workspace: cutTaskStore.currentCutTask!.folderName,
    importName: videoInfo.importName,
  }).then(async (res) => {
    const videoInfoArr = res as any[];

    const addVideo: VideoTrackInfo = {
      cutTaskId: cutTaskStore.currentCutTask!.id,
      videoName: `${videoInfoArr[0]}.mp4`,
      thumbnail: String(videoInfoArr[0]),
      videoTime: Number(videoInfoArr[1]),
      startTime: 0,
      endTime: Number(videoInfoArr[1]),
      display: 0,
      hasAudio: Number(videoInfoArr[2]),
    };
    const newVideoTracks = cutTaskStore.videoTracks.slice(0);
    newVideoTracks.splice(selectIndex, 0, addVideo);

    await cutTaskStore.updateVideoTracks(newVideoTracks, selectIndex);
  });
};
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
          <a-doption v-for="value in cutTaskStore.cutTaskList">{{ value.createTime }}</a-doption>
        </template>
      </a-dropdown-button>
    </div>
    <div class="import-video-list">
      <div v-for="videoInfo in cutTaskStore.importVideoList" class="import-block">
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