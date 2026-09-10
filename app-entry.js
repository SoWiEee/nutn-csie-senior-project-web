import { LiquidGlass } from './vendor/liquidglass/index.js';
import './script.js';

window.NutnLiquidGlass = LiquidGlass;
window.dispatchEvent(new Event('nutn-liquidglass-ready'));
