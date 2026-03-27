import {ExtendedDataView} from "./ExtendedDataView.js";
import {encodeRowMajor} from "./rowMajor.js";
import {UNASSIGNED_PROVINCE_ID} from "./config.js";
import {getHexNeighbors} from "./hexLogicHelper.js";
import { createHexOwners } from "./mapGenerator.js";

/**
 * @param {number} hexCount
 */
function calculateMapStateDimensions(hexCount) {
  const provinceCount = hexCount / 4;

  let currentOffset = 0;

  const hexCountInBytes = 3;
  const hexCountOffset = currentOffset;
  currentOffset += hexCountInBytes;

  const playerCountInBytes = 2;
  const playerCountOffset = currentOffset;
  currentOffset += playerCountInBytes;

  const currentPlayerInBytes = 2;
  const currentPlayerOffset = currentOffset;
  currentOffset += currentPlayerInBytes;

  const currentRoundInBytes = 4;
  const currentRoundOffset = currentOffset;
  currentOffset += currentRoundInBytes;

  const provinceCountInBytes = 4;
  const provinceCountOffset = currentOffset;
  currentOffset += provinceCountInBytes;

  const hexStateInBytesPerElement = 1;
  const hexStateOffset = currentOffset;
  currentOffset += hexStateInBytesPerElement * hexCount;

  // Align for Uint16Array (2 bytes)
  if (currentOffset % 2 !== 0) currentOffset++;
  const hexOwnerInBytesPerElement = 2;
  const hexOwnerOffset = currentOffset;
  currentOffset += hexOwnerInBytesPerElement * hexCount;

  // Align for Uint32Array (2 bytes)
  if (currentOffset % 2 !== 0) currentOffset++;
  const hexProvinceIdInBytesPerElement = 4;
  const hexProvinceIdOffset = currentOffset;
  currentOffset += hexProvinceIdInBytesPerElement * hexCount;

  // Align for maxProvinceFinance (2 bytes)
  if (currentOffset % 2 !== 0) currentOffset++;
  const maxProvinceFinanceInBytes = 4;
  const maxProvinceFinanceOffset = currentOffset;
  currentOffset += maxProvinceFinanceInBytes;

  // Align for Uint32Array (2 bytes)
  if (currentOffset % 2 !== 0) currentOffset++;
  const provinceFinanceStateInBytesPerElement = 4;
  const provinceFinanceStateOffset = currentOffset;
  currentOffset += provinceFinanceStateInBytesPerElement * provinceCount;

  return ({
    hexCountInBytes,
    hexCountOffset,
    playerCountInBytes,
    playerCountOffset,
    currentPlayerInBytes,
    currentPlayerOffset,
    currentRoundInBytes,
    currentRoundOffset,
    provinceCountInBytes,
    provinceCountOffset,
    hexStateInBytesPerElement,
    hexStateOffset,
    hexOwnerInBytesPerElement,
    hexOwnerOffset,
    hexProvinceIdInBytesPerElement,
    hexProvinceIdOffset,
    maxProvinceFinanceInBytes,
    maxProvinceFinanceOffset,
    provinceFinanceStateInBytesPerElement,
    provinceFinanceStateOffset,
    totalArraySize: currentOffset
  });
}

export class MapState extends Uint8Array {
  dataView = new ExtendedDataView(this.buffer)
  /** @typedef {Set<number>[]} ProvinceHexIdsByProvinceId */
  /** @type {ProvinceHexIdsByProvinceId} */
  provinceHexIdsByProvinceId = []
  dimensions
  calculatedEdgeMasks
  sideLength

  /**
     * @param {number} playerCount
     * @param {number} hexCount
     */
  constructor(playerCount, hexCount) {
    const dimensions = calculateMapStateDimensions(hexCount);
    super(dimensions.totalArraySize);
    this.dimensions = dimensions;

    this.playerCount = playerCount;
    this.hexCount = hexCount;
    this.sideLength = Math.sqrt(hexCount);
    this.calculatedEdgeMasks = new Float32Array(hexCount);
  }

  #hexCount;
  get hexCount() {
    this.#hexCount ??= this.dataView.getNumber(this.dimensions.hexCountOffset, this.dimensions.hexCountInBytes);
    return this.#hexCount;
  }

