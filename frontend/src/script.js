import vertexShaderString from './shaders/vertexShader.glsl?raw';
import fragmentShaderString from './shaders/fragmentShader.glsl?raw';
import {COLOR_TABLE_EDGE, COLOR_TABLE_FILL} from './utils/config.js';
import {createShader} from "./utils/glUtils.js";
import {getScaledRgbColors} from "./utils/convertOklchToRgb.js";
import {updateBrightnessAndSaturationMax} from "./utils/updateBrightnessAndSaturationMax.js";
import {MapState} from "./utils/mapState.js";
import {makeHexColorMask} from "./utils/math.js";

const state = {
  renderRequestId: null,
};

export const CONFIG = {
  defaultBorderWidth: 0.1,
  playerCount: 1500
};

const mapWidth = {
  SMALL: 32,
  MEDIUM: 64,
  LARGE: 128,
  HUGE: 256,
  EXTRA: 512,
  YEAR10: 1024,
  LIFETIME: 2048
};

const directions = [
  {dq: 0, dr: 1}, {dq: 1, dr: 0}, {dq: 1, dr: -1},
  {dq: 0, dr: -1}, {dq: -1, dr: 0}, {dq: -1, dr: 1}
];

export const selectedMapWidth = mapWidth.LIFETIME;
const totalHexCount = selectedMapWidth ** 2;

/** @type {HTMLInputElement} */
const bInput = document.getElementById("brightness");
/** @type {HTMLInputElement} */
const sInput = document.getElementById("saturation");

const [maxB, maxS] = updateBrightnessAndSaturationMax(COLOR_TABLE_FILL);
bInput.max = maxB;
sInput.max = maxS;

const canvas = document.getElementById("main");
/** @type {WebGL2RenderingContext} */
const gl = canvas.getContext("webgl2", {colorSpace: "display-p3"});
/**
 * Used for controls related calculations (camera origin, zoom, pan)
 * @type {DOMMatrix}
 */
const viewMatrix = new DOMMatrix().scaleSelf(15);
/**
 * Used for window related calculations (window size, device pixel ratio)
 * @type {DOMMatrix}
 */
let projectionMatrix = new DOMMatrix();

const program = gl.createProgram();
const vertShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderString);
const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderString);
const vao = gl.createVertexArray();

gl.attachShader(program, vertShader);
gl.attachShader(program, fragShader);
gl.linkProgram(program);

const locations = {
  mvp: gl.getUniformLocation(program, "u_mvp"),
  borderWidth: gl.getUniformLocation(program, "u_borderWidth"),
  mapWidth: gl.getUniformLocation(program, "u_mapWidth"),

  edgeMask: gl.getAttribLocation(program, "a_edgeMask"),
  fillColorMask: gl.getAttribLocation(program, "a_fillColorMask"),

  fillColors: gl.getUniformLocation(program, "FILL_COLORS"),
  edgeColors: gl.getUniformLocation(program, "EDGE_COLORS"),
};

const fillRgb = getScaledRgbColors(bInput.value, sInput.value, COLOR_TABLE_FILL);
const edgeRgb = getScaledRgbColors(bInput.value, sInput.value, COLOR_TABLE_EDGE); // TODO: Wywalić tą table (kosztem debug mode) i wstawić const czarny w shader

gl.useProgram(program);
gl.bindVertexArray(vao);
gl.uniform3fv(locations.fillColors, new Float32Array(fillRgb));
gl.uniform3fv(locations.edgeColors, new Float32Array(edgeRgb));
gl.uniform1f(locations.borderWidth, CONFIG.defaultBorderWidth);
gl.uniform1i(locations.mapWidth, selectedMapWidth);

const mapState = new MapState(CONFIG.playerCount, selectedMapWidth ** 2);

for (let i = 0; i < totalHexCount; i ++) {
  mapState.setHexStateIndex(i, 1);
  mapState.setHexOwner(i, Math.random() > 0.5 ? makeHexColorMask(2, 2, false) : makeHexColorMask(4, 4, false));
  mapState.calculatedEdgeMasks[i] = 0b000000;
}

