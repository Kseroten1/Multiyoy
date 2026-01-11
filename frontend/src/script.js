import vertexShaderString from './shaders/vertexShader.glsl?raw';
import fragmentShaderString from './shaders/fragmentShader.glsl?raw';
import textureVertexShader from './shaders/texture.vert?raw';
import textureFragmentShader from './shaders/texture.frag?raw';

import { convertOklchToRgb } from './utils/convertOklchToRgb.js';
import { updateBrightnessAndSaturationMax } from './utils/updateBrightnessAndSaturationMax.js';
import { createHexLayer } from './utils/createHexLayer.js';
import { createSpriteLayer } from './utils/createSpriteLayer.js';

import { CONFIG, COLOR_TABLE_FILL, COLOR_TABLE_EDGE, EDGE_MASKS } from './utils/config.js';
import {
    generateAxialHexCenters,
    makeMask,
    makeHexColorMask,
    makeModelMat3,
    pixelToAxial,
    hexRound,
    axialToCenter
} from './utils/math.js';

const canvas = document.getElementById("main");
const secondaryCanvas = document.getElementById("secondary");

const gl = canvas.getContext("webgl2", {colorSpace: "display-p3"});
const gl2 = secondaryCanvas.getContext("webgl2", {colorSpace: "display-p3"});

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
    hasMouse: false,
    renderRequestId: null,

    hlCenters: null,
    hlUnitTex: null,
    hlUnitPos: null,
};

const layers = {
    hex: null,
    units: null,
    highlight: null,
    highlightUnits: null
};

const worldObjects = new Map();

function createAtlasTexture(glContext, image) {
    const texture = glContext.createTexture();
    glContext.bindTexture(glContext.TEXTURE_2D, texture);
    glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MIN_FILTER, glContext.NEAREST_MIPMAP_NEAREST);
    glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MAG_FILTER, glContext.NEAREST);
    glContext.texImage2D(glContext.TEXTURE_2D, 0, glContext.RGBA, glContext.RGBA, glContext.UNSIGNED_BYTE, image);
    glContext.generateMipmap(glContext.TEXTURE_2D);
    return texture;
}

function updateHexColors() {
    const applyColorTransform = (table) => table.map(([L, C, h]) => [
        Math.min(L * state.brightness, 1),
        C * state.saturation,
        h,
    ]);
    const fillRgb = convertOklchToRgb(applyColorTransform(COLOR_TABLE_FILL)).flat();
    const edgeRgb = convertOklchToRgb(applyColorTransform(COLOR_TABLE_EDGE)).flat();

    gl.useProgram(layers.hex.program);
    gl.bindVertexArray(layers.hex.vao);
    gl.uniform3fv(layers.hex.locations.FILL_COLORS, new Float32Array(fillRgb));
    gl.uniform3fv(layers.hex.locations.EDGE_COLORS, new Float32Array(edgeRgb));
    gl.uniform1f(layers.hex.locations.u_borderWidth, CONFIG.defaultBorderWidth);

    gl2.useProgram(layers.highlight.program);
    gl2.bindVertexArray(layers.highlight.vao);
    gl2.uniform3fv(layers.highlight.locations.FILL_COLORS, new Float32Array(fillRgb));
    gl2.uniform3fv(layers.highlight.locations.EDGE_COLORS, new Float32Array(edgeRgb));
    gl2.uniform1f(layers.highlight.locations.u_borderWidth, CONFIG.defaultBorderWidth);
}

function updateGameEntities() {
    worldObjects.clear();

    for (const i of Array.from({ length: 100_000 }, (_, i) => i)) {
        const x = Math.ceil(Math.random() * 100 - 50)
        const y = Math.ceil(Math.random() * 100 - 50)
        worldObjects.set(`${x},${y}`, i % 13);
    }

    const posArray = [];
    const texArray = [];

    for (const [key, texID] of worldObjects) {
        const [q, r] = key.split(',').map(Number);
        const [x, y] = axialToCenter(q, r, CONFIG.hexSize);
        posArray.push(x, y);
        texArray.push(texID);
    }

    layers.units.updateData(new Float32Array(posArray), new Float32Array(texArray));
}

function drawFrame() {
    state.renderRequestId = null;
    const modelMatrix = makeModelMat3(state.panOffset, state.scale, canvas.width, canvas.height);

    gl.useProgram(layers.hex.program);
    gl.bindVertexArray(layers.hex.vao);
    gl.uniformMatrix3fv(layers.hex.locations.u_mvp, false, modelMatrix);
    gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 8, layers.hex.instanceCount);

    layers.units.draw(modelMatrix, CONFIG.hexSize, state.brightness, state.saturation);

    if (!state.hasMouse) {
        return;
    }

    layers.highlight.updateCenters(new Float32Array(state.hlCenters));
    gl2.useProgram(layers.highlight.program);
    gl2.bindVertexArray(layers.highlight.vao);
    gl2.uniformMatrix3fv(layers.highlight.locations.u_mvp, false, modelMatrix);
    gl2.drawArraysInstanced(gl2.TRIANGLE_FAN, 0, 8, layers.highlight.instanceCount);

    if (state.hlUnitTex.length > 0) {
        layers.highlightUnits.updateData(new Float32Array(state.hlUnitPos), new Float32Array(state.hlUnitTex));
        layers.highlightUnits.draw(modelMatrix, CONFIG.hexSize, state.brightness * 1.2, state.saturation);
    }
}


function scheduleRender() {
    if (state.renderRequestId === null) {
        state.renderRequestId = requestAnimationFrame(drawFrame);
    }
}

