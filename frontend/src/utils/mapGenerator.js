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
  yield { stage: "Allocating memory", progress: 0 };
  const hexCount = mapData.hexCount;
  const sideLength = Math.sqrt(hexCount);
  const playerCount = mapData.playerCount;

  yield { stage: "Allocating memory", progress: 10 };
  mapData.hexStates.fill(1);

  yield { stage: "Allocating memory", progress: 30 };
  const unassignedHexes = Array.from({length: hexCount}, (_, i) => i);
  const hexToUnassignedIndex = new Int32Array(hexCount);
  for (let i = 0; i < hexCount; i++) {
    hexToUnassignedIndex[i] = i;
  }

  yield { stage: "Allocating memory", progress: 50 };
  const possibleHexOwners = createHexOwners(playerCount);

  yield { stage: "Allocating memory", progress: 70 };
  const hexesPerProvince = Math.max(1, Math.floor(sideLength / 2));
  const expectedProvinceCount = Math.ceil(hexCount / hexesPerProvince) + playerCount * 2;
  mapData.ensureProvinceCapacity(expectedProvinceCount);

  yield { stage: "Allocating memory", progress: 90 };
  const branchingChance = 0.5;
  const hexCountsPerPlayer = new Int32Array(playerCount);

  yield { stage: "Allocating memory", progress: 100 };

  yield { stage: "Generating provinces", progress: 0 };
  let assignedHexCount = 0;
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

    const lastHex = /** @type {number} */ (unassignedHexes.at(-1));
    unassignedHexes[randomIndex] = lastHex;
    hexToUnassignedIndex[lastHex] = randomIndex;
    unassignedHexes.pop();
    hexToUnassignedIndex[startHex] = -1;
    
    mapData.hexOwners[startHex] = currentOwnerMask;
    mapLogic.mergeOrCreateProvince(startHex, currentOwnerMask);
    hexCountsPerPlayer[playerIdx]++;
    assignedHexCount++;

    const history = [startHex];
    let count = 1;

    while (count < hexesPerProvince && history.length > 0) {
      const current = history[history.length - 1];

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
        
        mapData.hexOwners[next] = currentOwnerMask;
        mapLogic.mergeOrCreateProvince(next, currentOwnerMask);

        const pos = hexToUnassignedIndex[next];
        if (pos !== -1) {
          const lastHex = /** @type {number} */ (unassignedHexes.at(-1));
          unassignedHexes[pos] = lastHex;
          hexToUnassignedIndex[lastHex] = pos;
          unassignedHexes.pop();
          hexToUnassignedIndex[next] = -1;
        }

        hexCountsPerPlayer[playerIdx]++;
        assignedHexCount++;
        count++;

        history.push(next);
        if (Math.random() > branchingChance) {
          history.splice(history.length - 2, 1);
        }
      } else {
        history.pop();
      }
    }


    const reportStep = Math.max(1, Math.floor(hexCount / 10));
    if (assignedHexCount % reportStep === 0) {
      const progress = Math.floor((assignedHexCount / hexCount) * 100);
      yield { stage: "Generating provinces", progress };
    }
  }
  
  yield { stage: "Generating provinces", progress: 100 };
  
  yield { stage: "Finalizing map", progress: 0 };
  for (const progress of mapLogic.recalculateAllProvinces(false)) {
    yield { stage: "Finalizing map (provinces)", progress };
  }
  for (const progress of mapLogic.recalculateAllHexEdgeMasks()) {
    yield { stage: "Finalizing map (edge masks)", progress };
  }
}
