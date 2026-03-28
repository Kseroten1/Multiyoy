import { COLOR_TABLE_FILL } from "./config.js";
import {makeHexColorMask} from "./math.js";

/** @typedef {import("./mapData.js").MapData} MapData */
/** @typedef {import("./mapLogic.js").MapLogic} MapLogic */

/**
 * @param {number} playerCount
 */
export function createHexOwners(playerCount) {
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

/**
 * @param {MapData} mapData
 * @param {MapLogic} mapLogic
 */
export function* generateSlayLikeMap(mapData, mapLogic) {
  const hexCount = mapData.hexCount;
  const sideLength = Math.sqrt(hexCount);
  const playerCount = mapData.playerCount;

  mapData.hexStates.fill(1);
  const unassignedHexes = Array.from({length: hexCount}, (_, i) => i);
  const possibleHexOwners = createHexOwners(playerCount);

  const hexesPerProvince = Math.max(1, Math.floor(sideLength / 2));
  const branchingChance = 0.5;
  let generatedProvinceCount = 0;
  const hexCountsPerPlayer = new Int32Array(playerCount);

  while (unassignedHexes.length > 0) {
    let playerIdx = -1;
    let minHexCount = Infinity;

    for (let pId = 0; pId < playerCount; pId++) {
      const currentPlayerHexCount = /** @type {number} */ (hexCountsPerPlayer[pId]);
      if (currentPlayerHexCount < minHexCount) {
        minHexCount = currentPlayerHexCount;
        playerIdx = pId;
      }
    }

    const currentOwnerMask = possibleHexOwners[playerIdx];

    const randomIndex = Math.floor(Math.random() * unassignedHexes.length);
    const startHex = unassignedHexes[randomIndex];

    unassignedHexes[randomIndex] = /** @type {number} */ (unassignedHexes.at(-1));
    unassignedHexes.pop();
    
    const history = [startHex];
    let count = 0;
    let lastAssignedProvinceId = -1;

    while (count < hexesPerProvince && history.length > 0) {
      const current = history[history.length - 1];

      if (mapData.hexOwners[current] === 0) {
        mapLogic.setHexOwner(current, currentOwnerMask);
        lastAssignedProvinceId = mapData.hexProvinceIds[current];
        hexCountsPerPlayer[playerIdx]++;
        count++;
      }

      const neighbors = mapLogic.getUnownedHexNeighbors(current);
      let validNeighborCount = 0;
      for (let i = 0; i < neighbors.length; i++) {
        const n = neighbors[i];
        if (!mapLogic.checkHexCollusion(n)) {
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

    yield lastAssignedProvinceId;
    generatedProvinceCount++;
  }
  
  mapLogic.recalculateAllHexEdgeMasks();
}
