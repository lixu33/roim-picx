<template>
	<div class="mx-auto max-w-6xl my-4 px-4">
		<div class="mb-4">
			<div class="text-slate-800 text-lg font-semibold">上传图片</div>
			<div class="text-sm text-slate-500">
				每张图片大小不超过 {{ formatBytes(imageSizeLimit) }}，支持拖拽、粘贴与剪切板
			</div>
		</div>

		<div
			class="relative rounded-xl border-2 border-dashed border-slate-300 bg-white/60 transition-colors duration-200"
			:class="{ 'border-indigo-400 bg-indigo-50/40': dragging }"
			@drop.prevent="onFileDrop"
			@dragenter.prevent="dragging = true"
			@dragover.prevent="dragging = true"
			@dragleave.prevent="dragging = false"
		>
			<loading-overlay :loading="loading" />

			<div class="grid p-4 gap-4 grid-cols-2 md:grid-cols-4 min-h-[240px]">
				<div
					v-if="convertedImages.length === 0"
					class="pointer-events-none absolute left-0 top-0 w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2"
				>
					<font-awesome-icon :icon="faImage" class="text-3xl" />
					<span class="text-sm">粘贴或拖动图片至此处</span>
				</div>

				<transition-group name="el-fade-in-linear">
					<div class="col-span-1" v-for="item in convertedImages" :key="item.tmpSrc">
						<image-box :src="item.tmpSrc" :size="item.file.size" :name="item.file.name"
							@delete="removeImage(item.tmpSrc)" mode="converted" />
					</div>
				</transition-group>
			</div>
		</div>

		<div
			class="w-full rounded-xl shadow-sm border border-slate-100 bg-white overflow-hidden mt-4 p-3 flex flex-col md:flex-row md:items-center md:flex-wrap gap-2"
		>
			<button
				class="action-btn bg-indigo-500 hover:bg-indigo-600 w-full md:w-auto justify-center"
				:class="{ 'area-disabled': loading }"
				@click="input?.click()"
			>
				<font-awesome-icon :icon="faImages" />
				选择图片
			</button>

			<div
				class="order-3 md:order-none text-xs md:text-sm text-slate-500 px-2 text-center md:text-left md:flex-1 md:min-w-[8rem]"
			>
				已选择 {{ convertedImages.length }} 张，共 {{ formatBytes(imagesTotalSize) }}
			</div>

			<div class="grid grid-cols-3 gap-2 md:flex md:items-center md:gap-2">
				<button
					class="action-btn bg-slate-400 hover:bg-slate-500 w-full md:w-auto justify-center"
					:class="{ 'area-disabled': loading }"
					@click="clearInput"
				>
					<font-awesome-icon :icon="faTrashAlt" />
					清除
				</button>

				<button
					class="action-btn bg-sky-500 hover:bg-sky-600 w-full md:w-auto justify-center"
					:class="{ 'area-disabled': loading }"
					@click="clipboardUpload"
				>
					<font-awesome-icon :icon="faPaste" />
					上传剪切板
				</button>

				<button
					class="action-btn bg-emerald-500 hover:bg-emerald-600 w-full md:w-auto justify-center"
					:class="{ 'area-disabled': convertedImages.length === 0 || loading }"
					@click="uploadImages"
				>
					<font-awesome-icon :icon="faUpload" />
					上传
				</button>
			</div>
		</div>

		<result-list v-show="imgResultList && imgResultList.length" :image-list="imgResultList" ref="resultList"
			class="mt-4" />
	</div>

	<input ref="input" type="file" accept="image/*" class="hidden" multiple @change="onInputChange" />
</template>

<script setup lang="ts">
import { faImages, faTrashAlt, faImage } from '@fortawesome/free-regular-svg-icons'
import { faUpload, faPaste } from '@fortawesome/free-solid-svg-icons'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { pngToLosslessWebp } from '../utils/webp'
import LoadingOverlay from '../components/LoadingOverlay.vue'
import formatBytes from '../utils/format-bytes'
import { requestUploadImages } from '../utils/request'
import ImageBox from '../components/ImageBox.vue'
import ResultList from '../components/ResultList.vue'
import type { ConvertedImage, ImgItem } from '../utils/types'

