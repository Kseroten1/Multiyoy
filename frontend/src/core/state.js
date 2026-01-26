import { MapStateManager } from './memory.js';
import {MapState} from "./MapState.js";

const HEX_COUNT = 250;
const PLAYER_COUNT = 1500;

export const mapState = new MapState(1500, 2_250_000);

export const state = {
    panOffset: { x: 0, y: 0 },
    scale: 0.2,
    brightness: 1.0,
    saturation: 1.0,
    dragging: false,
    lastPosition: { x: 0, y: 0 },
    activePointerId: -1,
    mouseX: 0,
    mouseY: 0,
    hasMouse: false,
    renderRequestId: null,
    hoverQ: 0,
    hoverR: 0,

    hlCenters: null,
    hlUnitTex: null,
    hlUnitPos: null,
};

export const layers = {
    hex: null,
    units: null,
    highlight: null,
    highlightUnits: null
};