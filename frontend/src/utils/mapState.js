import {ExtendedDataView} from "./ExtendedDataView.js";
import {makeMask} from "./math.js";
import {selectedMapWidth} from "../script.js";
import {encodeRowMajor} from "./rowMajor.js";

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
  
  calculatedEdgeMasks; //dodane

  constructor(playerCount, hexCount) {
    const dimensions = calculateMapStateDimensions(playerCount, hexCount);

    super(dimensions.totalArraySize); // Tu robi się ta wyjebana tablica na wszystko
    this.dimensions = dimensions;

    this.playerCount = playerCount;
    this.hexCount = hexCount;
    this.calculatedEdgeMasks = new Array(hexCount);
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

  setHexState(q, r, value) {
    let index = encodeRowMajor(q , r, selectedMapWidth);
    this.setHexStateIndex(index, value);
  }
  
  setHexStateIndex(index, value) {
    this.hexStates[index] = value;
  }

  #hexOwners;
  get hexOwners() {
    return this.#hexOwners ??= new Uint8Array(this.buffer, this.dimensions.hexOwnerOffset, this.dimensions.hexOwnerInBytesPerElement * this.hexCount);
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

  #hexProvinceIds;
  get hexProvinceIds() {
    return this.#hexProvinceIds ??= new DataView(this.buffer, this.dimensions.hexProvinceIdOffset, this.dimensions.hexProvinceIdInBytesPerElement * this.hexCount);
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
    return this.#provinceFinanceStates ??= new DataView(this.buffer, this.dimensions.provinceFinanceStateOffset, this.dimensions.provinceFinanceStateInBytesPerElement * this.provinceCount);
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

  get fillMasksArray() {
    const hexCount = this.hexCount;
    const masks = new Float32Array(hexCount);
    const hexStates = this.hexStates;
    const hexOwners = this.hexOwners;
    for (let i = 0; i < hexCount; i++) {
      // If state is 0, owner 0 makes it invisible in shader
      masks[i] = (hexStates[i] !== 0) * hexOwners[i];
    }
    return masks;
  }

  get edgeMasksArray() {
    const hexCount = this.hexCount;
    const masks = new Float32Array(hexCount);
    const calculatedEdgeMasks = this.calculatedEdgeMasks;
    for (let i = 0; i < hexCount; i++) {
      masks[i] = calculatedEdgeMasks[i] || 0;
    }
    return masks;
  }
  
}