const convertedImages = ref<ConvertedImage[]>([])
const imgResultList = ref<ImgItem[]>([])
const dragging = ref(false)
const imagesTotalSize = computed(() =>
	convertedImages.value.reduce((total, item) => total + item.file.size, 0)
)

const imageSizeLimit = 20 * 1024 * 1024
const input = ref<HTMLInputElement>()
const loading = ref(false)

const onInputChange = () => {
	appendConvertedImages(input.value?.files)
	// 重置 value，否则连续选择同一批文件不会触发 change
	if (input.value) input.value.value = ''
}
const onFileDrop = (e: DragEvent) => {
	dragging.value = false
	appendConvertedImages(e.dataTransfer?.files)
}
const onPaste = (e: ClipboardEvent) => {
	appendConvertedImages(e.clipboardData?.files)
}

onMounted(() => {
	document.onpaste = onPaste
})

onUnmounted(() => {
	document.onpaste = null
	convertedImages.value.forEach((item) => URL.revokeObjectURL(item.tmpSrc))
})

const clearInput = () => {
	convertedImages.value.forEach((item) => URL.revokeObjectURL(item.tmpSrc))
	convertedImages.value = []
	imgResultList.value = []
}

const clipboardUpload = () => {
	if (!navigator.clipboard || !navigator.clipboard.read) {
		ElMessage.warning('当前环境不支持读取剪切板')
		return
	}
	navigator.clipboard.read().then(clipboardContents => {
		for (const item of clipboardContents) {
			if (item.types.includes("image/png")) {
				item.getType("image/png").then(blob => {
					const file = new File([blob], "clipboard.png", {
						type: "image/png",
					});
					convertedImages.value = [
						...convertedImages.value,
						{
							file,
							tmpSrc: URL.createObjectURL(file)
						}
					]
				});
			} else {
				ElMessage({
					message: '剪切板中不是图片！',
					type: 'warning',
				})
			}
		}
	}).catch(() => {
		ElMessage.warning('读取剪切板失败，请检查浏览器权限')
	});
}

const appendConvertedImages = async (files: FileList | null | undefined) => {
	if (!files || !files.length) return

	loading.value = true
	for (let i = 0; i < files.length; i++) {
		const file = files.item(i)
		if (!file) continue
		if (file.size > imageSizeLimit) {
			ElNotification({
				message: `${file.name} 文件过大`,
				type: 'error'
			})
			continue
		}

		if (!file.type.startsWith('image/')) {
			ElNotification({
				message: `${file.name} 不是图片文件`,
				type: 'error'
			})
			continue
		}

		// PNG 先无损转 WebP（wasm 像素级一致），失败或转完更大则保留原文件
		let uploadFile: File = file
		if (file.type === 'image/png') {
			const converted = await pngToLosslessWebp(file)
			if (converted) {
				uploadFile = converted
				ElNotification({
					message: `${file.name} 无损转 WebP：${formatBytes(file.size)} → ${formatBytes(converted.size)}`,
					type: 'success'
				})
			}
		}

		convertedImages.value = [
			...convertedImages.value,
			{
				file: uploadFile,
				tmpSrc: URL.createObjectURL(uploadFile)
			}
		]
	}
	loading.value = false
}

const removeImage = (tmpSrc: string) => {
	convertedImages.value = convertedImages.value.filter((item) => item.tmpSrc !== tmpSrc)
	URL.revokeObjectURL(tmpSrc)
}

const uploadImages = () => {
	loading.value = true

	const formData = new FormData()
	for (let item of convertedImages.value) {
		formData.append('files', item.file)
	}
	const count = convertedImages.value.length
	const totalSize = imagesTotalSize.value

	requestUploadImages(formData)
		.then((res) => {
			ElNotification({
				title: '上传完成',
				message: `共 ${count} 张图片，${formatBytes(totalSize)}`,
				type: 'success'
			})
			clearInput()
			imgResultList.value = res
		})
		.catch(() => { })
		.finally(() => {
			loading.value = false
		})
}
</script>
