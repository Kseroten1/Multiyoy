import {getHexNeighbors} from "./hexLogicHelper.js";
import {UNASSIGNED_PROVINCE_ID} from "./config.js";

export function syncProvinceCache(provinceId, mainProvinceArray, mapState) {
  const province = mainProvinceArray[provinceId];
  if (!province || province.hexes.length === 0) return;

  province.owners = new Float32Array(province.hexes.map(h => mapState.getHexOwner(h)));
  province.edgeMasks = new Float32Array(province.hexes.map(h => mapState.calculatedEdgeMasks[h]));
  province.indices = new Float32Array(province.hexes);
}

export function handleProvinceRecalculation(hexIndex, mainProvinceArray, mapState, selectedMapSideLength) {
  const oldProvinceId = mapState.getHexProvinceId(hexIndex);
  const newOwner = mapState.getHexOwner(hexIndex);

  if (oldProvinceId !== UNASSIGNED_PROVINCE_ID) {
    removeFromProvince(hexIndex, oldProvinceId, mainProvinceArray, mapState, selectedMapSideLength);
  }

  mapState.setHexProvinceId(hexIndex, UNASSIGNED_PROVINCE_ID);

  mergeOrCreateProvince(hexIndex, newOwner, mainProvinceArray, mapState, selectedMapSideLength);
}

export function removeFromProvince(hexIndex, provinceId, mainProvinceArray, mapState, selectedMapSideLength) {
  const province = mainProvinceArray[provinceId];
  const hexPos = province.hexes.indexOf(hexIndex);
  if (hexPos === -1) return;

  province.hexes.splice(hexPos, 1);
  mapState.setHexProvinceId(hexIndex, UNASSIGNED_PROVINCE_ID);

  if (province.hexes.length > 0) {
    const neighbors = getHexNeighbors(hexIndex, selectedMapSideLength);
    let provinceNeighborsCount = 0;
    for (let i = 0; i < neighbors.length; i++) {
      if (mapState.getHexProvinceId(neighbors[i]) === provinceId) {
        provinceNeighborsCount++;
      }
    }

    if (provinceNeighborsCount > 1) {
      handleProvinceSplit(provinceId, mainProvinceArray, mapState, selectedMapSideLength);
    } else {
      syncProvinceCache(provinceId, mainProvinceArray, mapState);
    }
  } else {
    province.owners = province.edgeMasks = province.indices = null;
  }
}

export function handleProvinceSplit(provinceId, mainProvinceArray, mapState, selectedMapSideLength) {
  const province = mainProvinceArray[provinceId];
  const groups = [];
  const visited = {};

  for (let i = 0; i < province.hexes.length; i++) {
    const startHex = province.hexes[i];
    if (visited[startHex]) continue;

    const group = [];
    const stack = [startHex];
    visited[startHex] = true;

    while (stack.length > 0) {
      const curr = stack.pop();
      group.push(curr);

      const neighbors = getHexNeighbors(curr, selectedMapSideLength);
      for (let j = 0; j < neighbors.length; j++) {
        const n = neighbors[j];
        // Check if neighbor belongs to this province and hasn't been visited
        if (!visited[n] && mapState.getHexProvinceId(n) === provinceId) {
          visited[n] = true;
          stack.push(n);
        }
      }
    }
    groups.push(group);
  }

  if (groups.length > 1) {
    province.hexes = groups[0];
    syncProvinceCache(provinceId, mainProvinceArray, mapState);
    for (let i = 1; i < groups.length; i++) {
      const newId = mainProvinceArray.length;
      mainProvinceArray[newId] = { hexes: groups[i] };
      for (let j = 0; j < groups[i].length; j++) {
        mapState.setHexProvinceId(groups[i][j], newId);
      }
      syncProvinceCache(newId, mainProvinceArray, mapState);
    }
  } else {
    syncProvinceCache(provinceId, mainProvinceArray, mapState);
  }
}

export function mergeOrCreateProvince(hexIndex, newOwner, mainProvinceArray, mapState, selectedMapSideLength) {
  const neighbors = getHexNeighbors(hexIndex, selectedMapSideLength);
  const targetProvinces = [];

  for (let i = 0; i < neighbors.length; i++) {
    const nId = mapState.getHexProvinceId(neighbors[i]);
    if (nId === UNASSIGNED_PROVINCE_ID) continue;

    // Check if we already added this province to the list
    let alreadyAdded = false;
    for (let j = 0; j < targetProvinces.length; j++) {
      if (targetProvinces[j] === nId) {
        alreadyAdded = true;
        break;
      }
    }
    if (alreadyAdded) continue;

    const firstHexOfProvince = mainProvinceArray[nId].hexes[0];
    if (mapState.getHexOwner(firstHexOfProvince) === newOwner) {
      targetProvinces.push(nId);
    }
  }

  if (targetProvinces.length > 0) {
    const masterId = targetProvinces[0];
    const masterProvince = mainProvinceArray[masterId];

    mapState.setHexProvinceId(hexIndex, masterId);
    masterProvince.hexes.push(hexIndex);

    for (let i = 1; i < targetProvinces.length; i++) {
      const otherId = targetProvinces[i];
      const otherProvince = mainProvinceArray[otherId];

      for (let j = 0; j < otherProvince.hexes.length; j++) {
        const h = otherProvince.hexes[j];
        mapState.setHexProvinceId(h, masterId);
        masterProvince.hexes.push(h);
      }
      otherProvince.hexes = [];
      otherProvince.owners = otherProvince.edgeMasks = otherProvince.indices = null;
    }
    syncProvinceCache(masterId, mainProvinceArray, mapState);
  } else {
    const newProvinceId = mainProvinceArray.length;
    mapState.setHexProvinceId(hexIndex, newProvinceId);
    mainProvinceArray[newProvinceId] = { hexes: [hexIndex] };
    syncProvinceCache(newProvinceId, mainProvinceArray, mapState);
  }
}
