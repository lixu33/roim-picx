import { createApp } from 'vue'
import App from './App.vue'
import './permission'
import router from './plugins/router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import './app.css'

// element-plus 组件与样式由 vite 插件按需注入（见 vite.config.ts），不再整库引入
createApp(App).use(router).component('font-awesome-icon', FontAwesomeIcon).mount('#app')
