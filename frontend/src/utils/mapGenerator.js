import {getHexNeighbors} from "./hexLogicHelper.js";
import {COLOR_TABLE_FILL, UNASSIGNED_PROVINCE_ID} from "./config.js";
import {makeHexColorMask} from "./math.js";
import {MapState} from "./mapState.js";

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

const selectedMapSideLength = mapSideLength.LIFETIME;
const totalHexCount = selectedMapSideLength ** 2;

const CONFIG = {
  defaultBorderWidth: 0.1,
  playerCount: PLAYER_COUNTS[selectedMapSideLength],
};

const mapState = new MapState(CONFIG.playerCount, selectedMapSideLength ** 2);

/** @type {number[][]} */
const mainProvinceArray = [];
const unassignedHexes = [];

function addToIndex(index, hexId) {
  // If no array exists at this index yet, create it
  mainProvinceArray[index] ??= [];
  mainProvinceArray[index].push(hexId);
}

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

function mapInit() {
  mainProvinceArray.length = 0;
  unassignedHexes.length = 0;

  for (let i = 0; i < totalHexCount; i++) {
    mapState.setHexStateIndex(i, 1);
    mapState.setHexOwner(i, 0);
    mapState.setHexProvinceId(i, UNASSIGNED_PROVINCE_ID);
    mapState.calculatedEdgeMasks[i] = 0b000000;
    unassignedHexes[i] = i;
  }
}

export function* generateMap() {
  const hexesPerProvince = Math.max(1, Math.floor(selectedMapSideLength / 2));
  const branchingChance = 0.5;
  let provinceId = 0;
  let skippedHexes = 0;

  const hexCountsPerPlayer = new Int32Array(CONFIG.playerCount);

  while (unassignedHexes.length > 0) {
    let playerIdx = -1;
    let minHexCount = Infinity;

    for (let pId = 1; pId < CONFIG.playerCount; pId++) {
      if (hexCountsPerPlayer[pId] < minHexCount) {
        minHexCount = hexCountsPerPlayer[pId];
        playerIdx = pId;
      }
    }

    const ownerMask = possibleHexOwners[playerIdx];

    const randomIndex = Math.floor(Math.random() * unassignedHexes.length);
    const startHex = unassignedHexes[randomIndex];

    unassignedHexes[randomIndex] = unassignedHexes[unassignedHexes.length - 1];
    unassignedHexes.pop();

    skippedHexes = 0;

    const history = [startHex];
    let count = 0;

    while (count < hexesPerProvince && history.length > 0) {
      const current = history[history.length - 1];

      if (mapState.getHexOwner(current) === 0) {
        mapState.setHexOwner(current, ownerMask);
        mapState.setHexProvinceId(current, provinceId);
        addToIndex(provinceId, current);
        hexCountsPerPlayer[playerIdx]++;
        count++;
      }

      const neighbors = getHexNeighbors(
        current,
        selectedMapSideLength
      ).filter(
        (n) =>
          mapState.getHexOwner(n) === 0 &&
          !getHexNeighbors(n, selectedMapSideLength).some(
            (nn) =>
              mapState.getHexOwner(nn) === ownerMask &&
              mapState.getHexProvinceId(nn) !== provinceId
          )
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
    yield provinceId;
  }
}

export function generateHexMaskFirst() {
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

/**
 * @returns {{
 *   mapState: MapState,
 *   CONFIG: {
 *     defaultBorderWidth: number,
 *     playerCount: number
 *   },
 *   totalHexCount: number,
 *   selectedMapSideLength: number,
 *   mainProvinceArray: number[][],
 * }}
 */
export function setupMap() {
  mapInit();
  return {
    mapState: mapState,
    CONFIG: CONFIG,
    totalHexCount: totalHexCount,
    selectedMapSideLength: selectedMapSideLength,
    mainProvinceArray: mainProvinceArray,
  };
}