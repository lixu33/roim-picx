<template>
	<div class="group w-full bg-slate-100 rounded-xl shadow-sm overflow-hidden relative border border-slate-100">
		<loading-overlay :loading="loading" />

		<el-image
			class="block w-full h-40 lg:h-56 bg-slate-100 cursor-zoom-in"
			:src="src"
			fit="cover"
			lazy
			hide-on-click-modal
			preview-teleported
			:preview-src-list="previewSrcList"
			:initial-index="previewIndex"
			@load="loading = false"
			@error="onError"
		>
			<template #error>
				<div class="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1">
					<font-awesome-icon :icon="faImage" class="text-2xl" />
					<span class="text-xs">加载失败</span>
				</div>
			</template>
		</el-image>

		<div class="w-full absolute left-0 bottom-0 bg-slate-900/70 backdrop-blur-sm">
			<div class="p-2">
				<div class="w-full flex items-center text-white">
					<div class="flex-1 w-full truncate text-sm">
						<el-tooltip :content="name" placement="top-start">
							<span>{{ name }}</span>
						</el-tooltip>
					</div>
					<div
						v-if="mode === 'converted'"
						class="w-6 h-6 flex items-center justify-center cursor-pointer hover:text-rose-300 transition-colors duration-200"
						@click="emit('delete')"
					>
						<font-awesome-icon :icon="faTimesCircle" />
					</div>
				</div>
				<span class="text-xs text-slate-300 flex items-center">
					{{ formatBytes(size) }}
					<el-divider v-if="uploadedAt" direction="vertical" />
					<span v-if="uploadedAt">
						{{ new Date(uploadedAt).toLocaleDateString() }}
					</span>
				</span>
			</div>
			<div v-if="mode === 'uploaded'">
				<el-divider class="!m-0 !border-slate-600" />
				<div class="w-full flex text-white h-9 text-center text-sm">
					<el-tooltip :content="copyUrl" placement="top-start">
						<div
							class="flex-1 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors duration-200"
							@click="copyLink(copyUrl)"
						>
							<font-awesome-icon :icon="faCopy" class="mr-2" />
							链接
						</div>
					</el-tooltip>
					<el-divider direction="vertical" class="h-full !border-slate-600" />
					<el-popconfirm
						title="确认删除图片吗？"
						confirm-button-type="danger"
						@confirm="onDelete"
					>
						<template #reference>
							<div class="flex-1 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors duration-200">
								<font-awesome-icon :icon="faTrashAlt" class="mr-2" />
								删除
							</div>
						</template>
					</el-popconfirm>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { faTimesCircle, faTrashAlt, faCopy } from '@fortawesome/free-regular-svg-icons'
import { faImage } from '@fortawesome/free-regular-svg-icons'
import copy from 'copy-to-clipboard'
import formatBytes from '../utils/format-bytes'
import { computed, ref } from 'vue'
import LoadingOverlay from '../components/LoadingOverlay.vue'

const props = defineProps<{
	src: string
	copyUrl?: string
	name: string
	size: number
	mode: 'converted' | 'uploaded'
	uploadedAt?: number
	expiresAt?: number
	// 预览用的图片列表（不传则只预览自己）
	previewList?: string[]
	previewIndex?: number
}>()
const emit = defineEmits(['delete'])

const loading = ref(true)

// 点击图片打开大图预览；有列表时可左右切换
const previewSrcList = computed(() =>
	props.previewList && props.previewList.length ? props.previewList : [props.src]
)

// 加载失败也要收起遮罩，否则会一直转
const onError = () => {
	loading.value = false
}

const copyLink = (link?: string) => {
	if (!link) return
	const res = copy(link)
	if (res) {
		ElMessage.success('链接复制成功')
	} else {
		ElMessage.error('链接复制失败')
	}
}

const onDelete = () => {
	loading.value = true
	emit('delete')
	return true
}
</script>
