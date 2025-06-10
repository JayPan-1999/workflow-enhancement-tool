import { createRouter, createWebHistory } from "vue-router";
import App from '../App.vue';
import { ensureLogin } from "../api/sso";

const routes = [
    { path: "/", component: App },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach(async (to, from, next) => {
    await ensureLogin(); // 未登录会触发 loginRedirect
    next();
});

export default router;