function resize() {
    const dpr = window.devicePixelRatio;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    secondaryCanvas.width = rect.width * dpr;
    secondaryCanvas.height = rect.height * dpr;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl2.viewport(0, 0, secondaryCanvas.width, secondaryCanvas.height);

    scheduleRender();
}

async function init() {
    const centersVec2 = generateAxialHexCenters(CONFIG.hexRadius, CONFIG.hexSize);
    const centersData = new Float32Array(centersVec2.flat());
    const edgeMaskData = new Int32Array(centersVec2.map(() => makeMask(EDGE_MASKS[0])));
    const fillMaskData = new Int32Array(centersVec2.map(() => makeHexColorMask(1, 1, 0)));

    const atlasImage = new Image();
    atlasImage.src = './assets/atlas.png';
    await new Promise((resolve) => atlasImage.onload = resolve);
    const atlasTexture = createAtlasTexture(gl, atlasImage);
    const atlasTextureHighlight = createAtlasTexture(gl2, atlasImage);

    layers.hex = createHexLayer(gl, vertexShaderString, fragmentShaderString, {
        centers: centersData,
        edgeMasks: edgeMaskData,
        fillMasks: fillMaskData,
        count: centersVec2.length
    });

    layers.units = createSpriteLayer(gl, textureVertexShader, textureFragmentShader, atlasTexture);

    layers.highlight = createHexLayer(gl2, vertexShaderString, fragmentShaderString, {
        centers: new Float32Array(14),
        edgeMasks: new Int32Array(7).fill(makeMask(EDGE_MASKS[0])),
        fillMasks: new Int32Array(7).fill(makeHexColorMask(2, 2, 0)),
        count: 7,
    });

    layers.highlightUnits = createSpriteLayer(gl2, textureVertexShader, textureFragmentShader, atlasTextureHighlight);

    updateHexColors();
    updateGameEntities();
    resize();
}


function updateUnderPointerSelection() {
    const aspect = canvas.width / canvas.height;
    const normX = (state.mouseX / canvas.width) * 2 - 1;
    const normY = -((state.mouseY / canvas.height) * 2 - 1);
    const worldX = (normX - state.panOffset.x) / (state.scale / aspect);
    const worldY = (normY - state.panOffset.y) / state.scale;
    const [q, r] = hexRound(...pixelToAxial(worldX, worldY, CONFIG.hexSize));
    const neighborOffsets = [[0, 0], [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    const hlCenters = [];
    const hlUnitPos = [];
    const hlUnitTex = [];
    for (const [dq, dr] of neighborOffsets) {
        const curQ = q + dq;
        const curR = r + dr;
        const [cx, cy] = axialToCenter(curQ, curR, CONFIG.hexSize);

        hlCenters.push(cx, cy);

        const key = `${curQ},${curR}`;
        if (worldObjects.has(key)) {
            hlUnitPos.push(cx, cy);
            hlUnitTex.push(worldObjects.get(key));
        }
    }
    state.hlCenters = hlCenters;
    state.hlUnitPos = hlUnitPos;
    state.hlUnitTex = hlUnitTex;
}

async function setupEventHandlers() {
    const [maxB, maxS] = updateBrightnessAndSaturationMax(COLOR_TABLE_FILL);
    const bInput = document.getElementById("brightness");
    const sInput = document.getElementById("saturation");

    window.addEventListener("resize", resize);
    bInput.max = maxB;
    bInput.addEventListener("input", (e) => { state.brightness = e.target.value; updateHexColors(gl, layers.hex); scheduleRender(); });

    sInput.max = maxS;
    sInput.addEventListener("input", (e) => { state.saturation = e.target.value; updateHexColors(gl, layers.hex); scheduleRender(); });

    secondaryCanvas.addEventListener("pointerdown", (e) => {
        if (state.dragging) return;
        e.preventDefault();
        state.activePointerId = e.pointerId;
        state.dragging = true;
        state.lastPosition.x = e.clientX;
        state.lastPosition.y = e.clientY;
        secondaryCanvas.setPointerCapture(e.pointerId);
    });

    secondaryCanvas.addEventListener("pointermove", (e) => {
        const rect = secondaryCanvas.getBoundingClientRect();
        state.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        state.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
        state.hasMouse = true;
        if (state.dragging && e.pointerId === state.activePointerId) {
            const deltaX = e.clientX - state.lastPosition.x;
            const deltaY = e.clientY - state.lastPosition.y;
            state.lastPosition.x = e.clientX;
            state.lastPosition.y = e.clientY;

            state.panOffset.x += (deltaX / rect.width) * 2.0;
            state.panOffset.y -= (deltaY / rect.height) * 2.0;
        }
        updateUnderPointerSelection();
        scheduleRender();
    });

    const endDrag = (e) => {
        if (!state.dragging || e.pointerId !== state.activePointerId) return;
        state.dragging = false;
        secondaryCanvas.releasePointerCapture(e.pointerId);
    };

    secondaryCanvas.addEventListener("pointerup", endDrag);
    secondaryCanvas.addEventListener("pointerleave", endDrag);

    secondaryCanvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const rect = secondaryCanvas.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const my = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        const zoom = Math.exp(-e.deltaY * 0.001);
        const newScale = Math.max(0.0005, Math.min(500.0, state.scale * zoom));
        const eff = newScale / state.scale;
        state.panOffset.x -= (mx - state.panOffset.x) * (eff - 1);
        state.panOffset.y -= (my - state.panOffset.y) * (eff - 1);
        state.scale = newScale;
        updateUnderPointerSelection();
        scheduleRender();
    }, { passive: false });
}

await init();
await setupEventHandlers();