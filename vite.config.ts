import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'

// element-plus 的主入口 (element-plus/es) 会 re-export 全部组件，组件之间有循环引用，
// rollup 摇不掉 → 整库约 780KB 进产物（table / date-picker 这些没用到的也在里面）。
// 这里把每个 ElXxx 直接解析到它自己的组件目录，只打包真正用到的组件与样式。
const EP_ALIAS: Record<string, string> = {
  'tab-pane': 'tabs' // 子组件没有独立目录，从父组件目录导出
}
const toKebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

const ElementPlusDeepResolver = () => ({
  type: 'component' as const,
  resolve: (name: string) => {
    if (!name.startsWith('El')) return
    const comp = EP_ALIAS[toKebab(name.slice(2))] || toKebab(name.slice(2))
    return {
      name,
      from: `element-plus/es/components/${comp}/index.mjs`,
      sideEffects: `element-plus/es/components/${comp}/style/css`
    }
  }
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // 按需引入 element-plus：只打包用到的组件与其样式，避免整库进入产物
    // dts 落在 src/ 下，tsconfig 才能收录，IDE 与 tsc 都认得自动导入的名字
    AutoImport({ resolvers: [ElementPlusDeepResolver()], dts: 'src/auto-imports.d.ts' }),
    Components({ resolvers: [ElementPlusDeepResolver()], dts: 'src/components.d.ts' })
  ],
  resolve: {
    alias: {
      // element-plus 的 exports 字段不允许深层子路径，用 alias 直连到实体目录
      'element-plus/es/components': fileURLToPath(
        new URL('./node_modules/element-plus/es/components', import.meta.url)
      )
    }
  },
  server: {
    port: 8990,
    host: "0.0.0.0"
  },
  build: {
    rollupOptions: {
      output: {
        // 第三方库单独成块：业务代码改动不会让用户重新下载它们
        manualChunks(id) {
          if (id.includes('node_modules/element-plus') || id.includes('node_modules/@element-plus')) {
            return 'element-plus'
          }
          if (id.includes('node_modules/vue') || id.includes('node_modules/@vue')) {
            return 'vue'
          }
          if (id.includes('node_modules/@fortawesome')) {
            return 'fontawesome'
          }
        }
      }
    }
  }
})
