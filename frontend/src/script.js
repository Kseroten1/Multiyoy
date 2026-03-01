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
import {getHexIndexFromMouseCoords, getHexNeighbors} from "./utils/hexLogicHelper.js";

const state = {
  renderRequestId: null,
};

const mapSideLength = {
  SMALL: 32,
  MEDIUM: 64,
  LARGE: 128,
  HUGE: 256,
  EXTRA: 512,
  YEAR10: 1024,
  LIFETIME: 2048
};

const PLAYER_COUNTS = {
  [mapSideLength.SMALL]: 4,
  [mapSideLength.MEDIUM]: 16,
  [mapSideLength.LARGE]: 32,
  [mapSideLength.HUGE]: 64,
  [mapSideLength.EXTRA]: 128,
  [mapSideLength.YEAR10]: 256,
  [mapSideLength.LIFETIME]: 378
};

export const selectedMapSideLength = mapSideLength.LIFETIME;
const totalHexCount = selectedMapSideLength ** 2;

export const CONFIG = {
  defaultBorderWidth: 0.1,
  playerCount: PLAYER_COUNTS[selectedMapSideLength],
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

const mapState = new MapState(CONFIG.playerCount, selectedMapSideLength ** 2);

function createHexOwners(playerCount) {
  const owners = [];
  for (let i = 0; i < COLOR_TABLE_FILL.length; i++) {
    for (let j = 0; j < COLOR_TABLE_FILL.length; j++) {
      for (let k = 0; k < 2; k++) {
        if (owners.length >= playerCount) break;
        if (i === j && k === 1) {
          break;
        }
        owners.push(makeHexColorMask(i, j, k));
      }
      if (owners.length >= playerCount) break;
    }
    if (owners.length >= playerCount) break;
  }
  return owners;
}

const possibleHexOwners = createHexOwners(CONFIG.playerCount);
const unassignedHexes = [];
function mapInit() {
  for (let i = 0; i < totalHexCount; i++) {
    mapState.setHexStateIndex(i, 1);
    mapState.setHexOwner(i, 0);
    mapState.setHexProvinceId(i, -1);
    // TODO: uniemożliwić losowanie koloru U**ainy
    mapState.calculatedEdgeMasks[i] = 0b000000;
    unassignedHexes[i] = i;
  }
}
mapInit();
const mainProvinceArray = [];

function addToIndex(index, hexId) {
  // If no array exists at this index yet, create it
  if (!mainProvinceArray[index]) {
    mainProvinceArray[index] = {
      hexes: [],
      owners: null,
      edgeMasks: null,
      indices: null
    };
  }
  mainProvinceArray[index].hexes.push(hexId);
}

const bufferIndex = initBuffer(gl,
  mainHexProgramLocations.hexIndexAttrib,
  unassignedHexes,
  1,
)

function generateMap() {
  const hexesPerProvince = selectedMapSideLength/2;
  const branchingChance = 0.5; 
  let provinceId = 0;

  while (unassignedHexes.length > 0) {
    const randomIndex = Math.floor(Math.random() * unassignedHexes.length);
    const startHex = unassignedHexes[randomIndex];
    
    unassignedHexes[randomIndex] = unassignedHexes[unassignedHexes.length - 1];
    unassignedHexes.pop();

    const playerIdx = (provinceId % (CONFIG.playerCount - 1)) + 1;
    const ownerMask = possibleHexOwners[playerIdx];

    if (mapState.getHexOwner(startHex) !== 0 || getHexNeighbors(startHex).some(n => mapState.getHexOwner(n) === ownerMask)) continue;

    let history = [startHex];
    let count = 0;

    while (count < hexesPerProvince && history.length > 0) {
      const current = history[history.length - 1];

      if (mapState.getHexOwner(current) === 0) {
        mapState.setHexOwner(current, ownerMask);
        mapState.setHexProvinceId(current, provinceId);
        addToIndex(provinceId, current);
        count++;
      }

      const neighbors = getHexNeighbors(current).filter(n =>
        mapState.getHexOwner(n) === 0 &&
        !getHexNeighbors(n).some(nn => mapState.getHexOwner(nn) === ownerMask && mapState.getHexProvinceId(nn) !== provinceId)
      );

      if (neighbors.length > 0) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        history.push(next);
        if (Math.random() > branchingChance) {
          history.splice(history.length - 2, 1);
        }
      } else {
        history.pop();
      }
    }
    provinceId++;
  }
}

generateMap();

function precalculateProvinces() {
  for (let i = 0; i < mainProvinceArray.length; i++) {
    const province = mainProvinceArray[i];
    if (!province) continue;
    province.owners = new Float32Array(province.hexes.map(hex => mapState.hexOwners[hex]));
    province.edgeMasks = new Float32Array(province.hexes.map(hex => mapState.calculatedEdgeMasks[hex]));
    province.indices = new Float32Array(province.hexes);
  }
}

function generateHexMaskFirst() {
  for (let i = 0; i < totalHexCount - 1; i++) {
    const r = Math.floor(i / selectedMapSideLength);
    const isRowOdd = (r & 1) !== 0;
    const indexDownRight = i + selectedMapSideLength + isRowOdd;
    const indexDownLeft = i + selectedMapSideLength + isRowOdd - 1;

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
precalculateProvinces();

const emptyData = new Float32Array(totalHexCount);

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

//mamy mapState -> ile zajmie odczytanie randomowej prowincji ze wszystkimi jej informacjami 

onResize();
scheduleRender();
initEventHandlers();

let currentlyHighlighted = -1;
let highlightHexCount = 0;
function highlightHex(mouseX, mouseY) {
  const hexIndex = getHexIndexFromMouseCoords(mouseX, mouseY, viewMatrix);
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

    const hexIndex = getHexIndexFromMouseCoords(e.clientX, e.clientY, viewMatrix);
    
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

// for (let i = 0; i < 1000; i++) {
//
// }