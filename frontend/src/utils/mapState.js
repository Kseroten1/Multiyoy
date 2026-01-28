import { ExtendedDataView } from "./ExtendedDataView.js";
import { makeHexColorMask, makeMask } from "./math.js";
import { EDGE_MASKS } from "./config.js";

function calculateMapStateDimensions(playerCount, hexCount) {
  const provinceCount = hexCount / 4;

  const hexCountInBytes = 3;
  const hexCountOffset = 0;
  const playerCountInBytes = 2;
  const playerCountOffset = hexCountInBytes + hexCountOffset;
  const currentPlayerInBytes = 2;
  const currentPlayerOffset = playerCountInBytes + playerCountOffset;
  const currentRoundInBytes = 4;
  const currentRoundOffset = currentPlayerInBytes + currentPlayerOffset;
  const provinceCountInBytes = 4;
  const provinceCountOffset = currentRoundInBytes + currentRoundOffset;
  const hexStateInBytesPerElement = 1;
  const hexStateOffset = provinceCountInBytes + provinceCountOffset;
  const hexOwnerInBytesPerElement = playerCountInBytes;
  const hexOwnerOffset = hexStateOffset + hexStateInBytesPerElement * hexCount;
  const hexProvinceIdInBytesPerElement = provinceCountInBytes;
  const hexProvinceIdOffset = hexOwnerOffset + hexOwnerInBytesPerElement * hexCount;
  const maxProvinceFinanceInBytes = 4;
  const maxProvinceFinanceOffset = hexProvinceIdOffset + hexProvinceIdInBytesPerElement * hexCount;
  const provinceFinanceStateInBytesPerElement = maxProvinceFinanceInBytes;
  const provinceFinanceStateOffset = maxProvinceFinanceOffset + maxProvinceFinanceInBytes;

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
    totalArraySize:
      hexCountInBytes +
      playerCountInBytes +
      currentPlayerInBytes +
      currentRoundInBytes +
      provinceCountInBytes +
      hexStateInBytesPerElement * hexCount +
      hexOwnerInBytesPerElement * hexCount +
      hexProvinceIdInBytesPerElement * hexCount +
      maxProvinceFinanceInBytes +
      provinceFinanceStateInBytesPerElement * provinceCount
  });
}

export class MapState extends Uint8Array {
  dataView = new ExtendedDataView(this.buffer)
  dimensions
  
  calculatedFillMasks = new Map(); //dodane
  calculatedEdgeMasks = new Map(); //dodane

  constructor(playerCount, hexCount) {
    const dimensions = calculateMapStateDimensions(playerCount, hexCount);

    super(dimensions.totalArraySize); // Tu robi się ta wyjebana tablica na wszystko
    this.dimensions = dimensions;

    this.playerCount = playerCount;
    this.#cachedHexCount = hexCount;
  }
  
  #cachedHexCount;
  get hexCount() {
    this.#cachedHexCount ??= this.dataView.getNumber(this.dimensions.hexCountOffset, this.dimensions.hexCountInBytes);
    return this.#cachedHexCount;
  }
  
  #mapWidth;
  get mapWidth() {
    this.#mapWidth ??= Math.sqrt(this.hexCount);
    return this.#mapWidth;
  }

  indexToAxial(index) {
    const col = index % this.mapWidth;
    const row = Math.floor(index / this.mapWidth);

    // odd-r offset -> axial (pointy-top)
    const q = col - Math.floor((row - (row & 1)) / 2);
    const r = row;

    return { q, r };
  }

  axialToIndex(q, r) {
    const width = this.mapWidth;

    // axial -> odd-r offset (pointy-top)
    const col = q + Math.floor((r - (r & 1)) / 2);
    return r * width + col;
  }

  get playerCount() {
    return this.dataView.getNumber(this.dimensions.playerCountOffset, this.dimensions.playerCountInBytes);
  }

  set playerCount(value) {
    this.dataView.setNumber(this.dimensions.playerCountOffset, this.dimensions.playerCountInBytes, value);
  }

  get currentPlayer() {
    return this.dataView.getNumber(this.dimensions.currentPlayerOffset, this.dimensions.currentPlayerInBytes);
  }

