import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.css';
import App from './App.vue';

declare global {
  interface Window {
    Handsontable: typeof Handsontable;
  }
}

window.Handsontable = Handsontable;

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
