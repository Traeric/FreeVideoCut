<script setup lang="ts">
import {save} from "@tauri-apps/plugin-dialog";
import {reactive} from "vue";
import {DEFAULT_EXPORT_VIDEO_NAME, VIDEO_SUFFIX_NAME, VideoFormatEnum} from "../../utils/comonUtils.ts";

const props = defineProps<{
  visible: boolean
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>();

const videoFrom = reactive({
  name: `${DEFAULT_EXPORT_VIDEO_NAME}.mp4`,
  exportPath: '',
  videoFormat: VideoFormatEnum.MP4,
});

const close = () => {
  emit('update:visible', false);
};

const videoFormatChange = (format: VideoFormatEnum) => {
  // 重新生成导出名称
  videoFrom.name = `${DEFAULT_EXPORT_VIDEO_NAME}.${VIDEO_SUFFIX_NAME[format]}`;
  videoFrom.exportPath = '';
};

const exportVideo = async () => {
  const filePath = await save({
    title: '请选择导出视频位置',
    defaultPath: videoFrom.name,
    filters: [{
      name: 'mp4',
      extensions: ['mp4', 'mov']
    }],
  });

  if (!filePath) {
    return;
  }
  videoFrom.exportPath = filePath;
};
</script>

<template>
  <a-modal
      v-model:visible="props.visible"
      @ok=""
      @cancel="close"
      :top="100"
      :mask-closable="false"
      :align-center="false"
      :hide-title="true"
      :ok-button-props="{
        status: 'warning',
      }"
      ok-text="导出视频"
  >
    <div class="export-title">
      <img class="export-icon" src="../../assets/icons/dog2.svg" alt="NO IMG">
      <div class="title-txt">导出参数设置</div>
    </div>
    <div class="export-body">
      <a-form :model="videoFrom" label-align="left">
        <a-form-item field="name" label="导出名称">
          <a-input v-model="videoFrom.name" placeholder="请输入导出名称" allow-clear />
        </a-form-item>
        <a-form-item field="exportPath" label="选择导出路径">
          <a-input disabled v-model="videoFrom.exportPath" placeholder="请输入选择导出路径" allow-clear>
            <template #append>
              <div class="export-path-select" @click="exportVideo">
                <img class="export-icon" src="../../assets/icons/export.svg" alt="NO IMG">
              </div>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item field="exportPath" label="视频格式">
          <a-select v-model="videoFrom.videoFormat" @change="videoFormatChange">
            <a-option :value="0">MP4</a-option>
            <a-option :value="1">MOV</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="时长">
          <a-tag color="orangered">
            <template #icon>
              <icon-video-camera />
            </template>
            00:18:13
          </a-tag>
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>

<style scoped lang="stylus">
.export-title
  display flex
  align-items flex-end
  gap 5px
  margin-bottom 20px
  .export-icon
    width 28px
    height 28px
  .title-txt
    margin-bottom -3px
.export-body
  :deep(.arco-input-append)
    padding 0
    overflow hidden
  .export-path-select
    width 100%
    height 100%
    background-color #ff9626
    cursor pointer
    padding 0 12px
    display flex
    align-items center
    justify-content center
    .export-icon
      width 28px
      height 28px
</style>