  set currentPlayer(value) {
    this.dataView.setNumber(this.dimensions.currentPlayerOffset, this.dimensions.currentPlayerInBytes, value);
  }

  get currentRound() {
    return this.dataView.getNumber(this.dimensions.currentRoundOffset, this.dimensions.currentRoundInBytes);
  }

  set currentRound(value) {
    this.dataView.setNumber(this.dimensions.currentRoundOffset, this.dimensions.currentRoundInBytes, value);
  }

  get provinceCount() {
    return this.dataView.getNumber(this.dimensions.provinceCountOffset, this.dimensions.provinceCountInBytes);
  }

  set provinceCount(value) {
    this.dataView.setNumber(this.dimensions.provinceCountOffset, this.dimensions.provinceCountInBytes, value);
  }

  #hexStates;
  get hexStates() {
    this.#hexStates ??= new Uint8Array(this.buffer, this.dimensions.hexStateOffset, this.dimensions.hexStateInBytesPerElement * this.hexCount);
    return this.#hexStates;
  }

  set hexStates(value) {
    this.set(value, this.dimensions.hexStateOffset);
  }

  getHexState(index) {
    return this.hexStates[index];
  }
  
  setHexStateAxial(q, r, value) {
    const index = this.axialToIndex(q, r);
    this.setHexState(index, value);
  }

  setHexState(index, value) {
    this.hexStates[index] = value;

    const fillMask = makeHexColorMask(1, 1, false); //dodane
    this.calculatedFillMasks.set(index, fillMask); //dodane

    const edgeMask = makeMask(EDGE_MASKS[0]); //dodane
    this.calculatedEdgeMasks.set(index, edgeMask); //dodane
  }

  get hexOwners() {
    return new DataView(this.buffer, this.dimensions.hexOwnerOffset, this.dimensions.hexOwnerInBytesPerElement * this.hexCount);
  }

  set hexOwners(value) {
    this.set(value, this.dimensions.hexOwnerOffset);
  }

  getHexOwner(index) {
    return this.hexOwners[index];
  }

  setHexOwner(index, value) {
    this.hexOwners[index] = value;
  }

  get hexProvinceIds() {
    return new DataView(this.buffer, this.dimensions.hexProvinceIdInBytesPerElement * this.hexCount);
  }

  set hexProvinceIds(value) {
    this.set(value, this.dimensions.hexProvinceIdOffset);
  }

  getHexProvinceId(index) {
    return this.hexProvinceIds[index];
  }

  setHexProvinceId(index, value) {
    this.hexProvinceIds[index] = value;
  }

  get maxProvinceFinance() {
    return this.dataView.getNumber(this.dimensions.maxProvinceFinanceOffset, this.dimensions.maxProvinceFinanceInBytes);
  }

  set maxProvinceFinance(value) {
    this.dataView.setNumber(this.dimensions.maxProvinceFinanceOffset, this.dimensions.maxProvinceFinanceInBytes, value);
  }

  get provinceFinanceStates() {
    return new DataView(this.buffer, this.dimensions.provinceFinanceStateInBytesPerElement * this.provinceCount)
  }

  set provinceFinanceStates(value) {
    this.set(value, this.dimensions.provinceFinanceStateOffset);
  }

  getProfinceFinanceState(index) {
    return this.provinceFinanceStates[index];
  }

  setProvinceFinanceState(index, value) {
    this.provinceFinanceStates[index] = value;
  }

  /** @type {Float32Array} */
  get hexagonsToRender() {
    const centersToRender = Array.from({length: this.hexCount}, (_, index) => {
      // Do not render hexagons on "water"
      if (this.hexStates[index] === 0) return /** @type {[number, number]} */ [];
      
      const { q, r } = this.indexToAxial(index);

      const x = Math.sqrt(3) * (q + r / 2);
      const y = (3 / 2) * r;
      
      return [x, y];
    });
    
    return new Float32Array(centersToRender.flat());
  }

  get fillMasksArray() {  //dodane
    return new Float32Array(this.calculatedFillMasks.values());  //dodane
  }  //dodane
  
  get edgeMasksArray() {  //dodane
    return new Float32Array(this.calculatedEdgeMasks.values());  //dodane
  }  //dodane
  
}