  set hexCount(number) {
    this.#hexCount = number;
    this.dataView.setNumber(this.dimensions.hexCountOffset, this.dimensions.hexCountInBytes, number);
  }

  #playerCount;
  get playerCount() {
    this.#playerCount ??= this.dataView.getNumber(this.dimensions.playerCountOffset, this.dimensions.playerCountInBytes);
    return this.#playerCount;
  }

  set playerCount(value) {
    this.#playerCount = value;
    this.dataView.setNumber(this.dimensions.playerCountOffset, this.dimensions.playerCountInBytes, value);
  }

  #currentPlayer;
  get currentPlayer() {
    this.#currentPlayer ??= this.dataView.getNumber(this.dimensions.currentPlayerOffset, this.dimensions.currentPlayerInBytes);
    return this.#currentPlayer;
  }

  set currentPlayer(value) {
    this.#currentPlayer = value;
    this.dataView.setNumber(this.dimensions.currentPlayerOffset, this.dimensions.currentPlayerInBytes, value);
  }

  #currentRound;
  get currentRound() {
    this.#currentRound ??= this.dataView.getNumber(this.dimensions.currentRoundOffset, this.dimensions.currentRoundInBytes);
    return this.#currentRound;
  }

  set currentRound(value) {
    this.#currentRound = value;
    this.dataView.setNumber(this.dimensions.currentRoundOffset, this.dimensions.currentRoundInBytes, value);
  }

  #provinceCount;
  get provinceCount() {
    this.#provinceCount ??= this.dataView.getNumber(this.dimensions.provinceCountOffset, this.dimensions.provinceCountInBytes);
    return this.#provinceCount;
  }

  set provinceCount(value) {
    this.#provinceCount = value;
    this.dataView.setNumber(this.dimensions.provinceCountOffset, this.dimensions.provinceCountInBytes, value);
  }

  #hexStates;
  get hexStates() {
    return this.#hexStates ??= new Uint8Array(this.buffer, this.dimensions.hexStateOffset, this.dimensions.hexStateInBytesPerElement * this.hexCount);
  }

  set hexStates(value) {
    this.set(value, this.dimensions.hexStateOffset);
  }

  getHexState(index) {
    return this.hexStates[index];
  }

  setHexState(q, r, value, sideLength) {
    let index = encodeRowMajor(q , r, sideLength);
    this.setHexStateIndex(index, value);
  }

  setHexStateIndex(index, value) {
    this.hexStates[index] = value;
    // Changing hex state might affect whether it's visible or its province
    // But mostly it's used for visibility. 
    // If it's a structural change, we should ensure consistency.
  }

  #hexOwners;
  get hexOwners() {
    return this.#hexOwners ??= new Uint16Array(this.buffer, this.dimensions.hexOwnerOffset, this.hexCount);
  }

  getHexOwner(index) {
    return this.hexOwners[index];
  }

