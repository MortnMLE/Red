import { createRouter, createWebHistory } from 'vue-router';

import LoginPage from '../views/LoginPage.vue';
import EditorPage from '../views/EditorPage.vue';

const routes = [
  {
    path: '/',
    name: 'login',
    component: LoginPage,
  },
  {
    path: '/editor',
    name: 'editor',
    component: EditorPage
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;