function generateHexMaskFirst() {
  for (let i = 0; i < totalHexCount - 1; i++) {
    const r = Math.floor(i / selectedMapWidth);
    const isRowOdd = (r & 1) !== 0;
    const indexDownRight = i + selectedMapWidth + isRowOdd;
    const indexDownLeft = i + selectedMapWidth + isRowOdd - 1;

    mapState.calculatedEdgeMasks[i] |= (mapState.hexOwners[i] !== mapState.hexOwners[i + 1]) * 0b000010;
    mapState.calculatedEdgeMasks[i + 1] |= (mapState.hexOwners[i] !== mapState.hexOwners[i + 1]) * 0b010000;

    mapState.calculatedEdgeMasks[i] |= (mapState.hexOwners[i] !== mapState.hexOwners[indexDownRight]);
    mapState.calculatedEdgeMasks[indexDownRight] |= (mapState.hexOwners[i] !== mapState.hexOwners[indexDownRight]) * 0b001000;

    mapState.calculatedEdgeMasks[i] |= (mapState.hexOwners[i] !== mapState.hexOwners[indexDownLeft]) * 0b100000;
    mapState.calculatedEdgeMasks[indexDownLeft] |= (mapState.hexOwners[i] !== mapState.hexOwners[indexDownLeft]) * 0b000100;
  }
}

generateHexMaskFirst();
//to daje kwadrat 

const bufferFill = initBuffer(
  locations.fillColorMask,
  ///** @type {ArrayLike<>} */ precalculatedFillMask,
  mapState.fillMasksArray,
  1,
);

const bufferEdge = initBuffer(
  locations.edgeMask,
  ///** @type {ArrayLike<>} */ precalculatedEdgeMasks,
  mapState.edgeMasksArray,
  1,
);

onResize();
scheduleRender();
initEventHandlers();

/**
 *
 * @param location {GLuint}
 * @param data {ArrayLike<>}
 * @param size {}
 * @returns {WebGLBuffer}
 */
function initBuffer(location, data, size) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
  gl.vertexAttribDivisor(location, 1);
  return buffer;
}

/**
 *
 * @param buffer {WebGLBuffer}
 * @param data {ArrayLike<>}
 */
function modifyBuffer(buffer, data) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(data));
}

function draw() {
  state.renderRequestId = null;
  gl.useProgram(program);
  gl.bindVertexArray(vao);
  const mvp = projectionMatrix.multiply(viewMatrix);
  gl.uniformMatrix4fv(locations.mvp, false, mvp.toFloat32Array());
  gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 8, totalHexCount);
}

function scheduleRender() {
  if (state.renderRequestId) { return; }
  state.renderRequestId = requestAnimationFrame(draw);
}

function onResize() {
  const dpr = window.devicePixelRatio;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  projectionMatrix = new DOMMatrix().scaleSelf(2 / window.innerWidth, -2 / window.innerHeight);
  scheduleRender();
}

function initEventHandlers() {
  let dragging = false;
  const lastPosition = { x: 0, y: 0 };

  canvas.addEventListener("wheel", (e) => {
    lastPosition.x = e.clientX;
    lastPosition.y = e.clientY;

    const zoomSpeed = 0.001;
    const factor = Math.exp(-e.deltaY * zoomSpeed);
    const viewCenterX = window.innerWidth / 2;
    const viewCenterY = window.innerHeight / 2;

    const x = e.clientX - viewCenterX;
    const y = e.clientY - viewCenterY;

    const zoomMatrix = new DOMMatrix()
      .translate(x, y)
      .scale(factor)
      .translate(-x, -y);

    viewMatrix.preMultiplySelf(zoomMatrix);
    scheduleRender();
  }, { passive: false });

  canvas.addEventListener("pointerdown", (e) => {
    if (dragging) return;
    dragging = true;
    lastPosition.x = e.clientX;
    lastPosition.y = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) { return; }
    const deltaX = e.clientX - lastPosition.x;
    const deltaY = e.clientY - lastPosition.y;

    lastPosition.x = e.clientX;
    lastPosition.y = e.clientY;

    viewMatrix.translateSelf(deltaX / viewMatrix.a, deltaY / viewMatrix.d);
    scheduleRender();
  });

  const endDrag = (e) => {
    if (!dragging) { return; }
    dragging = false;

    canvas.releasePointerCapture(e.pointerId);
    scheduleRender();
  };

  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointerleave", endDrag);
  window.addEventListener("resize", onResize);

  function onInputChange() {
    gl.uniform3fv(locations.fillColors, getScaledRgbColors(bInput.value, sInput.value, COLOR_TABLE_FILL));
    gl.uniform3fv(locations.edgeColors, getScaledRgbColors(bInput.value, sInput.value, COLOR_TABLE_EDGE));
    scheduleRender();
  }

  bInput.addEventListener("input", onInputChange);
  sInput.addEventListener("input", onInputChange);

}

// for (let i = 0; i < 1000; i++) {
//
// }