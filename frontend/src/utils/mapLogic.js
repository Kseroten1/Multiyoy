import {UNASSIGNED_PROVINCE_ID} from "./config.js";
import {getHexNeighbors} from "./hexLogicHelper.js";

export class MapLogic {
  /**
   * @param {import("./mapData.js").MapData} mapData
   */
  constructor(mapData) {
    this.mapData = mapData;
    this.sideLength = Math.sqrt(mapData.hexCount);
  }

  /**
   * @param index {number}
   * @param value {number}
   * @returns number[]
   */
  setHexOwner(index, value) {
    this.mapData.hexOwners[index] = value;
    
    const updatedHexIndices = [index];

    this.#recalculateProvince(index);
    
    const neighbors = getHexNeighbors(index, this.sideLength);
    const hexToUpdateMask = [index, ...neighbors];
    this.#calculateHexMaskIndex(hexToUpdateMask);
    
    for (const neighborIndex of neighbors) {
      updatedHexIndices.push(neighborIndex);
    }

    return updatedHexIndices;
  }

  /**
   * @param hexIndex {number}
   */
  #recalculateProvince(hexIndex) {
    const oldProvinceId = this.mapData.hexProvinceIds[hexIndex];
    const newOwner = this.mapData.hexOwners[hexIndex];

    if (oldProvinceId !== UNASSIGNED_PROVINCE_ID) {
      this.removeFromProvince(hexIndex);
    }

