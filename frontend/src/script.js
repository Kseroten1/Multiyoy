/** @type {string} */
import vertexShaderString from './shaders/vertexShader.glsl?raw';
/** @type {string} */
import fragmentShaderString from './shaders/fragmentShader.glsl?raw';
import {COLOR_TABLE_FILL} from './utils/config.js';
import {buildWebGLProgram, getShaderLocations, initBuffer, modifyBuffer} from "./utils/glUtils.js";
import {getScaledRgbColors} from "./utils/convertOklchToRgb.js";
import {updateBrightnessAndSaturationMax} from "./utils/updateBrightnessAndSaturationMax.js";
import {MapState} from "./utils/mapState.js";
import {makeHexColorMask} from "./utils/math.js";
import {getHexIndexFromCoords, getHexNeighbors} from "./utils/hexLogicHelper.js";

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

export const selectedMapWidth = mapWidth.EXTRA;
const totalHexCount = selectedMapWidth ** 2;

/** @type {HTMLInputElement} */
const bInput = document.getElementById("brightness");
/** @type {HTMLInputElement} */
const sInput = document.getElementById("saturation");

const [maxB, maxS] = updateBrightnessAndSaturationMax(COLOR_TABLE_FILL);
bInput.max = maxB;
sInput.max = maxS;

const canvas = document.getElementById("main");
const secondaryCanvas = document.getElementById("secondary");
/** @type {WebGL2RenderingContext} */
const gl = canvas.getContext("webgl2", {colorSpace: "display-p3"});

/** @type {WebGL2RenderingContext} */
const gl2 = secondaryCanvas.getContext("webgl2", {colorSpace: "display-p3"});

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



const {program: mainHexProgram, vao: mainHexVao} = buildWebGLProgram(gl, vertexShaderString, fragmentShaderString);
const {program: secondHexProgram, vao: secondHexVao } = buildWebGLProgram(gl2, vertexShaderString, fragmentShaderString);

const mainHexProgramLocations = getShaderLocations(gl, mainHexProgram);
const secondHexProgramLocations = getShaderLocations(gl2, secondHexProgram);

const fillRgb = getScaledRgbColors(bInput.value, sInput.value, COLOR_TABLE_FILL);

function updateSelectableUniforms (context, programLocations) {
  context.uniform3fv(programLocations.fillColors, new Float32Array(fillRgb));
  context.uniform1f(programLocations.borderWidth, CONFIG.defaultBorderWidth);
  context.uniform1i(programLocations.mapWidth, selectedMapWidth);
}

updateSelectableUniforms(gl, mainHexProgramLocations);
updateSelectableUniforms(gl2, secondHexProgramLocations);

gl.uniform1i(mainHexProgramLocations.hexIndex, -1);
gl.uniform3fv(mainHexProgramLocations.edgeColor, [0.0, 0.0, 0.0]);
gl2.uniform3fv(secondHexProgramLocations.edgeColor, [1.0, 1.0, 1.0]);

const mapState = new MapState(CONFIG.playerCount, selectedMapWidth ** 2);

