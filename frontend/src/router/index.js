import { createRouter, createWebHistory } from "vue-router";

import AuthPage from "../views/AuthPage.vue";

const routes = [
  {
    path: "/",
    component: AuthPage,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;