import {getHexNeighbors} from "./hexLogicHelper.js";
import {UNASSIGNED_PROVINCE_ID} from "./config.js";

export function syncProvinceCache(
  provinceId,
  mainProvinceArray,
  hexOwners,
  hexEdgeMasks,
) {
  const province = mainProvinceArray[provinceId];
  if (!province || province.hexes.length === 0) return;

  province.owners = new Float32Array(
    province.hexes.map((hex) => hexOwners[hex]),
  );
  province.edgeMasks = new Float32Array(
    province.hexes.map((hex) => hexEdgeMasks[hex]),
  );
  province.indices = new Float32Array(province.hexes);
}

export function handleProvinceRecalculation(
  hexIndex,
  mainProvinceArray,
  hexProvinceIds,
  hexOwners,
  hexEdgeMasks,
  selectedMapSideLength,
) {
  const oldProvinceId = hexProvinceIds[hexIndex];
  const newOwner = hexOwners[hexIndex];

  if (oldProvinceId !== UNASSIGNED_PROVINCE_ID) {
    removeFromProvince(
      hexIndex,
      oldProvinceId,
      mainProvinceArray,
      hexProvinceIds,
      hexOwners,
      hexEdgeMasks,
      selectedMapSideLength,
    );
  }

  hexProvinceIds[hexIndex] = UNASSIGNED_PROVINCE_ID;

  mergeOrCreateProvince(
    hexIndex,
    newOwner,
    mainProvinceArray,
    hexProvinceIds,
    hexOwners,
    hexEdgeMasks,
    selectedMapSideLength,
  );
}

export function removeFromProvince(
  hexIndex,
  provinceId,
  mainProvinceArray,
  hexProvinceIds,
  hexOwners,
  hexEdgeMasks,
  selectedMapSideLength,
) {
  const province = mainProvinceArray[provinceId];
  const hexPos = province.hexes.indexOf(hexIndex);
  if (hexPos === -1) return;

  province.hexes.splice(hexPos, 1);
  hexProvinceIds[hexIndex] = UNASSIGNED_PROVINCE_ID;

  if (province.hexes.length > 0) {
    const neighbors = getHexNeighbors(hexIndex, selectedMapSideLength);
    let provinceNeighborsCount = 0;
    for (let i = 0; i < neighbors.length; i++) {
      if (hexProvinceIds[neighbors[i]] === provinceId) {
        provinceNeighborsCount++;
      }
    }

    if (provinceNeighborsCount > 1) {
      handleProvinceSplit(
        provinceId,
        mainProvinceArray,
        hexProvinceIds,
        hexOwners,
        hexEdgeMasks,
        selectedMapSideLength,
      );
    } else {
      syncProvinceCache(
        provinceId,
        mainProvinceArray,
        hexOwners,
        hexEdgeMasks,
      );
    }
  } else {
    province.owners = province.edgeMasks = province.indices = null;
  }
}

export function handleProvinceSplit(
  provinceId,
  mainProvinceArray,
  hexProvinceIds,
  hexOwners,
  hexEdgeMasks,
  selectedMapSideLength,
) {
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
        if (!visited[n] && hexProvinceIds[n] === provinceId) {
          visited[n] = true;
          stack.push(n);
        }
      }
    }
    groups.push(group);
  }

  if (groups.length > 1) {
    province.hexes = groups[0];
    syncProvinceCache(provinceId, mainProvinceArray, hexOwners, hexEdgeMasks);
    for (let i = 1; i < groups.length; i++) {
      const newId = mainProvinceArray.length;
      mainProvinceArray[newId] = {hexes: groups[i]};
      for (let j = 0; j < groups[i].length; j++) {
        hexProvinceIds[groups[i][j]] = newId;
      }
      syncProvinceCache(newId, mainProvinceArray, hexOwners, hexEdgeMasks);
    }
  } else {
    syncProvinceCache(provinceId, mainProvinceArray, hexOwners, hexEdgeMasks);
  }
}

export function mergeOrCreateProvince(
  hexIndex,
  newOwner,
  mainProvinceArray,
  hexProvinceIds,
  hexOwners,
  hexEdgeMasks,
  selectedMapSideLength,
) {
  const neighbors = getHexNeighbors(hexIndex, selectedMapSideLength);
  const targetProvinces = [];

  for (let i = 0; i < neighbors.length; i++) {
    const nId = hexProvinceIds[neighbors[i]];
    if (nId === UNASSIGNED_PROVINCE_ID) continue;

    let alreadyAdded = false;
    for (let j = 0; j < targetProvinces.length; j++) {
      if (targetProvinces[j] === nId) {
        alreadyAdded = true;
        break;
      }
    }
    if (alreadyAdded) continue;

    const firstHexOfProvince = mainProvinceArray[nId].hexes[0];
    if (hexOwners[firstHexOfProvince] === newOwner) {
      targetProvinces.push(nId);
    }
  }

  if (targetProvinces.length > 0) {
    const masterId = targetProvinces[0];
    const masterProvince = mainProvinceArray[masterId];

    hexProvinceIds[hexIndex] = masterId;
    masterProvince.hexes.push(hexIndex);

    for (let i = 1; i < targetProvinces.length; i++) {
      const otherId = targetProvinces[i];
      const otherProvince = mainProvinceArray[otherId];

      for (let j = 0; j < otherProvince.hexes.length; j++) {
        const h = otherProvince.hexes[j];
        hexProvinceIds[h] = masterId;
        masterProvince.hexes.push(h);
      }
      otherProvince.hexes = [];
      otherProvince.owners = otherProvince.edgeMasks = otherProvince.indices = null;
    }
    syncProvinceCache(masterId, mainProvinceArray, hexOwners, hexEdgeMasks);
  } else {
    const newProvinceId = mainProvinceArray.length;
    hexProvinceIds[hexIndex] = newProvinceId;
    mainProvinceArray[newProvinceId] = {hexes: [hexIndex]};
    syncProvinceCache(
      newProvinceId,
      mainProvinceArray,
      hexOwners,
      hexEdgeMasks,
    );
  }
}