  /**
   * @param index {number}
   * @param value {number}
   * @param provinces {Set<number>[] || null} 
   * @returns number[]
   */
  setHexOwner(index, value) {
    this.hexOwners[index] = value;
    
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

  #hexProvinceIds;
  get hexProvinceIds() {
    return this.#hexProvinceIds ??= new Uint32Array(this.buffer, this.dimensions.hexProvinceIdOffset, this.hexCount);
  }

  set hexProvinceIds(value) {
    this.hexProvinceIds.set(value);
  }

  getHexProvinceId(index) {
    return this.hexProvinceIds[index];
  }

  setHexProvinceId(index, provinceId) {
    this.hexProvinceIds[index] = provinceId;
    this.provinceHexIdsByProvinceId[provinceId] ??= new Set();
    this.provinceHexIdsByProvinceId[provinceId].add(index);
  }

  #maxProvinceFinance;
  get maxProvinceFinance() {
    this.#maxProvinceFinance ??= this.dataView.getNumber(this.dimensions.maxProvinceFinanceOffset, this.dimensions.maxProvinceFinanceInBytes);
    return this.#maxProvinceFinance;
  }

  set maxProvinceFinance(value) {
    this.#maxProvinceFinance = value;
    this.dataView.setNumber(this.dimensions.maxProvinceFinanceOffset, this.dimensions.maxProvinceFinanceInBytes, value);
  }

  #provinceFinanceStates;
  get provinceFinanceStates() {
    return this.#provinceFinanceStates ??= new Uint32Array(this.buffer, this.dimensions.provinceFinanceStateOffset, this.provinceCount);
  }

  set provinceFinanceStates(value) {
    this.provinceFinanceStates.set(value);
  }

  getProfinceFinanceState(index) {
    return this.provinceFinanceStates[index];
  }

  setProvinceFinanceState(index, value) {
    this.provinceFinanceStates[index] = value;
  }

  get fillMasksArray() {
    const hexCount = this.hexCount;
    const masks = new Float32Array(hexCount);
    const hexStates = this.hexStates;
    const hexOwners = this.hexOwners;
    // If state is 0, owner 0 makes it invisible in shader
    for (let i = 0; i < hexCount; i++) {
      masks[i] = +(hexStates[i] !== 0) * hexOwners[i];
    }
    return masks;
  }

  /**
   * @param ownerIndex {number}
   * @returns {number[]}
   */
  getUnownedHexNeighbors(ownerIndex) {
    const sideLength = this.sideLength;
    const hexOwners = this.hexOwners;
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

  /**
   * @param ownerIndex {number}
   * @returns {boolean}
   */
  checkHexCollusion(ownerIndex) {
    const sideLength = this.sideLength;
    const hexOwners = this.hexOwners;
    const hexProvinceIds = this.hexProvinceIds;
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
   *
   * @param ownerIndex  {number}
   * @returns {number}
   */
  countNeighborsInProvince(ownerIndex) {
    const hexProvinceIds = this.hexProvinceIds;
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
   * @param provinceId {number}
   * @param provinceHexes {Set<number>}
   * @returns {{count: number, indices: Float32Array, owners: Float32Array, edgeMasks: Float32Array}}
   */

  getProvinceRenderData(provinceId) {
    const provinceHexes = this.provinceHexIdsByProvinceId[provinceId];
    const count = provinceHexes?.size ?? 0;

    const indices = new Float32Array(count);
    const owners = new Float32Array(count);
    const edgeMasks = new Float32Array(count);
    
    let i = 0;
    for (const hexIdx of provinceHexes) {
      indices[i] = hexIdx;
      owners[i] = this.hexOwners[hexIdx];
      edgeMasks[i] = this.calculatedEdgeMasks[hexIdx];
      i++;
    }

    return {
      count: count,
      indices,
      owners,
      edgeMasks,
    };
  }

  /**
   * 
   * @param hexIndex {number}
   * @param provinces {Set<number>[]}
   */
  removeFromProvince(hexIndex) {
    const provinceId = this.hexProvinceIds[hexIndex];

    const province = this.provinceHexIdsByProvinceId[provinceId];
    if (!province || !province.has(hexIndex)) return;

    const needsSplitCheck = this.countNeighborsInProvince(hexIndex) > 1;

    province.delete(hexIndex);
    this.hexProvinceIds[hexIndex] = UNASSIGNED_PROVINCE_ID;

    if (province.size > 0 && needsSplitCheck) {
      this.handleSplitProvinceChance(provinceId);
    }
  }

  /**
   * @param provinceId {number}
   */
  handleSplitProvinceChance(provinceId) {
    const province = this.provinceHexIdsByProvinceId[provinceId];
    const groups = [];
    const visited = new Set();
    
    // Perform a depth-first search to group contiguous hexes within the province into distinct clusters.
    for (const startHex of province) {
      if (visited.has(startHex)) {
        continue;
      }

      const group = new Set();
      const stack = [startHex];
      visited.add(startHex);

      while (stack.length > 0) {
        const curr = stack.pop();
        group.add(curr);

        const neighbors = getHexNeighbors(curr, this.sideLength);
        for (const n of neighbors) {
          if (!visited.has(n) && this.hexProvinceIds[n] === provinceId) {
            visited.add(n);
            stack.push(n);
          }
        }
      }
      // Split disconnected clusters into new unique provinces and update their respective hex IDs.
      groups.push(group);
    }

    // The for loop starts from 1 because the first cluster (groups[0]) is kept as the original province
    if (groups.length > 1) {
      this.provinceHexIdsByProvinceId[provinceId] = groups[0];

      for (let i = 1; i < groups.length; i++) {
        const newId = this.provinceHexIdsByProvinceId.length;
        const newHexes = groups[i];

        this.provinceHexIdsByProvinceId[newId] = newHexes;

        for (const h of newHexes) {
          this.hexProvinceIds[h] = newId;
        }
      }
    }
  }

  /**
   * 
   * @param hexIndex {number}
   * @param newOwner {number}
   * @param provinces {Set<number>[]}
   */
  mergeOrCreateProvince(hexIndex, newOwner) {
    const neighbors = getHexNeighbors(hexIndex, this.sideLength);
    const targetProvinces = [];

    for (const nIdx of neighbors) {
      const nProvinceId = this.hexProvinceIds[nIdx];

      let exists = false;
      for (const existingId of targetProvinces) {
        if (existingId === nProvinceId) {
          exists = true;
          break;
        }
      }
      if (exists) continue;

      const province = this.provinceHexIdsByProvinceId[nProvinceId];
      if (province && province.size > 0) {
        const firstHexOfProvince = province.values().next().value;
        if (this.hexOwners[firstHexOfProvince] === newOwner) {
          targetProvinces.push(nProvinceId);
        }
      }
    }

    if (targetProvinces.length === 0) {
      const newProvinceId = this.provinceHexIdsByProvinceId.length;
      this.hexProvinceIds[hexIndex] = newProvinceId;
      this.provinceHexIdsByProvinceId[newProvinceId] = new Set([hexIndex]);
      return;
    }

    const masterId = targetProvinces[0];
    const masterProvince = this.provinceHexIdsByProvinceId[masterId];

    this.hexProvinceIds[hexIndex] = masterId;
    masterProvince.add(hexIndex);

    for (let i = 1; i < targetProvinces.length; i++) {
      const otherId = targetProvinces[i];
      const otherProvince = this.provinceHexIdsByProvinceId[otherId];

      for (const h of otherProvince) {
        this.hexProvinceIds[h] = masterId;
        masterProvince.add(h);
      }

      otherProvince.clear();
    }
  }

  *generateSlayLikeMap() {
    const unassignedHexes = Array.from({length: this.hexCount}, (_, i) => i);
    const possibleHexOwners = createHexOwners(this.playerCount);

    const hexesPerProvince = Math.max(1, Math.floor(this.sideLength / 2));
    const branchingChance = 0.5;
    let provinceId = 1;

    const hexCountsPerPlayer = new Int32Array(this.playerCount);

    while (unassignedHexes.length > 0) {
      let playerIdx = -1;
      let minHexCount = Infinity;

      for (let pId = 0; pId < this.playerCount; pId++) {
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

      while (count < hexesPerProvince && history.length > 0) {
        const current = history[history.length - 1];

        if (this.hexOwners[current] === 0) {
          this.setHexOwner(current, currentOwnerMask);
          this.setHexProvinceId(current, provinceId);
          hexCountsPerPlayer[playerIdx]++;
          count++;
        }

        const neighbors = this.getUnownedHexNeighbors(current);
        let validNeighborCount = 0;
        for (let i = 0; i < neighbors.length; i++) {
          const n = neighbors[i];
          // if hexes do not collude
          if (!this.checkHexCollusion(n)) {
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
    
    this.#recalculateHexEdgeMask();
  }

  /** @param {number[]} indices */
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
      const currentOwner = this.hexOwners[currentIndex];
      let mask = 0;

      for (let i = 0; i < neighbors.length; i++) {
        const neighborId = neighbors[i];
        if (currentOwner !== this.hexOwners[neighborId]) {
          mask |= neighborMasks[i];
        }
      }

      this.calculatedEdgeMasks[currentIndex] = mask;
    }
  }

  /**
   * @param hexIndex {number}
   */
  #recalculateProvince(hexIndex) {
    const oldProvinceId = this.hexProvinceIds[hexIndex];
    const newOwner = this.getHexOwner(hexIndex);

    if (oldProvinceId !== UNASSIGNED_PROVINCE_ID) {
      this.removeFromProvince(hexIndex);
    }

    this.hexProvinceIds[hexIndex] = UNASSIGNED_PROVINCE_ID;
    this.mergeOrCreateProvince(hexIndex, newOwner);
  }
  
  #recalculateHexEdgeMask() {
    const sideLength = this.sideLength;
    const totalHexCount = this.hexCount;
    const hexOwners = this.hexOwners;
    const calculatedEdgeMasks = this.calculatedEdgeMasks;

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
}