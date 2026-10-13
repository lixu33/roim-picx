<template>
	<div
		v-if="props.loading"
		class="backdrop-blur-[2px] bg-white/40 left-0 top-0 h-full w-full absolute flex items-center justify-center rounded-xl z-50 cursor-not-allowed"
	>
		<font-awesome-icon :icon="faSpinner" class="text-3xl text-indigo-400 animate-spin" />
	</div>
</template>

<script setup lang="ts">
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

const props = defineProps<{
	loading: boolean
}>()
</script>
