import { registerSW } from 'virtual:pwa-register';
import './style.css';
import './app.js';

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}
