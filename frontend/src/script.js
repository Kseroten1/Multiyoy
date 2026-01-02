import vertexShaderString from './vertexShader.glsl?raw'
import fragmentShaderString from './fragmentShader.glsl?raw'
import {convertOklchToRgb} from './utils/convertOklchToRgb.js'
import {updateBrightnessAndSaturationMax} from './utils/updateBrightnessAndSaturationMax.js'
import {createRenderLayer} from './utils/createRenderLayer.js'

import {CONFIG, COLOR_TABLE_FILL, COLOR_TABLE_EDGE, EDGE_MASKS} from './utils/config.js'
import {
    generateAxialHexCenters,
    makeMask,
    makeHexColorMask,
    makeModelMat3,
    pixelToAxial,
    hexRound,
    axialToCenter
} from './utils/math.js'

const canvas = document.getElementById("main");
const secondaryCanvas = document.getElementById("secondary");

const gl = canvas.getContext("webgl2", {colorSpace: "display-p3"});
const gl2 = secondaryCanvas.getContext("webgl2", {colorSpace: "display-p3", alpha: true});

const state = {
    panOffset: {x: 0, y: 0},
    scale: 0.2,
    brightness: 1.0,
    saturation: 1.0,
    dragging: false,
    lastPosition: {x: 0, y: 0},
    activePointerId: -1,
    mouseX: 0,
    mouseY: 0,
    hasMouse: false
};

const centersVec2 = generateAxialHexCenters(CONFIG.hexRadius, CONFIG.hexSize);
const centersData = new Float32Array(centersVec2.flat());
const edgeMaskData = new Int32Array(centersVec2.map(() => makeMask(EDGE_MASKS[0])));
const fillMaskData = new Int32Array(centersVec2.map(() => makeHexColorMask(1, 1, 0)));

const highlightCenterData = new Float32Array(7 * 2);
const highlightEdgeMask = new Int32Array(7).fill(makeMask(EDGE_MASKS[0]));
const highlightFillMask = new Int32Array(7).fill(makeHexColorMask(1, 1, 0));
highlightFillMask[0] = makeHexColorMask(2, 2, 0);

const mainLayer = createRenderLayer(gl, vertexShaderString, fragmentShaderString, {
    centers: centersData,
    edgeMasks: edgeMaskData,
    fillMasks: fillMaskData,
    count: centersVec2.length
});

const highlightLayer = createRenderLayer(gl2, vertexShaderString, fragmentShaderString, {
    centers: highlightCenterData,
    edgeMasks: highlightEdgeMask,
    fillMasks: highlightFillMask,
    count: 7,
    dynamic: true
});

function drawMain() {
    gl.viewport(0, 0, canvas.width, canvas.height);

    updateColors(gl, mainLayer);

    gl.useProgram(mainLayer.program);
    gl.bindVertexArray(mainLayer.vao);

    const modelMat = makeModelMat3(state.panOffset, state.scale, canvas.width, canvas.height);
    gl.uniformMatrix3fv(mainLayer.locations.mvp, false, modelMat);

    gl.clearColor(...CONFIG.backgroundColor);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 8, mainLayer.instanceCount);
}

function drawHighlight() {
    if (state.hasMouse) {
        const aspect = canvas.width / canvas.height;

        const normX = (state.mouseX / canvas.width) * 2 - 1;
        const normY = -((state.mouseY / canvas.height) * 2 - 1);

        const worldX = (normX - state.panOffset.x) / (state.scale / aspect);
        const worldY = (normY - state.panOffset.y) / state.scale;

        const [qFrac, rFrac] = pixelToAxial(worldX, worldY, CONFIG.hexSize);
        const [centerQ, centerR] = hexRound(qFrac, rFrac);

        const neighborOffsets = [
            [0, 0], [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]
        ];

        const newCenters = new Float32Array(14);
        let i = 0;
        for (const [deltaQ, deltaR] of neighborOffsets) {
            const [centerX, centerY] = axialToCenter(centerQ + deltaQ, centerR + deltaR, CONFIG.hexSize);
            newCenters[i++] = centerX;
            newCenters[i++] = centerY;
        }

        highlightLayer.updateCenters(newCenters);
    }

    gl2.viewport(0, 0, secondaryCanvas.width, secondaryCanvas.height);
    gl2.clearColor(0, 0, 0, 0);
    gl2.clear(gl2.COLOR_BUFFER_BIT);

    gl2.useProgram(highlightLayer.program);
    gl2.bindVertexArray(highlightLayer.vao);

    const modelMat = makeModelMat3(state.panOffset, state.scale, canvas.width, canvas.height);
    gl2.uniformMatrix3fv(highlightLayer.locations.mvp, false, modelMat);

    const originalB = state.brightness;
    state.brightness = 1.4;
    updateColors(gl2, highlightLayer);
    state.brightness = originalB;

    gl2.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 8, highlightLayer.instanceCount);
}

function updateColors(context, layer) {
    const applyColorTransform = (table) => table.map(([L, C, h]) => [
        Math.min(L * state.brightness, 1),
        C * state.saturation,
        h,
    ]);
    const fillRgb = convertOklchToRgb(applyColorTransform(COLOR_TABLE_FILL)).flat();
    const edgeRgb = convertOklchToRgb(applyColorTransform(COLOR_TABLE_EDGE)).flat();

    context.uniform3fv(layer.locations.fillColors, new Float32Array(fillRgb));
    context.uniform3fv(layer.locations.edgeColors, new Float32Array(edgeRgb));
    context.uniform1f(layer.locations.borderWidth, CONFIG.defaultBorderWidth);
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
    requestAnimationFrame(() => {
        drawMain();
        drawHighlight();
    });
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
            requestAnimationFrame(() => {
                drawMain();
                drawHighlight();
            });
        });
}
if (saturationInput) {
    saturationInput.max = maxSaturation;
    saturationInput.addEventListener("input", (e) => {
        state.saturation = parseFloat(e.target.value);
        requestAnimationFrame(() => {
            drawMain();
            drawHighlight();
        });
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
    e.preventDefault();
    const rect = eventTarget.getBoundingClientRect();
    state.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    state.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    state.hasMouse = true;
    if (state.dragging && e.pointerId === state.activePointerId) {
        const deltaX = e.clientX - state.lastPosition.x;
        const deltaY = e.clientY - state.lastPosition.y;
        state.lastPosition.x = e.clientX;
        state.lastPosition.y = e.clientY;

        const clipDeltaX = (deltaX / rect.width) * 2.0;
        const clipDeltaY = -((deltaY / rect.height) * 2.0);

        state.panOffset.x += clipDeltaX;
        state.panOffset.y += clipDeltaY;

        requestAnimationFrame(() => {
            drawMain();
            drawHighlight();
        });
    } else {
        requestAnimationFrame(drawHighlight);
    }
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

    requestAnimationFrame(() => {
        drawMain();
        drawHighlight();
    });
}, {passive: false});

drawMain();