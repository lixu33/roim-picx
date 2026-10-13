<template>
	<div class="mx-auto max-w-6xl my-4 px-4">
		<div class="mx-auto max-w-md mt-16 panel p-8">
			<div class="text-center mb-6">
				<div
					class="w-12 h-12 mx-auto rounded-xl bg-indigo-500 text-white flex items-center justify-center mb-3 shadow-sm"
				>
					<font-awesome-icon :icon="faLock" />
				</div>
				<div class="text-lg font-semibold text-slate-800">访问认证</div>
				<div class="text-sm text-slate-500 mt-1">输入 Token 进入图床管理</div>
			</div>
			<el-input
				v-model="token"
				size="large"
				placeholder="请输入认证 Token"
				show-password
				@keyup.enter="saveToken"
			/>
			<el-button
				:loading="loading"
				class="mt-4 w-full"
				size="large"
				type="primary"
				@click="saveToken"
			>进入</el-button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { faLock } from '@fortawesome/free-solid-svg-icons'
import storage from '../utils/storage'
import { checkToken } from '../utils/request'

const token = ref('')
const loading = ref(false)
const router = useRouter()

const saveToken = () => {
	loading.value = true
	if (!token.value) {
		loading.value = false
		ElMessage.error('请输入token')
		return
	}
	checkToken({
		token: token.value
	}).then(res => {
		if (res) {
			// 检测token是否有效
			storage.local.set('auth-token', token.value)
			router.push('/')
		} else {
			ElMessage.error('Token无效')
		}
	}).finally(() => {
		loading.value = false
	})
}
</script>
