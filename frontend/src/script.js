/** @type {string} */
import vertexShaderString from './shaders/vertexShader.glsl?raw';
/** @type {string} */
import fragmentShaderString from './shaders/fragmentShader.glsl?raw';
import {COLOR_TABLE_FILL} from './utils/config.js';
import {buildWebGLProgram, getShaderLocations, initBuffer, modifyBuffer} from "./utils/glUtils.js";
import {getScaledRgbColors} from "./utils/convertOklchToRgb.js";
import {updateBrightnessAndSaturationMax} from "./utils/updateBrightnessAndSaturationMax.js";
import {makeHexColorMask} from "./utils/math.js";
import {calculateHexMaskIndex, getHexIndexFromMouseCoords, getHexNeighbors} from "./utils/hexLogicHelper.js";
import {setupMap} from "./utils/mapGenerator.js";

const {
  mapState,
  CONFIG,
  totalHexCount,
  selectedMapSideLength,
  mainProvinceArray,
  mainIndexBufferData
} = setupMap();

const state = {
  renderRequestId: null,
};

/** @type {HTMLInputElement} */
const bInput = document.getElementById("brightness");
/** @type {HTMLInputElement} */
const sInput = document.getElementById("saturation");

const [maxB, maxS] = updateBrightnessAndSaturationMax(COLOR_TABLE_FILL);
bInput.max = maxB;
sInput.max = maxS;

const mainCanvas = document.getElementById("main");
const highlightCanvas = document.getElementById("secondary");
/** @type {WebGL2RenderingContext} */
const gl = mainCanvas.getContext("webgl2", {colorSpace: "display-p3"});

/** @type {WebGL2RenderingContext} */
const gl2 = highlightCanvas.getContext("webgl2", {colorSpace: "display-p3"});

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
  context.uniform1i(programLocations.mapWidth, selectedMapSideLength);
}

updateSelectableUniforms(gl, mainHexProgramLocations);
updateSelectableUniforms(gl2, secondHexProgramLocations);

// this ensures shader uses its instanceID as index for main canvas
gl.uniform1i(mainHexProgramLocations.hexIndex, -1);
// setting edge color to black for main canvas
gl.uniform3fv(mainHexProgramLocations.edgeColor, [0.0, 0.0, 0.0]);
// setting edge color to white for highlight canvas
gl2.uniform3fv(secondHexProgramLocations.edgeColor, [1.0, 1.0, 1.0]);

const emptyData = new Float32Array(totalHexCount);

const bufferIndex = initBuffer(gl,
  mainHexProgramLocations.hexIndexAttrib,
  mainIndexBufferData,
  1,
)

const bufferFill = initBuffer(
  gl,
  mainHexProgramLocations.fillColorMask,
  mapState.fillMasksArray,
  1,
);

const bufferEdge = initBuffer(
  gl,
  mainHexProgramLocations.edgeMask,
  mapState.calculatedEdgeMasks,
  1,
);

const secondHexBufferFill = initBuffer(
  gl2,
  secondHexProgramLocations.fillColorMask,
  emptyData,
  1,
);

const secondHexBufferEdge = initBuffer(
  gl2,
  secondHexProgramLocations.edgeMask,
  emptyData,
  1,
);

const secondHexIndexBuffer = initBuffer(
  gl2, 
  secondHexProgramLocations.hexIndexAttrib, 
  emptyData,
  1,
)

onResize();
scheduleRender();
initEventHandlers();

