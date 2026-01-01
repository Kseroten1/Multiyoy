import vertexShaderString from './vertexShader.glsl?raw'
import fragmentShaderString from './fragmentShader.glsl?raw'
import {convertOklchToRgb} from './utils/convertOklchToRgb.js'
import {updateBrightnessAndSaturationMax} from './utils/updateBrightnessAndSaturationMax.js'
import {createRenderLayer} from './utils/createRenderLayer.js'

import {CONFIG, COLOR_TABLE_FILL, COLOR_TABLE_EDGE, EDGE_MASKS} from './utils/config.js'
import {generateAxialHexCenters, makeMask, makeHexColorMask, makeModelMat3} from './utils/math.js'

const canvas = document.getElementById("main");
const secondaryCanvas = document.getElementById("secondary");

const gl = canvas.getContext("webgl2", {colorSpace: "display-p3"});

const state = {
    panOffset: {x: 0, y: 0},
    scale: 0.2,
    brightness: 1.0,
    saturation: 1.0,
    dragging: false,
    lastPosition: {x: 0, y: 0},
    activePointerId: -1
};

const centersVec2 = generateAxialHexCenters(CONFIG.hexRadius, CONFIG.hexSize);
const centersData = new Float32Array(centersVec2.flat());
const edgeMaskData = new Int32Array(centersVec2.map(() => makeMask(EDGE_MASKS[0])));
const fillMaskData = new Int32Array(centersVec2.map(() => makeHexColorMask(1, 1, 0)));

const layer = createRenderLayer(gl, vertexShaderString, fragmentShaderString, {
    centers: centersData,
    edgeMasks: edgeMaskData,
    fillMasks: fillMaskData,
    count: centersVec2.length
});

function draw() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(...CONFIG.backgroundColor);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(layer.program);
    gl.bindVertexArray(layer.vao);

    const modelMat = makeModelMat3(state.panOffset, state.scale, canvas.width, canvas.height);
    gl.uniformMatrix3fv(layer.locations.mvp, false, modelMat);

    const applyColorTransform = (table) => table.map(([L, C, h]) => [
        Math.min(L * state.brightness, 1),
        C * state.saturation,
        h,
    ]);

    const fillRgb = convertOklchToRgb(applyColorTransform(COLOR_TABLE_FILL)).flat();
    const edgeRgb = convertOklchToRgb(applyColorTransform(COLOR_TABLE_EDGE)).flat();

    gl.uniform3fv(layer.locations.fillColors, new Float32Array(fillRgb));
    gl.uniform3fv(layer.locations.edgeColors, new Float32Array(edgeRgb));
    gl.uniform1f(layer.locations.borderWidth, CONFIG.defaultBorderWidth);

    gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 8, layer.instanceCount);
}

function resize() {
    const dpr = window.devicePixelRatio;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    if (secondaryCanvas) {
        secondaryCanvas.width = rect.width * dpr;
        secondaryCanvas.height = rect.height * dpr;
    }
    requestAnimationFrame(draw);
}

window.addEventListener("resize", resize);
resize();

const [maxBrightness, maxSaturation] = updateBrightnessAndSaturationMax(COLOR_TABLE_FILL);
const brightnessInput = document.getElementById("brightness");
const saturationInput = document.getElementById("saturation");

if (brightnessInput) {
    brightnessInput.max = maxBrightness;
    brightnessInput.addEventListener(
        "input",
        (e) => {
            state.brightness = parseFloat(e.target.value);
            draw();
        });
}
if (saturationInput) {
    saturationInput.max = maxSaturation;
    saturationInput.addEventListener("input", (e) => {
        state.saturation = parseFloat(e.target.value);
        draw();
    });
}

const eventTarget = secondaryCanvas;

eventTarget.addEventListener("pointerdown", (e) => {
    if (state.dragging) return;
    e.preventDefault();
    state.activePointerId = e.pointerId;
    state.dragging = true;
    state.lastPosition.x = e.clientX;
    state.lastPosition.y = e.clientY;
    eventTarget.setPointerCapture(e.pointerId);
}, {passive: false});

eventTarget.addEventListener("pointermove", (e) => {
    if (!state.dragging || e.pointerId !== state.activePointerId) return;
    e.preventDefault();

    const rect = eventTarget.getBoundingClientRect();
    const deltaX = e.clientX - state.lastPosition.x;
    const deltaY = e.clientY - state.lastPosition.y;
    state.lastPosition.x = e.clientX;
    state.lastPosition.y = e.clientY;

    const clipDeltaX = (deltaX / rect.width) * 2.0;
    const clipDeltaY = -((deltaY / rect.height) * 2.0); // Y flip w WebGL

    state.panOffset.x += clipDeltaX;
    state.panOffset.y += clipDeltaY;
    requestAnimationFrame(draw);
}, {passive: false});

const endDrag = (e) => {
    if (!state.dragging || e.pointerId !== state.activePointerId) return;
    state.dragging = false;
    state.activePointerId = -1;
    eventTarget.releasePointerCapture(e.pointerId);
};

eventTarget.addEventListener("pointerup", endDrag);
eventTarget.addEventListener("pointercancel", endDrag);
eventTarget.addEventListener("pointerleave", endDrag);

eventTarget.addEventListener("wheel", (e) => {
    e.preventDefault();

    const rect = eventTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1); // Y odwrócony
    
    const zoomFactor = Math.exp(-e.deltaY * 0.001);
    const newScale = Math.max(0.000001, Math.min(500.0, state.scale * zoomFactor));

    const effectiveZoom = newScale / state.scale;

    state.panOffset.x -= (mouseX - state.panOffset.x) * (effectiveZoom - 1);
    state.panOffset.y -= (mouseY - state.panOffset.y) * (effectiveZoom - 1);

    state.scale = newScale;

    requestAnimationFrame(draw);
}, { passive: false });

// Start
draw();