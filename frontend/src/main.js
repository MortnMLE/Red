import { createApp } from 'vue';
import app from './views/AuthPage.vue';
import router from './router';

createApp(app).use(router).mount('#app');