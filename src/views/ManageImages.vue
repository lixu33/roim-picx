<template>
	<div class="mx-auto max-w-6xl my-4 px-4 relative">
		<loading-overlay :loading="loading" />

		<div class="flex items-start justify-between mb-4 gap-3">
			<div>
				<div class="text-slate-800 text-lg font-semibold">管理图片</div>
				<div class="text-sm text-slate-500">
					当前目录已加载 {{ uploadedImages.length }} 张，共 {{ formatBytes(imagesTotalSize) }}
				</div>
			</div>
			<div class="flex items-center gap-2">
				<button class="icon-btn" title="新增目录" @click="addFolder">
					<font-awesome-icon :icon="faFolderPlus" />
				</button>
				<button class="icon-btn" title="刷新" :class="{ 'area-disabled': loading }" @click="refresh">
					<font-awesome-icon :icon="faRedoAlt" />
				</button>
			</div>
		</div>

		<div class="mb-4 flex items-center flex-wrap gap-2">
			<button
				v-for="it in prefixes"
				:key="it"
				class="px-3 py-1.5 inline-flex items-center gap-2 rounded-lg border text-sm transition-colors duration-200 cursor-pointer"
				:class="it === delimiter
					? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
					: 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'"
				@click="changeFolder(it)"
			>
				<font-awesome-icon :icon="faFolder" />
				<span>{{ it === '/' ? '/' : it.replace('/', '') }}</span>
			</button>
		</div>

		<div v-if="!loading && !uploadedImages.length" class="py-20 text-center text-slate-400 text-sm">
			当前目录还没有图片
		</div>

		<div class="grid gap-3 lg:gap-4 lg:grid-cols-4 grid-cols-2">
			<transition-group name="el-fade-in-linear">
				<div
					class="col-span-1"
					v-for="item in uploadedImages"
					:key="item.url"
				>
					<image-box
						:src="item.url"
						:copyUrl="item.copyUrl"
						:name="item.key"
						:size="item.size"
						@delete="deleteImage(item.key)"
						mode="uploaded"
					/>
				</div>
			</transition-group>
		</div>

		<div v-if="hasMore" class="mt-6 flex justify-center">
			<button
				class="h-10 px-5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm cursor-pointer transition-colors duration-200 hover:border-indigo-300 hover:text-indigo-500"
				:class="{ 'area-disabled': loading }"
				@click="loadMore"
			>加载更多</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { requestListImages, requestDeleteImage, createFolder } from '../utils/request'
import LoadingOverlay from '../components/LoadingOverlay.vue'
import formatBytes from '../utils/format-bytes'
import { computed, onMounted, ref } from 'vue'
import type { ImgItem, ImgReq, Folder } from '../utils/types'
import ImageBox from '../components/ImageBox.vue'
import { faRedoAlt, faFolder, faFolderPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

const loading = ref(false)
const delimiter = ref('/')
const uploadedImages = ref<ImgItem[]>([])
const prefixes = ref<String[]>([])
const cursor = ref<string | undefined>()
const hasMore = ref(false)
const imagesTotalSize = computed(() =>
	uploadedImages.value.reduce((total, item) => total + item.size, 0)
)

const changeFolder = (path: string) => {
	if (path === delimiter.value) return
	delimiter.value = path
	listImages()
}

const addFolder = () => {
	ElMessageBox.prompt('请输入目录名称，仅支持英文字母与下划线', '新增目录', {
		confirmButtonText: '创建',
		cancelButtonText: '取消',
		inputPattern: /^[A-Za-z_]+$/,
		inputErrorMessage: '无效的目录名称',
	}).then(({ value }) => {
		loading.value = true
		createFolder(<Folder>{
			name: value
		}).then(() => {
			ElMessage.success('目录创建成功')
			listImages()
		}).catch(() => {
			ElMessage.error('目录创建失败')
		}).finally(() => {
			loading.value = false
		})
	}).catch(() => { })
}

// append=true 时把下一页追加到现有列表（R2 的 cursor 分页）
const listImages = (append = false, nextCursor?: string) => {
	loading.value = true
	requestListImages(<ImgReq>{
		limit: 100,
		delimiter: delimiter.value,
		cursor: nextCursor
	}).then((data) => {
		uploadedImages.value = append ? [...uploadedImages.value, ...data.list] : data.list
		hasMore.value = !!data.next
		cursor.value = data.cursor
		if (!append) {
			if (data.prefixes && data.prefixes.length) {
				prefixes.value = delimiter.value === '/' ? data.prefixes : ['/', ...data.prefixes]
			} else {
				prefixes.value = ['/']
			}
		}
	}).catch(() => { })
		.finally(() => {
			loading.value = false
		})
}

const loadMore = () => {
	if (cursor.value) {
		listImages(true, cursor.value)
	}
}

const refresh = () => listImages()

onMounted(() => {
	listImages()
})

const deleteImage = (src: string) => {
	requestDeleteImage({
		keys: src
	}).then((res) => {
		uploadedImages.value = uploadedImages.value.filter((item) => item.key !== res)
	})
}
</script>
