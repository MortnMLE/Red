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
    component: EditorPage,
    meta: {
      requiresAuth: true
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
    const userId = localStorage.getItem('userId');
    
    if (to.meta.requiresAuth && !userId) {
        return '/';
    }
});

export default router;