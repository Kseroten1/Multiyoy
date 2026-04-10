import vertexShaderString from './shaders/vertexShader.glsl?raw';
import fragmentShaderString from './shaders/fragmentShader.glsl?raw';
import {COLOR_TABLE_FILL, UNASSIGNED_PROVINCE_ID, INVALID_HEX_INDEX, PLAYER_COUNTS, MAP_SIDE_LENGTH} from './utils/config.js';
import {buildWebGLProgram, getShaderLocations, initBuffer, modifyBuffer} from "./utils/glUtils.js";
import {getScaledRgbColors} from "./utils/convertOklchToRgb.js";
import {updateBrightnessAndSaturationMax} from "./utils/updateBrightnessAndSaturationMax.js";
import {makeHexColorMask} from "./utils/math.js";
import {getHexIndexFromMouseCoords} from "./utils/hexLogicHelper.js";
import {MapState} from "./utils/mapState.js";

const selectedMapSideLength = MAP_SIDE_LENGTH.LIFETIME;

const config = {
  defaultBorderWidth: 0.1,
  mapSideLength: selectedMapSideLength,
  totalHexCount: selectedMapSideLength ** 2,
  playerCount: PLAYER_COUNTS[selectedMapSideLength],
};

const mapState = new MapState(config.playerCount, config.totalHexCount);

const state = {
  renderRequestId: /** @type {number | null} */ (null),
};

const bInput = /** @type {HTMLInputElement} */ (document.getElementById("brightness"));
const sInput = /** @type {HTMLInputElement} */ (document.getElementById("saturation"));

// TODO: `updateBrightnessAndSaturationMax` can be done once and only at compile time
const [maxB, maxS] = updateBrightnessAndSaturationMax(COLOR_TABLE_FILL);
bInput.max = maxB;
sInput.max = maxS;

const mainCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById("main"));
const highlightCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById("secondary"));
const canvasOptions = /** @type {WebGLContextAttributes} */ {colorSpace: "display-p3"};

const gl = /** @type {WebGL2RenderingContext} */ (mainCanvas.getContext("webgl2", canvasOptions));
const gl2 = /** @type {WebGL2RenderingContext} */ (highlightCanvas.getContext("webgl2", canvasOptions));

// Used for controls related calculations (camera origin, zoom, pan)
const viewMatrix = new DOMMatrix();
// Center the view 
const centerX = (config.mapSideLength - 1) * 1.73205081 * 0.5;
const centerY = (config.mapSideLength - 1) * 1.5 * 0.5;
viewMatrix.scaleSelf(600 / config.mapSideLength).translateSelf(-centerX, -centerY);
// Used for window related calculations (window size, device pixel ratio)
let projectionMatrix = new DOMMatrix();

const {program: mainHexProgram, vao: mainHexVao} = buildWebGLProgram(gl, vertexShaderString, fragmentShaderString);
const {program: secondHexProgram, vao: secondHexVao } = buildWebGLProgram(gl2, vertexShaderString, fragmentShaderString);

const mainHexProgramLocations = getShaderLocations(gl, mainHexProgram);
const secondHexProgramLocations = getShaderLocations(gl2, secondHexProgram);

const fillRgb = getScaledRgbColors(+bInput.value, +sInput.value, COLOR_TABLE_FILL);

/**
 * @param {WebGL2RenderingContext} context
 * @param {{ borderWidth: WebGLUniformLocation; mapWidth: WebGLUniformLocation; fillColors: WebGLUniformLocation; }} uniformLocations
 */
function updateSelectableUniforms(context, uniformLocations) {
  context.uniform3fv(uniformLocations.fillColors, new Float32Array(fillRgb));
  context.uniform1f(uniformLocations.borderWidth, config.defaultBorderWidth);
  context.uniform1i(uniformLocations.mapWidth, config.mapSideLength);
}

updateSelectableUniforms(gl, mainHexProgramLocations);
updateSelectableUniforms(gl2, secondHexProgramLocations);

// this ensures shader uses its instanceID as index for main canvas
gl.uniform1i(mainHexProgramLocations.hexIndex, INVALID_HEX_INDEX);
// setting edge color to black for main canvas
gl.uniform3fv(mainHexProgramLocations.edgeColor, [0.0, 0.0, 0.0]);
// setting edge color to white for highlight canvas
gl2.uniform3fv(secondHexProgramLocations.edgeColor, [1.0, 1.0, 1.0]);

const emptyData = new Float32Array(config.totalHexCount);

const bufferFill = initBuffer(
  gl,
  mainHexProgramLocations.fillColorMask,
  mapState.renderer.fillMasksArray,
  1,
);

