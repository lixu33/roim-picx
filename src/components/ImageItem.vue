<template>
  <div class="mt-4 panel p-4" v-for="it in imageList" :key="it.key">
    <div class="text-sm text-slate-600 font-medium mb-3 truncate">{{ it.filename }}</div>
    <div class="lg:flex items-start gap-5">
      <el-image
        class="block w-40 h-40 rounded-lg bg-slate-100 shrink-0 mb-3 lg:mb-0 mx-auto"
        :src="it.url"
        fit="cover"
        hide-on-click-modal
        lazy
        :preview-src-list="[it.url]"
      />
      <div class="flex-1 w-full min-w-0">
        <div class="w-full mb-3" v-for="f in linkFields(it)" :key="f.label">
          <label class="block text-xs font-medium text-slate-500 mb-1">{{ f.label }}</label>
          <input
            :value="f.value"
            readonly
            :placeholder="f.label"
            class="cursor-pointer w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 transition-colors duration-200 hover:border-indigo-300 focus:outline-none focus:border-indigo-400"
            @click="copyLink(f.value)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ImgItem } from '../utils/types'
import copy from 'copy-to-clipboard'

const props = defineProps<{
  imageList: ImgItem[]
}>()

const markdownLink = (link?: string, filename?: string) => {
  return `![${filename}](${link})`
}
const htmlLink = (link?: string, filename?: string) => {
  return `<a href="${link}" target="_blank" title="${filename}"><img src="${link}"></a>`
}

const linkFields = (it: ImgItem) => [
  { label: 'HTML', value: htmlLink(it.copyUrl, it.filename) },
  { label: 'Markdown', value: markdownLink(it.copyUrl, it.filename) },
  { label: 'LINK', value: it.copyUrl || '' }
]

const copyLink = (value: string) => {
  if (!value) return
  if (copy(value)) {
    ElMessage.success('链接复制成功')
  } else {
    ElMessage.error('链接复制失败')
  }
}
</script>
