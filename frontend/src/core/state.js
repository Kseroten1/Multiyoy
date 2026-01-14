export const state = {
    panOffset: {x: 0, y: 0},
    scale: 0.2,
    brightness: 1.0,
    saturation: 1.0,
    dragging: false,
    lastPosition: {x: 0, y: 0},
    activePointerId: -1,
    mouseX: 0,
    mouseY: 0,
    hasMouse: false,
    renderRequestId: null,

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

export const worldObjects = new Map();