    this.mapData.hexProvinceIds[hexIndex] = UNASSIGNED_PROVINCE_ID;
    this.mergeOrCreateProvince(hexIndex, newOwner);
  }

  /**
   * @param hexIndex {number}
   */
  removeFromProvince(hexIndex) {
    const provinceId = this.mapData.hexProvinceIds[hexIndex];

    const province = this.mapData.provinceHexIdsByProvinceId[provinceId];
    if (!province || !province.has(hexIndex)) return;

    const needsSplitCheck = this.countNeighborsInProvince(hexIndex) > 1;

    province.delete(hexIndex);
    this.mapData.hexProvinceIds[hexIndex] = UNASSIGNED_PROVINCE_ID;

    if (province.size > 0 && needsSplitCheck) {
      this.handleSplitProvinceChance(provinceId);
    }
  }

  /**
   * @param provinceId {number}
   */
  handleSplitProvinceChance(provinceId) {
    const province = this.mapData.provinceHexIdsByProvinceId[provinceId];
    const groups = [];
    const visited = new Set();
    
    for (const startHex of province) {
      if (visited.has(startHex)) continue;

      const group = new Set();
      const stack = [startHex];
      visited.add(startHex);

      while (stack.length > 0) {
        const curr = stack.pop();
        group.add(curr);

        const neighbors = getHexNeighbors(curr, this.sideLength);
        for (const n of neighbors) {
          if (!visited.has(n) && this.mapData.hexProvinceIds[n] === provinceId) {
            visited.add(n);
            stack.push(n);
          }
        }
      }
      groups.push(group);
    }

    if (groups.length > 1) {
      this.mapData.provinceHexIdsByProvinceId[provinceId] = groups[0];

      for (let i = 1; i < groups.length; i++) {
        const newId = this.mapData.provinceHexIdsByProvinceId.length;
        const newHexes = groups[i];

        this.mapData.provinceHexIdsByProvinceId[newId] = newHexes;
        this.mapData.provinceCount = this.mapData.provinceHexIdsByProvinceId.length;

        for (const h of newHexes) {
          this.mapData.hexProvinceIds[h] = newId;
        }
      }
    }
  }

  /**
   * @param hexIndex {number}
   * @param newOwner {number}
   */
  mergeOrCreateProvince(hexIndex, newOwner) {
    const neighbors = getHexNeighbors(hexIndex, this.sideLength);
    const targetProvinces = [];

    for (const nIdx of neighbors) {
      const nProvinceId = this.mapData.hexProvinceIds[nIdx];

      let exists = false;
      for (const existingId of targetProvinces) {
        if (existingId === nProvinceId) {
          exists = true;
          break;
        }
      }
      if (exists) continue;

      const province = this.mapData.provinceHexIdsByProvinceId[nProvinceId];
      if (province && province.size > 0) {
        const firstHexOfProvince = province.values().next().value;
        if (this.mapData.hexOwners[firstHexOfProvince] === newOwner) {
          targetProvinces.push(nProvinceId);
        }
      }
    }

    if (targetProvinces.length === 0) {
      const newProvinceId = this.mapData.provinceHexIdsByProvinceId.length;
      this.mapData.hexProvinceIds[hexIndex] = newProvinceId;
      this.mapData.provinceHexIdsByProvinceId[newProvinceId] = new Set([hexIndex]);
      this.mapData.provinceCount = this.mapData.provinceHexIdsByProvinceId.length;
      return;
    }

    const masterId = targetProvinces[0];
    const masterProvince = this.mapData.provinceHexIdsByProvinceId[masterId];

    this.mapData.hexProvinceIds[hexIndex] = masterId;
    masterProvince.add(hexIndex);

    for (let i = 1; i < targetProvinces.length; i++) {
      const otherId = targetProvinces[i];
      const otherProvince = this.mapData.provinceHexIdsByProvinceId[otherId];

      for (const h of otherProvince) {
        this.mapData.hexProvinceIds[h] = masterId;
        masterProvince.add(h);
      }

      otherProvince.clear();
    }
  }

  /**
   * @param ownerIndex {number}
   * @returns {number}
   */
  countNeighborsInProvince(ownerIndex) {
    const hexProvinceIds = this.mapData.hexProvinceIds;
    const provinceId = hexProvinceIds[ownerIndex];
    const sideLength = this.sideLength;
    const row = Math.floor(ownerIndex / sideLength);
    const colOffset = (row & 1);
    const column = ownerIndex % sideLength;
    let count = 0;

    if (hexProvinceIds[ownerIndex + 1] === provinceId && column + 1 < sideLength) count++;
    if (hexProvinceIds[ownerIndex - 1] === provinceId && column - 1 >= 0) count++;

    if (row + 1 < sideLength) {
      const rowBelow = ownerIndex + sideLength;
      if (hexProvinceIds[rowBelow + colOffset] === provinceId && column + colOffset < sideLength) count++;
      if (hexProvinceIds[rowBelow + colOffset - 1] === provinceId && column + colOffset - 1 >= 0) count++;
    }

    if (row - 1 >= 0) {
      const rowAbove = ownerIndex - sideLength;
      if (hexProvinceIds[rowAbove + colOffset] === provinceId && column + colOffset < sideLength) count++;
      if (hexProvinceIds[rowAbove + colOffset - 1] === provinceId && column + colOffset - 1 >= 0 ) count++;
    }

    return count;
  }

  /**
   * @param {number[]} indices
   */
  #calculateHexMaskIndex(indices) {
    const sideLength = this.sideLength;
    const neighborMasks = [
      0b000010, // East
      0b010000, // West
      0b000001, // LowerRight
      0b100000, // LowerLeft
      0b000100, // UpperRight
      0b001000  // UpperLeft
    ];

    for (const currentIndex of indices) {
      const neighbors = getHexNeighbors(currentIndex, sideLength);
      const currentOwner = this.mapData.hexOwners[currentIndex];
      let mask = 0;

      for (let i = 0; i < neighbors.length; i++) {
        const neighborId = neighbors[i];
        if (currentOwner !== this.mapData.hexOwners[neighborId]) {
          mask |= neighborMasks[i];
        }
      }

      this.mapData.calculatedEdgeMasks[currentIndex] = mask;
    }
  }

  recalculateAllProvinces() {
    const hexCount = this.mapData.hexCount;
    for (let i = 0; i < hexCount; i++) {
      const owner = this.mapData.hexOwners[i];
      if (owner === 0) continue;
      if (this.mapData.hexProvinceIds[i] !== UNASSIGNED_PROVINCE_ID) continue;

      this.mergeOrCreateProvince(i, owner);
    }
  }

  recalculateAllHexEdgeMasks() {
    const sideLength = this.sideLength;
    const totalHexCount = this.mapData.hexCount;
    const hexOwners = this.mapData.hexOwners;
    const calculatedEdgeMasks = this.mapData.calculatedEdgeMasks;
    calculatedEdgeMasks.fill(0);

    for (let i = 0; i < totalHexCount; i++) {
      const row = Math.floor(i / sideLength);
      const column = i % sideLength;
      const colOffset = row & 1;

      if (column + 1 < sideLength) {
        const currentOwner = hexOwners[i];
        const rightOwner = hexOwners[i + 1];
        if (currentOwner !== rightOwner) {
          calculatedEdgeMasks[i] |= 0b000010;
          calculatedEdgeMasks[i + 1] |= 0b010000;
        }
      }

      if (row + 1 < sideLength) {
        const currentOwner = hexOwners[i];
        const indexDownRight = i + sideLength + colOffset;
        const indexDownLeft = i + sideLength + colOffset - 1;

        if (column + colOffset < sideLength) {
          if (currentOwner !== hexOwners[indexDownRight]) {
            calculatedEdgeMasks[i] |= 0b000001;
            calculatedEdgeMasks[indexDownRight] |= 0b001000;
          }
        }

        if (column + colOffset - 1 >= 0) {
          if (currentOwner !== hexOwners[indexDownLeft]) {
            calculatedEdgeMasks[i] |= 0b100000;
            calculatedEdgeMasks[indexDownLeft] |= 0b000100;
          }
        }
      }
    }
  }

  /**
   * @param ownerIndex {number}
   * @returns {boolean}
   */
  checkHexCollusion(ownerIndex) {
    const sideLength = this.sideLength;
    const hexOwners = this.mapData.hexOwners;
    const hexProvinceIds = this.mapData.hexProvinceIds;
    const ownerMask = hexOwners[ownerIndex];
    const provinceId = hexProvinceIds[ownerIndex];

    const row = Math.floor(ownerIndex / sideLength);
    const colOffset = row & 1;
    const column = ownerIndex % sideLength;

    if (hexOwners[ownerIndex + 1] === ownerMask && hexProvinceIds[ownerIndex + 1] !== provinceId && column + 1 < sideLength) { return true; }
    if (hexOwners[ownerIndex - 1] === ownerMask && hexProvinceIds[ownerIndex - 1] !== provinceId && column - 1 >= 0) { return true; }

    if (row + 1 < sideLength) {
      const rowBelow = ownerIndex + sideLength;
      if (hexOwners[rowBelow + colOffset] === ownerMask && hexProvinceIds[rowBelow + colOffset] !== provinceId && column + colOffset < sideLength) { return true; }
      if (hexOwners[rowBelow + colOffset - 1] === ownerMask && hexProvinceIds[rowBelow + colOffset - 1] !== provinceId && column + colOffset - 1 >= 0) { return true; }
    }

    if (row - 1 >= 0) {
      const rowAbove = ownerIndex - sideLength;
      if (hexOwners[rowAbove + colOffset] === ownerMask && hexProvinceIds[rowAbove + colOffset] !== provinceId && column + colOffset < sideLength) { return true; }
      if (hexOwners[rowAbove + colOffset - 1] === ownerMask && hexProvinceIds[rowAbove + colOffset - 1] !== provinceId && column + colOffset - 1 >= 0) { return true; }
    }

    return false;
  }

  /**
   * @param ownerIndex {number}
   * @returns {number[]}
   */
  getUnownedHexNeighbors(ownerIndex) {
    const sideLength = this.sideLength;
    const hexOwners = this.mapData.hexOwners;
    const row = Math.floor(ownerIndex / sideLength);
    const colOffset = row & 1;
    const column = ownerIndex % sideLength;
    const rowBelow = ownerIndex + sideLength;
    const rowAbove = ownerIndex - sideLength;
    const neighbors = [];

    if (hexOwners[ownerIndex + 1] === 0 && column + 1 < sideLength) { neighbors.push(ownerIndex + 1); }
    if (hexOwners[ownerIndex - 1] === 0 && column - 1 >= 0) { neighbors.push(ownerIndex - 1); }

    if (row + 1 < sideLength) {
      if (hexOwners[rowBelow + colOffset] === 0 && column + colOffset < sideLength) { neighbors.push(rowBelow + colOffset); }
      if (hexOwners[rowBelow + colOffset - 1] === 0 && column + colOffset - 1 >= 0) { neighbors.push(rowBelow + colOffset - 1); }
    }

    if (row - 1 >= 0) {
      if (hexOwners[rowAbove + colOffset] === 0 && column + colOffset < sideLength) { neighbors.push(rowAbove + colOffset); }
      if (hexOwners[rowAbove + colOffset - 1] === 0 && column + colOffset - 1 >= 0) { neighbors.push(rowAbove + colOffset - 1); }
    }

    return neighbors;
  }
}
