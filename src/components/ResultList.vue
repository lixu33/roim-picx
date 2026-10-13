<template>
  <el-tabs v-model="activeName" type="border-card" class="result-tabs">
    <el-tab-pane label="预览" name="first">
      <image-item :image-list="imageList" />
    </el-tab-pane>
    <el-tab-pane label="HTML" name="second">
      <div
        class="text-xs text-slate-600 p-3 bg-slate-50 rounded-lg max-w-full overflow-auto whitespace-pre cursor-pointer hover:bg-slate-100 transition-colors duration-200"
        @click="copyLink"
      >
        {{ htmlLinks() }}
      </div>
    </el-tab-pane>
    <el-tab-pane label="Markdown" name="third">
      <div
        class="text-xs text-slate-600 p-3 bg-slate-50 rounded-lg max-w-full overflow-auto whitespace-pre cursor-pointer hover:bg-slate-100 transition-colors duration-200"
        @click="copyLink"
      >
        {{ markdownLinks() }}
      </div>
    </el-tab-pane>
    <el-tab-pane label="链接" name="fourth">
      <div
        class="text-xs text-slate-600 p-3 bg-slate-50 rounded-lg max-w-full overflow-auto whitespace-pre cursor-pointer hover:bg-slate-100 transition-colors duration-200"
        @click="copyLink"
      >
        {{ viewLinks() }}
      </div>
    </el-tab-pane>
  </el-tabs>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ImageItem from '../components/ImageItem.vue'
import type { ImgItem } from '../utils/types'
import copy from 'copy-to-clipboard'

const props = defineProps<{
  imageList: ImgItem[]
}>()

const activeName = ref('first')

const buildLinks = (render: (it: ImgItem) => string) => {
  return props.imageList.map(render).join('\n')
}
const htmlLinks = () =>
  buildLinks((it) => `<a href="${it.copyUrl}" target="_blank"><img src="${it.copyUrl}"></a>`)
const viewLinks = () =>
  buildLinks((it) => `${it.copyUrl}`)
const markdownLinks = () =>
  buildLinks((it) => `![${it.filename}](${it.copyUrl})`)

const copyLink = (event: MouseEvent) => {
  const text = (event.target as HTMLElement).innerText
  if (copy(text)) {
    ElMessage.success('链接复制成功')
  } else {
    ElMessage.error('链接复制失败')
  }
}
</script>
