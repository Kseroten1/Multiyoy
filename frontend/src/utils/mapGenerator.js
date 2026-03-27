import {COLOR_TABLE_FILL} from "./config.js";
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

const config = {
  defaultBorderWidth: 0.1,
  mapSideLength: selectedMapSideLength,
  totalHexCount: selectedMapSideLength ** 2,
  playerCount: PLAYER_COUNTS[selectedMapSideLength],
  
};

const mapState = new MapState(config.playerCount, selectedMapSideLength ** 2);

/** @type {Set<number>[]} */
const mainProvinceArray = [];
const unassignedHexes = [];

function addToIndex(index, hexId) {
  // If no Set exists at this index yet, create it
  mainProvinceArray[index] ??= new Set();
  mainProvinceArray[index].add(hexId);
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

const possibleHexOwners = createHexOwners(config.playerCount);

function mapInit() {
  mainProvinceArray.length = 0;

  mapState.hexStates.fill(1);
  for (let i = 0; i < config.totalHexCount; i++) {
    unassignedHexes[i] = i;
  }
}


/**
 * @returns {Generator<number>} Yields the current provinceId after each province is fully populated.
 */
export function* populateProvinces() {
  const hexesPerProvince = Math.max(1, Math.floor(selectedMapSideLength / 2));
  const branchingChance = 0.5;
  let provinceId = 1;
  let skippedHexes = 0;

  const hexCountsPerPlayer = new Int32Array(config.playerCount);

  while (unassignedHexes.length > 0) {
    let playerIdx = -1;
    let minHexCount = Infinity;

    for (let pId = 0; pId < config.playerCount; pId++) {
      if (hexCountsPerPlayer[pId] < minHexCount) {
        minHexCount = hexCountsPerPlayer[pId];
        playerIdx = pId;
      }
    }

    const currentOwnerMask = possibleHexOwners[playerIdx];

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
        mapState.setHexOwner(current, currentOwnerMask);
        mapState.setHexProvinceId(current, provinceId);
        addToIndex(provinceId, current);
        hexCountsPerPlayer[playerIdx]++;
        count++;
      }

      const neighbors = mapState.getUnownedHexNeighbors(current);
      let validNeighborCount = 0;
      for (let i = 0; i < neighbors.length; i++) {
        const n = neighbors[i];
        //if hexes do not collude
        if (!mapState.checkHexCollusion(n)) {
          neighbors[validNeighborCount++] = n;
        }
      }

      if (validNeighborCount > 0) {
        const next = neighbors[Math.floor(Math.random() * validNeighborCount)];
        history.push(next);
        if (Math.random() > branchingChance) {
          history.splice(history.length - 2, 1);
        }
      } else {
        history.pop();
      }
    }

    yield provinceId;
    provinceId++;
  }
}

/**
 * @returns {{
 *   generatedMap: MapState,
 *   config: {
 *     defaultBorderWidth: number,
 *     mapSideLength: number,
 *     totalHexCount: number,
 *     playerCount: number,
 *   },
 *   totalHexCount: number,
 *   mapSideLength: number,
 *   provinceHexIdsByProvinceId: Set<number>[],
 * }}
 */
export function createMap() {
  mapInit();
  return {
    generatedMap: mapState,
    config: config,
    provinceHexIdsByProvinceId: mainProvinceArray,
  };
}