let currentlyHighlighted = -1;
let highlightHexCount = 0;
function highlightHex(mouseX, mouseY) {
  const hexIndex = getHexIndexFromMouseCoords(mouseX, mouseY, viewMatrix, selectedMapSideLength);
  const provinceId = mapState.getHexProvinceId(hexIndex);
  if (provinceId === -1 || currentlyHighlighted === provinceId) {return;}
  const province = mainProvinceArray[provinceId];
  highlightHexCount = province.hexes.length;
  
  gl2.uniform1i(secondHexProgramLocations.hexIndex, hexIndex);
  modifyBuffer(gl2, secondHexIndexBuffer, 0, province.indices);
  gl2.uniform3fv(secondHexProgramLocations.fillColors, getScaledRgbColors(bInput.value * 1.5, sInput.value * 1.5, COLOR_TABLE_FILL))
  modifyBuffer(gl2, secondHexBufferFill, 0, province.owners);
  modifyBuffer(gl2, secondHexBufferEdge, 0, province.edgeMasks);
  currentlyHighlighted = provinceId;
}

function draw() {
  state.renderRequestId = null;
  const mvp = projectionMatrix.multiply(viewMatrix);
  gl.uniformMatrix4fv(mainHexProgramLocations.mvp, false, mvp.toFloat32Array());
  gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 8, totalHexCount);
  if (highlightHexCount > 0) {
    gl2.uniformMatrix4fv(secondHexProgramLocations.mvp, false, mvp.toFloat32Array());
    gl2.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 8, highlightHexCount);
  }
}

function scheduleRender() {
  if (state.renderRequestId) { return; }
  state.renderRequestId = requestAnimationFrame(draw);
}

function onResize() {
  const dpr = window.devicePixelRatio;
  mainCanvas.width = window.innerWidth * dpr;
  mainCanvas.height = window.innerHeight * dpr;
  highlightCanvas.width = window.innerWidth * dpr;
  highlightCanvas.height = window.innerHeight * dpr;
  
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl2.viewport(0, 0, gl2.canvas.width, gl2.canvas.height);
  projectionMatrix = new DOMMatrix().scaleSelf(2 / window.innerWidth, -2 / window.innerHeight);
  scheduleRender();
}

function initEventHandlers() {
  let dragging = false;
  const lastPosition = { x: 0, y: 0 };
  
  highlightCanvas.addEventListener("wheel", (e) => {
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

  highlightCanvas.addEventListener("pointerdown", (e) => {
    if (dragging) return;

    const hexIndex = getHexIndexFromMouseCoords(e.clientX, e.clientY, viewMatrix, selectedMapSideLength);
    
    const newMask = makeHexColorMask(Math.floor(Math.random() * 13), Math.floor(Math.random() * 13), false);
    mapState.setHexOwner(hexIndex, newMask);
    modifyBuffer(gl, bufferFill, hexIndex, [newMask]);
    
    const hexToUpdate = [hexIndex, ...getHexNeighbors(hexIndex, selectedMapSideLength)];
    calculateHexMaskIndex(hexToUpdate, mapState, selectedMapSideLength);

    for (const hexToUpdateIndex of hexToUpdate) {
      modifyBuffer(gl, bufferEdge, hexToUpdateIndex, [mapState.calculatedEdgeMasks[hexToUpdateIndex]]);
    }
    highlightHex(e.clientX, e.clientY);
    
    scheduleRender();

    dragging = true;
    lastPosition.x = e.clientX;
    lastPosition.y = e.clientY;
    highlightCanvas.setPointerCapture(e.pointerId);
  });

  highlightCanvas.addEventListener("pointermove", (e) => {
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

    highlightCanvas.releasePointerCapture(e.pointerId);
    scheduleRender();
  };
  
  highlightCanvas.addEventListener("pointerup", endDrag);
  highlightCanvas.addEventListener("pointerleave", endDrag);
  window.addEventListener("resize", onResize);

  function onInputChange() {
    gl.uniform3fv(mainHexProgramLocations.fillColors, getScaledRgbColors(bInput.value, sInput.value, COLOR_TABLE_FILL));
    gl2.uniform3fv(secondHexProgramLocations.fillColors, getScaledRgbColors(bInput.value * 1.2, sInput.value * 1.2, COLOR_TABLE_FILL));
    scheduleRender();
  }

  bInput.addEventListener("input", onInputChange);
  sInput.addEventListener("input", onInputChange);

}