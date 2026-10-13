<template>
	<el-config-provider :locale="zhCn">
		<div class="w-full h-screen overflow-x-hidden overflow-y-auto bg-slate-50">
			<el-scrollbar>
				<header
					class="w-full h-16 bg-white/80 border-b border-slate-200/70 sticky left-0 top-0 backdrop-blur-md z-10"
				>
					<div class="mx-auto max-w-6xl px-4 h-full flex items-center gap-3">
						<img src="/favicon.png" class="w-8 h-8 block rounded-lg" />
						<span class="text-lg font-semibold text-slate-800 tracking-tight">{{ appName }}</span>
						<div class="flex-1"></div>

						<nav class="flex items-center gap-1">
							<button
								class="nav-btn"
								:class="$route.path === '/up'
									? 'bg-indigo-500 text-white shadow-sm'
									: 'text-slate-600 hover:bg-slate-100'"
								@click="router.push('/up')"
							>
								<font-awesome-icon :icon="faUpload" />
								<span class="hidden md:inline-block pl-2">上传</span>
							</button>

							<button
								class="nav-btn"
								:class="$route.path === '/'
									? 'bg-indigo-500 text-white shadow-sm'
									: 'text-slate-600 hover:bg-slate-100'"
								@click="router.push('/')"
							>
								<font-awesome-icon :icon="faCog" />
								<span class="hidden md:inline-block pl-2">管理</span>
							</button>
						</nav>
					</div>
				</header>

				<div class="min-h-[calc(100vh-64px-64px)] overflow-auto">
					<router-view />
				</div>

				<footer class="w-full h-16 flex items-center justify-center text-slate-400 text-sm">
					<a :href="repoLink" target="_blank" class="hover:text-indigo-500 transition-colors duration-200">
						{{ repoName }}
					</a>
				</footer>
			</el-scrollbar>
		</div>
	</el-config-provider>
</template>

<script setup lang="ts">
import { faCog, faUpload } from '@fortawesome/free-solid-svg-icons'
import { useRouter } from 'vue-router'
import zhCn from "element-plus/es/locale/lang/zh-cn"

const repoLink = 'https://blog.lixu.dev'
const repoName = '总要写点什么'
const appName = '图床管理工具'

document.title = appName

const router = useRouter()
</script>
