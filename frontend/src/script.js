import vertexShaderString from './shaders/vertexShader.glsl?raw';
import fragmentShaderString from './shaders/fragmentShader.glsl?raw';
import {COLOR_TABLE_EDGE, COLOR_TABLE_FILL} from './utils/config.js';
import {createShader} from "./utils/glUtils.js";
import {getScaledRgbColors} from "./utils/convertOklchToRgb.js";
import {updateBrightnessAndSaturationMax} from "./utils/updateBrightnessAndSaturationMax.js";
import {MapState} from "./utils/mapState.js";
import {generateMap} from "./utils/mapGenerator.js";
const state = {
  renderRequestId: null,
};

let centers = new Float32Array(0);
let bufferCenters, bufferFill, bufferEdge;

export const CONFIG = {
  defaultBorderWidth: 0.1,
  playerCount: 1500
};

const mapWidth = {
  QUICK: 16,
  SMALL: 32,
  MEDIUM: 64,
  LARGE: 128,
  HUGE: 256,
  EXTRA: 512,
  YEAR10: 1024,
  LIFETIME: 2048
};

export const selectedMapWidth = mapWidth.LARGE;

/** @type {HTMLInputElement} */
const bInput = document.getElementById("brightness");
/** @type {HTMLInputElement} */
const sInput = document.getElementById("saturation");
/** @type {HTMLInputElement} */
const freqInput = document.getElementById("baseFrequency");
/** @type {HTMLInputElement} */
const octavesInput = document.getElementById("numOctaves");
/** @type {HTMLInputElement} */
const seedInput = document.getElementById("seed");
/** @type {HTMLInputElement} */
const thresholdInput = document.getElementById("threshold");

const [maxB, maxS] = updateBrightnessAndSaturationMax(COLOR_TABLE_FILL);
bInput.max = maxB;
sInput.max = maxS;

seedInput.value = Math.floor(Math.random() * 1000);

const canvas = document.getElementById("main");
/** @type {WebGL2RenderingContext} */
const gl = canvas.getContext("webgl2", {colorSpace: "display-p3"});
/**
 * Used for controls related calculations (camera origin, zoom, pan)
 * @type {DOMMatrix}
 */
const viewMatrix = new DOMMatrix().scaleSelf(4);
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
  
  center: gl.getAttribLocation(program, "a_center"),
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

const mapState = new MapState(CONFIG.playerCount, selectedMapWidth ** 2);

async function updateMap(isInitial = false) {
  document.getElementById("val-baseFrequency").textContent = freqInput.value;
  document.getElementById("val-numOctaves").textContent = octavesInput.value;
  document.getElementById("val-seed").textContent = seedInput.value;
  document.getElementById("val-threshold").textContent = thresholdInput.value;

  mapState.reset();
  const mapData = await generateMap(selectedMapWidth, {
    baseFrequency: parseFloat(freqInput.value),
    numOctaves: parseInt(octavesInput.value),
    seed: parseInt(seedInput.value),
    threshold: parseFloat(thresholdInput.value)
  });

  for (let i = 0; i < selectedMapWidth ** 2; i++) {
    if (mapData[i] === 1) {
      mapState.setHexStateIndex(i, 1);
    }
  }

  centers = mapState.arrayForHexRenderer;

  if (isInitial && centers.length > 0) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < centers.length; i += 2) {
      const x = centers[i];
      const y = centers[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    viewMatrix.translateSelf(-centerX, -centerY);
  }

  if (!bufferCenters) {
    bufferCenters = initBuffer(locations.center, centers, 2);
    bufferFill = initBuffer(locations.fillColorMask, mapState.fillMasksArray, 1);
    bufferEdge = initBuffer(locations.edgeMask, mapState.edgeMasksArray, 1);
  } else {
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferCenters);
    gl.bufferData(gl.ARRAY_BUFFER, centers, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferFill);
    gl.bufferData(gl.ARRAY_BUFFER, mapState.fillMasksArray, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferEdge);
    gl.bufferData(gl.ARRAY_BUFFER, mapState.edgeMasksArray, gl.DYNAMIC_DRAW);
  }
  scheduleRender();
}

await updateMap(true);

onResize();
scheduleRender();
initEventHandlers();

/**
 * 
 * @param location {GLuint}
 * @param data {ArrayLike<number>}
 * @param size {Number}
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
 * @param data {ArrayLike<number>}
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
  gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 8, centers.length/2);
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
    e.preventDefault();
    lastPosition.x = e.clientX;
    lastPosition.y = e.clientY;

    if (e.ctrlKey) {
      const zoomSpeed = 0.01;
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
    } else {
      viewMatrix.translateSelf(-e.deltaX / viewMatrix.a, -e.deltaY / viewMatrix.d);
    }

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
    document.getElementById("val-brightness").textContent = bInput.value;
    document.getElementById("val-saturation").textContent = sInput.value;
    gl.uniform3fv(locations.fillColors, getScaledRgbColors(bInput.value, sInput.value, COLOR_TABLE_FILL));
    gl.uniform3fv(locations.edgeColors, getScaledRgbColors(bInput.value, sInput.value, COLOR_TABLE_EDGE));
    scheduleRender();
  }
  
  bInput.addEventListener("input", onInputChange);
  sInput.addEventListener("input", onInputChange);
  onInputChange();
  freqInput.addEventListener("input", () => updateMap());
  octavesInput.addEventListener("input", () => updateMap());
  seedInput.addEventListener("input", () => updateMap());
  thresholdInput.addEventListener("input", () => updateMap());
}

// for (let i = 0; i < 1000; i++) {
//
// }
