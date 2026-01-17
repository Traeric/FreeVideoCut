import { createApp } from "vue";
import App from "./App.vue";
import ArcoVue from '@arco-design/web-vue';
import '@arco-design/web-vue/dist/arco.css';
import './assets/base.css';
import ArcoVueIcon from '@arco-design/web-vue/es/icon';
import { createPinia } from 'pinia';
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'
import ContextMenu from '@imengyu/vue3-context-menu';

const app = createApp(App);
app.use(ArcoVue);
app.use(ArcoVueIcon);
app.use(createPinia());
app.use(ContextMenu);
app.mount("#app");

document.body.setAttribute('arco-theme', 'dark');