const bufferEdge = initBuffer(
  gl,
  mainHexProgramLocations.edgeMask,
  mapState.data.calculatedEdgeMasks,
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
void animateMapGeneration();

function animateMapGeneration() {
  const worker = new Worker(new URL('./mapWorker.js', import.meta.url), { type: 'module' });
  
  worker.postMessage({
    config,
    sharedBuffer: mapState.data.byteArray.buffer
  });

  let isGenerating = true;
  const pollProgress = () => {
    if (!isGenerating) return;
    modifyBuffer(gl, bufferFill, 0, mapState.renderer.fillMasksArray);
    scheduleRender();
    requestAnimationFrame(pollProgress);
  };
  requestAnimationFrame(pollProgress);

  worker.onmessage = (e) => {
    if (e.data.type === 'COMPLETE') {
      isGenerating = false;
      mapState.logic.rebuildProvinceData();
      
      modifyBuffer(gl, bufferFill, 0, mapState.renderer.fillMasksArray);
      modifyBuffer(gl, bufferEdge, 0, mapState.data.calculatedEdgeMasks);
      scheduleRender();
      console.log('Map generation complete');
    }
  };
}

let currentlyHighlighted = UNASSIGNED_PROVINCE_ID;
let highlightHexCount = 0;

/**
 * @param {number} mouseX
 * @param {number} mouseY
 */
function highlightHex(mouseX, mouseY) {
  const hexIndex = getHexIndexFromMouseCoords(mouseX, mouseY, viewMatrix, config.mapSideLength);
  if (hexIndex === INVALID_HEX_INDEX) return;
  const provinceId = mapState.data.hexProvinceIds[hexIndex];
  if (provinceId === UNASSIGNED_PROVINCE_ID || currentlyHighlighted === provinceId) {return;}
  
  const renderData = mapState.renderer.getProvinceRenderData(provinceId);
  
  highlightHexCount = renderData.count;
  
  gl2.uniform1i(secondHexProgramLocations.hexIndex, hexIndex);
  modifyBuffer(gl2, secondHexIndexBuffer, 0, renderData.indices);
  gl2.uniform3fv(secondHexProgramLocations.fillColors, getScaledRgbColors(+bInput.value * 1.5, +sInput.value * 1.5, COLOR_TABLE_FILL))
  modifyBuffer(gl2, secondHexBufferFill, 0, renderData.owners);
  modifyBuffer(gl2, secondHexBufferEdge, 0, renderData.edgeMasks);
  currentlyHighlighted = provinceId;
}

function draw() {
  state.renderRequestId = null;
  const mvp = projectionMatrix.multiply(viewMatrix);
  gl.uniformMatrix4fv(mainHexProgramLocations.mvp, false, mvp.toFloat32Array());
  gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 8, config.totalHexCount);
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

    const hexIndex = getHexIndexFromMouseCoords(e.clientX, e.clientY, viewMatrix, config.mapSideLength);
    
    const newMask = makeHexColorMask(Math.floor(Math.random() * 14), Math.floor(Math.random() * 14), Math.floor(Math.random() * 2));
    const updatedHexIndices = mapState.logic.setHexOwner(hexIndex, newMask);
    
    modifyBuffer(gl, bufferFill, hexIndex, [newMask]);
    
    for (const hexToUpdateIndex of updatedHexIndices) {
      modifyBuffer(gl, bufferEdge, hexToUpdateIndex, [mapState.data.calculatedEdgeMasks[hexToUpdateIndex]]);
    }
    
    currentlyHighlighted = UNASSIGNED_PROVINCE_ID; 
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

  const endDrag = (/** @type {{ pointerId: number; }} */ e) => {
    if (!dragging) { return; }
    dragging = false;

    highlightCanvas.releasePointerCapture(e.pointerId);
    scheduleRender();
  };
  
  highlightCanvas.addEventListener("pointerup", endDrag);
  highlightCanvas.addEventListener("pointerleave", endDrag);
  window.addEventListener("resize", onResize);

  function onInputChange() {
    gl.uniform3fv(mainHexProgramLocations.fillColors, getScaledRgbColors(+bInput.value, +sInput.value, COLOR_TABLE_FILL));
    gl2.uniform3fv(secondHexProgramLocations.fillColors, getScaledRgbColors(+bInput.value * 1.2, +sInput.value * 1.2, COLOR_TABLE_FILL));
    scheduleRender();
  }

  bInput.addEventListener("input", onInputChange);
  sInput.addEventListener("input", onInputChange);

}