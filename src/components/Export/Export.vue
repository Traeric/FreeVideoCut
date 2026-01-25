<script setup lang="ts">
import {save} from "@tauri-apps/plugin-dialog";

const props = defineProps<{
  visible: boolean
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>();

const close = () => {
  emit('update:visible', false);
};

const exportVideo = async () => {
  const filePath = await save({
    title: '请选择导出视频位置',
    defaultPath: 'test.mp4',
    filters: [{
      name: 'mp4',
      extensions: ['mp4', 'mov']
    }],
  });

  alert(filePath);
};
</script>

<template>
  <a-modal
      v-model:visible="props.visible"
      @ok="exportVideo"
      @cancel="close"
      :top="100"
      :mask-closable="false"
      :align-center="false"
  >
    <template #title>
      <div class="export-title">
        <img class="export-icon" src="../../assets/icons/dog2.svg" alt="NO IMG">
        <div>导出参数设置</div>
      </div>
    </template>
    <div class="export-body">
      <div class="item">
        <div class="title">名称</div>
        <div class="content">
          <a-input placeholder="请输入导出名称" allow-clear />
        </div>
      </div>
      <div class="item">
        <div class="title">选择导出路径</div>
        <div class="content">
          <a-input disabled placeholder="请输入选择导出路径" allow-clear />
        </div>
      </div>
      <div class="item">
        <div class="title">视频格式</div>
        <div class="content">
          <a-radio-group>
            <a-radio value="0">MP4</a-radio>
            <a-radio value="1">MOV</a-radio>
          </a-radio-group>
        </div>
      </div>
      <div class="item">
        <div class="title">时长</div>
        <div class="content">
          <a-tag color="orangered">
            <template #icon>
              <icon-video-camera />
            </template>
            00:18:13
          </a-tag>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<style scoped lang="stylus">
.export-title
  display flex
  align-items center
  gap 5px
  .export-icon
    width 32px
    height 32px
</style>