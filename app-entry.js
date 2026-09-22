import { LiquidGlass } from './vendor/liquidglass/index.js';
import { initHeroRipple } from './hero-ripple.js';
import './script.js';

initHeroRipple();
window.NutnLiquidGlass = LiquidGlass;
window.dispatchEvent(new Event('nutn-liquidglass-ready'));
