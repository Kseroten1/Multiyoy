import {ExtendedDataView} from "./ExtendedDataView.js";
import {encodeRowMajor} from "./rowMajor.js";
import {UNASSIGNED_PROVINCE_ID} from "./config.js";
import {getHexNeighbors} from "./hexLogicHelper.js";

function calculateMapStateDimensions(playerCount, hexCount) {
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

  dimensions

  calculatedEdgeMasks; //dodane

  sideLength;

  provinceRenderIndices = new Float32Array(0);
  provinceRenderOwners = new Float32Array(0);
  provinceRenderEdgeMasks = new Float32Array(0);

  constructor(playerCount, hexCount) {
    const dimensions = calculateMapStateDimensions(playerCount, hexCount);

    super(dimensions.totalArraySize); // Tu robi się ta wyjebana tablica na wszystko
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
  }

  #hexOwners;
  get hexOwners() {
    return this.#hexOwners ??= new Uint16Array(this.buffer, this.dimensions.hexOwnerOffset, this.hexCount);
  }

  set hexOwners(value) {
    this.hexOwners.set(value);
  }

  getHexOwner(index) {
    return this.hexOwners[index];
  }

  setHexOwner(index, value) {
    this.hexOwners[index] = value;
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

  setHexProvinceId(index, value) {
    this.hexProvinceIds[index] = value;
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
    for (let i = 0; i < hexCount; i++) {
      masks[i] = (hexStates[i] !== 0) * hexOwners[i];
    }
    return masks;
  }

  /**
   * 
   * @param index {number}
   * @param ownerMask {number}
   * @returns {boolean}
   */
  anyNeighborSharesOwner(index, ownerMask) {
    const sideLength = this.sideLength;
    const hexOwners = this.hexOwners;

    const r = Math.floor(index / sideLength);
    const isRowOdd = (r & 1) !== 0;
    const c = index % sideLength;

    if (ownerMask === hexOwners[index + 1] && c + 1 < sideLength) return true;
    if (ownerMask === hexOwners[index - 1] && c - 1 >= 0) return true;

    if (r + 1 < sideLength) {
      const rowBelow = index + sideLength;
      if (ownerMask === hexOwners[rowBelow + isRowOdd] && c + isRowOdd < sideLength) return true;
      if (ownerMask === hexOwners[rowBelow + isRowOdd - 1] && c + isRowOdd - 1 >= 0) return true;
    }

    if (r - 1 >= 0) {
      const rowAbove = index - sideLength;
      if (ownerMask === hexOwners[rowAbove + isRowOdd] && c + isRowOdd < sideLength) return true;
      if (ownerMask === hexOwners[rowAbove + isRowOdd - 1] && c + isRowOdd - 1 >= 0) return true;
    }

    return false;
  }

  /**
   *
   * @param index  {number}
   * @param provinceId {number}
   * @returns {number}
   */
  countNeighborsInProvince(index, provinceId) {
    const sideLength = this.sideLength;
    const r = Math.floor(index / sideLength);
    const isRowOdd = (r & 1) !== 0 ? 1 : 0;
    const c = index % sideLength;
    let count = 0;

    if (this.getHexProvinceId(index + 1) === provinceId && c + 1 < sideLength) count++;
    if (this.getHexProvinceId(index - 1) === provinceId && c - 1 >= 0) count++;

    if (r + 1 < sideLength) {
      const rowBelow = index + sideLength;
      if (this.getHexProvinceId(rowBelow + (isRowOdd ? 1 : 0)) === provinceId && c + isRowOdd < sideLength) count++;
      if (this.getHexProvinceId(rowBelow + (isRowOdd ? 0 : -1)) === provinceId && c + (isRowOdd ? 0 : -1) >= 0) count++;
    }

    if (r - 1 >= 0) {
      const rowAbove = index - sideLength;
      if (this.getHexProvinceId(rowAbove + (isRowOdd ? 1 : 0)) === provinceId && c + (isRowOdd ? 1 : 0) < sideLength) count++;
      if (this.getHexProvinceId(rowAbove + (isRowOdd ? 0 : -1)) === provinceId && c + (isRowOdd ? 0 : -1) >= 0 ) count++;
    }

    return count;
  }

  ensureProvinceRenderCapacity(size) {
    if (this.provinceRenderIndices.length >= size) return;

    this.provinceRenderIndices = new Float32Array(size);
    this.provinceRenderOwners = new Float32Array(size);
    this.provinceRenderEdgeMasks = new Float32Array(size);
  }

  getProvinceRenderData(provinceId, provinces) {
    const provinceHexes = provinces[provinceId];
    const size = provinceHexes?.length ?? 0;

    this.ensureProvinceRenderCapacity(size);
    
    const indices = this.provinceRenderIndices;
    const owners = this.provinceRenderOwners;
    const edgeMasks = this.provinceRenderEdgeMasks;

    for (let i = 0; i < size; i++) {
      indices[i] = provinceHexes[i];
      owners[i] = this.hexOwners[provinceHexes[i]];
      edgeMasks[i] = this.calculatedEdgeMasks[provinceHexes[i]];
    }

    return {
      count: size,
      indices,
      owners,
      edgeMasks,
    };
  }

  /**
   * 
   * @param hexIndex {number}
   * @param provinces {[][]}
   */
  removeFromProvince(hexIndex, provinces) {
    const provinceId = this.getHexProvinceId(hexIndex);
    if (provinceId === UNASSIGNED_PROVINCE_ID) return;

    const province = provinces[provinceId];
    const hexPos = province.indexOf(hexIndex);
    if (hexPos === -1) return;

    province.splice(hexPos, 1);
    this.setHexProvinceId(hexIndex, UNASSIGNED_PROVINCE_ID);

    if (province.length > 0) {
      if (this.countNeighborsInProvince(hexIndex, provinceId) > 1) {
        this.splitProvince(provinceId, provinces);
      }
    }
  }

  /**
   * 
   * @param provinceId {number}
   * @param provinces {[][]}
   */
  splitProvince(provinceId, provinces) {
    const province = provinces[provinceId];
    const groups = [];
    const visited = new Set();

    for (const startHex of province) {
      if (visited.has(startHex)) {
        continue;
      }

      const group = [];
      const stack = [startHex];
      visited.add(startHex);

      while (stack.length > 0) {
        const curr = stack.pop();
        group.push(curr);

        const neighbors = getHexNeighbors(curr, this.sideLength);
        for (const n of neighbors) {
          if (!visited.has(n) && this.getHexProvinceId(n) === provinceId) {
            visited.add(n);
            stack.push(n);
          }
        }
      }

      groups.push(group);
    }

    if (groups.length > 1) {
      provinces[provinceId] = groups[0];

      for (let i = 1; i < groups.length; i++) {
        const newId = provinces.length;
        const newHexes = groups[i];
        
        provinces[newId] = newHexes;

        for (const h of newHexes) {
          this.setHexProvinceId(h, newId);
        }
      }
    }
  }

  /**
   * 
   * @param hexIndex {number}
   * @param newOwner {number}
   * @param provinces {[][]}
   */
  mergeOrCreateProvince(hexIndex, newOwner, provinces) {
    const neighbors = getHexNeighbors(hexIndex, this.sideLength);
    const targetProvinces = [];

    for (const nIdx of neighbors) {
      const nProvinceId = this.getHexProvinceId(nIdx);
      if (nProvinceId === UNASSIGNED_PROVINCE_ID) continue;

      let exists = false;
      for (const existingId of targetProvinces) {
        if (existingId === nProvinceId) {
          exists = true;
          break;
        }
      }
      if (exists) continue;

      const firstHexOfProvince = provinces[nProvinceId]?.[0];
      if (this.getHexOwner(firstHexOfProvince) === newOwner) {
        targetProvinces.push(nProvinceId);
      }
    }

    if (targetProvinces.length > 0) {
      const masterId = targetProvinces[0];
      const masterProvince = provinces[masterId];

      this.setHexProvinceId(hexIndex, masterId);
      masterProvince.push(hexIndex);

      for (let i = 1; i < targetProvinces.length; i++) {
        const otherId = targetProvinces[i];
        const otherProvince = provinces[otherId];

        for (const h of otherProvince) {
          this.setHexProvinceId(h, masterId);
          masterProvince.push(h);
        }
        
        otherProvince.length = 0;
      }
    } else {
      const newProvinceId = provinces.length;
      this.setHexProvinceId(hexIndex, newProvinceId);
      provinces[newProvinceId] = [hexIndex];
    }
  }

  /**
   * 
   * @param hexIndex {number}
   * @param provinces {[][]}
   */
  recalculateProvince(hexIndex, provinces) {
    const oldProvinceId = this.getHexProvinceId(hexIndex);
    const newOwner = this.getHexOwner(hexIndex);

    if (oldProvinceId !== UNASSIGNED_PROVINCE_ID) {
      this.removeFromProvince(hexIndex, provinces);
    }

    this.setHexProvinceId(hexIndex, UNASSIGNED_PROVINCE_ID);
    this.mergeOrCreateProvince(hexIndex, newOwner, provinces);
  }
}