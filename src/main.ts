import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import './style.css'
import './styles/global.less'
import router from './router';
import { initMsal } from './api/sso'

async function bootstrap() {
    await initMsal(); // 👈 先初始化 MSAL

    const app = createApp(App);
    // Register all Element Plus icons
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
        app.component(key, component)
    }
    app.use(router)
    app.use(ElementPlus)
    app.mount('#app')
}

bootstrap()


