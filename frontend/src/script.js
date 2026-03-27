/** @type {string} */
import vertexShaderString from './shaders/vertexShader.glsl?raw';
/** @type {string} */
import fragmentShaderString from './shaders/fragmentShader.glsl?raw';
import {COLOR_TABLE_FILL, UNASSIGNED_PROVINCE_ID, INVALID_HEX_INDEX} from './utils/config.js';
import {buildWebGLProgram, getShaderLocations, initBuffer, modifyBuffer} from "./utils/glUtils.js";
import {getScaledRgbColors} from "./utils/convertOklchToRgb.js";
import {updateBrightnessAndSaturationMax} from "./utils/updateBrightnessAndSaturationMax.js";
import {makeHexColorMask} from "./utils/math.js";
import {getHexIndexFromMouseCoords} from "./utils/hexLogicHelper.js";
import {createMap, populateProvinces} from "./utils/mapGenerator.js";

const {
  generatedMap,
  config,
  provinceHexIdsByProvinceId,
} = createMap();

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
const viewMatrix = new DOMMatrix().scaleSelf(0.8);
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
  context.uniform1f(programLocations.borderWidth, config.defaultBorderWidth);
  context.uniform1i(programLocations.mapWidth, config.mapSideLength);
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
  generatedMap.fillMasksArray,
  1,
);

const bufferEdge = initBuffer(
  gl,
  mainHexProgramLocations.edgeMask,
  generatedMap.calculatedEdgeMasks,
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
animateMapGeneration();


/**
 * 
 * @param generator {Iterable<number>} An iterable that yields provinceIds.
 * @param batchSize {number} The number of provinces to process before calling onUpdate.
 * @param onUpdate { () => void } A callback function to update buffers and schedule a render.
 */
async function processInBatches(generator, batchSize, onUpdate) {
  let count = 0;
  for (const _ of generator) {
    count++;
    if (count % batchSize === 0) {
      onUpdate?.();
      await new Promise(requestAnimationFrame);
    }
  }
  onUpdate?.();
}

async function animateMapGeneration() {
  const batchSize = Math.ceil(config.mapSideLength) * 5;
  await processInBatches(
    populateProvinces(),
    batchSize,
    () => {
      modifyBuffer(gl, bufferFill, 0, generatedMap.fillMasksArray);
      scheduleRender();
    },
  );

  generatedMap.generateHexMaskFirst();
  modifyBuffer(gl, bufferEdge, 0, generatedMap.calculatedEdgeMasks);
  scheduleRender();
}

let currentlyHighlighted = UNASSIGNED_PROVINCE_ID;
let highlightHexCount = 0;

function highlightHex(mouseX, mouseY) {
  const hexIndex = getHexIndexFromMouseCoords(mouseX, mouseY, viewMatrix, config.mapSideLength);
  if (hexIndex === INVALID_HEX_INDEX) return;
  const provinceId = generatedMap.getHexProvinceId(hexIndex);
  if (provinceId === UNASSIGNED_PROVINCE_ID || currentlyHighlighted === provinceId) {return;}
  
  const renderData = generatedMap.getProvinceRenderData(provinceId, provinceHexIdsByProvinceId[provinceId]);
  
  highlightHexCount = renderData.count;
  
  gl2.uniform1i(secondHexProgramLocations.hexIndex, hexIndex);
  modifyBuffer(gl2, secondHexIndexBuffer, 0, renderData.indices);
  gl2.uniform3fv(secondHexProgramLocations.fillColors, getScaledRgbColors(bInput.value * 1.5, sInput.value * 1.5, COLOR_TABLE_FILL))
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
    const updatedHexIndices = generatedMap.setHexOwner(hexIndex, newMask, provinceHexIdsByProvinceId);
    
    modifyBuffer(gl, bufferFill, hexIndex, [newMask]);
    
    for (const hexToUpdateIndex of updatedHexIndices) {
      modifyBuffer(gl, bufferEdge, hexToUpdateIndex, [generatedMap.calculatedEdgeMasks[hexToUpdateIndex]]);
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