for (let i = 0; i < totalHexCount; i ++) {
  mapState.setHexStateIndex(i, 1);
  mapState.setHexOwner(i, Math.random() > 0.5 ? makeHexColorMask(2, 2, false) : makeHexColorMask(4, 4, false));
  // TODO: uniemożliwić losowanie koloru U**ainy
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

function calculateHexMaskIndex(indices) {
  const neighborMasks = [
    0b000010, // East
    0b010000, // West
    0b000001, // LowerRight
    0b100000, // LowerLeft
    0b000100, // UpperRight
    0b001000  // UpperLeft
  ];

  for (const currentIndex of indices) {
    const neighbors = getHexNeighbors(currentIndex);
    const currentOwner = mapState.hexOwners[currentIndex];
    let mask = 0;

    for (const neighborId of neighbors) {
      const i = neighbors.indexOf(neighborId);
      if (currentOwner !== mapState.hexOwners[neighborId]) {mask |= neighborMasks[i];}
    }

    mapState.calculatedEdgeMasks[currentIndex] = mask;
  }
}

generateHexMaskFirst();

const bufferFill = initBuffer(
  gl,
  mainHexProgramLocations.fillColorMask,
  mapState.fillMasksArray,
  1,
);

const bufferEdge = initBuffer(
  gl,
  mainHexProgramLocations.edgeMask,
  mapState.edgeMasksArray,
  1,
);

const secondHexBufferFill = initBuffer(
  gl2,
  secondHexProgramLocations.fillColorMask,
  Array(totalHexCount).fill(0),
  1,
)

const secondHexBufferEdge = initBuffer(
  gl2,
  secondHexProgramLocations.edgeMask,
  Array(totalHexCount).fill(0),
  1,
)

onResize();
scheduleRender();
initEventHandlers();


function highlightHex(mouseX, mouseY) {
  const hexIndex = getHexIndexFromCoords(mouseX, mouseY, viewMatrix);
  const highlightOwner = mapState.hexOwners[hexIndex];
  gl2.uniform1i(secondHexProgramLocations.hexIndex, hexIndex);
  gl2.uniform3fv(secondHexProgramLocations.fillColors, getScaledRgbColors(bInput.value * 1.5, sInput.value * 1.5, COLOR_TABLE_FILL))
  modifyBuffer(gl2, secondHexBufferFill, 0, [highlightOwner]);
  modifyBuffer(gl2, secondHexBufferEdge, 0, [mapState.edgeMasksArray[hexIndex]]);
}

function draw() {
  state.renderRequestId = null;
  const mvp = projectionMatrix.multiply(viewMatrix);
  gl.uniformMatrix4fv(mainHexProgramLocations.mvp, false, mvp.toFloat32Array());
  gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 8, totalHexCount);
  gl2.uniformMatrix4fv(secondHexProgramLocations.mvp, false, mvp.toFloat32Array());
  gl2.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 8, 1);
}

function scheduleRender() {
  if (state.renderRequestId) { return; }
  state.renderRequestId = requestAnimationFrame(draw);
}

function onResize() {
  const dpr = window.devicePixelRatio;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  secondaryCanvas.width = window.innerWidth * dpr;
  secondaryCanvas.height = window.innerHeight * dpr;
  
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl2.viewport(0, 0, gl2.canvas.width, gl2.canvas.height);
  projectionMatrix = new DOMMatrix().scaleSelf(2 / window.innerWidth, -2 / window.innerHeight);
  scheduleRender();
}

function initEventHandlers() {
  let dragging = false;
  const lastPosition = { x: 0, y: 0 };
  
  secondaryCanvas.addEventListener("wheel", (e) => {
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

  secondaryCanvas.addEventListener("pointerdown", (e) => {
    if (dragging) return;

    const hexIndex = getHexIndexFromCoords(e.clientX, e.clientY, viewMatrix);
    
    const newMask = makeHexColorMask(Math.floor(Math.random() * 13), Math.floor(Math.random() * 13), false);
    mapState.setHexOwner(hexIndex, newMask);
    modifyBuffer(gl, bufferFill, hexIndex, [newMask]);
    
    const hexToUpdate = [hexIndex, ...getHexNeighbors(hexIndex)];
    calculateHexMaskIndex(hexToUpdate);

    for (const hexToUpdateIndex of hexToUpdate) {
      modifyBuffer(gl, bufferEdge, hexToUpdateIndex, [mapState.calculatedEdgeMasks[hexToUpdateIndex]]);
    }
    highlightHex(e.clientX, e.clientY);
    
    scheduleRender();

    dragging = true;
    lastPosition.x = e.clientX;
    lastPosition.y = e.clientY;
    secondaryCanvas.setPointerCapture(e.pointerId);
  });

  secondaryCanvas.addEventListener("pointermove", (e) => {
    highlightHex(e.clientX, e.clientY);
    scheduleRender();
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

    secondaryCanvas.releasePointerCapture(e.pointerId);
    scheduleRender();
  };
  
  secondaryCanvas.addEventListener("pointerup", endDrag);
  secondaryCanvas.addEventListener("pointerleave", endDrag);
  window.addEventListener("resize", onResize);

  function onInputChange() {
    gl.uniform3fv(mainHexProgramLocations.fillColors, getScaledRgbColors(bInput.value, sInput.value, COLOR_TABLE_FILL));
    scheduleRender();
  }

  bInput.addEventListener("input", onInputChange);
  sInput.addEventListener("input", onInputChange);

}

// for (let i = 0; i < 1000; i++) {
//
// }