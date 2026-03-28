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

export class MapData extends Uint8Array {
  dataView = new DataView(this.buffer)
  dimensions

  /**
   * @param {number} hexCount
   * @param {number} playerCount
   */
  constructor(hexCount, playerCount) {
    const dimensions = calculateMapStateDimensions(hexCount);
    super(dimensions.totalArraySize);
    this.dimensions = dimensions;
    this.hexCount = hexCount;
    this.playerCount = playerCount;
    
    /** @typedef {Set<number>[]} ProvinceHexIdsByProvinceId */
    /** @type {ProvinceHexIdsByProvinceId} */
    this.provinceHexIdsByProvinceId = [];

    /** @type {Float32Array} */
    this.calculatedEdgeMasks = new Float32Array(hexCount);
  }

  #hexCount;
  get hexCount() {
    this.#hexCount ??= (this.dataView.getUint8(this.dimensions.hexCountOffset) << 16) | this.dataView.getUint16(this.dimensions.hexCountOffset + 1);
    return this.#hexCount;
  }

  set hexCount(number) {
    this.#hexCount = number;
    this.dataView.setUint8(this.dimensions.hexCountOffset, (number >> 16) & 0xff);
    this.dataView.setUint16(this.dimensions.hexCountOffset + 1, number & 0xffff);
  }

  #playerCount;
  get playerCount() {
    this.#playerCount ??= this.dataView.getUint16(this.dimensions.playerCountOffset);
    return this.#playerCount;
  }

  set playerCount(value) {
    this.#playerCount = value;
    this.dataView.setUint16(this.dimensions.playerCountOffset, value);
  }

  #currentPlayer;
  get currentPlayer() {
    this.#currentPlayer ??= this.dataView.getUint16(this.dimensions.currentPlayerOffset);
    return this.#currentPlayer;
  }

  set currentPlayer(value) {
    this.#currentPlayer = value;
    this.dataView.setUint16(this.dimensions.currentPlayerOffset, value);
  }

  #currentRound;
  get currentRound() {
    this.#currentRound ??= this.dataView.getUint32(this.dimensions.currentRoundOffset);
    return this.#currentRound;
  }

  set currentRound(value) {
    this.#currentRound = value;
    this.dataView.setUint32(this.dimensions.currentRoundOffset, value);
  }

  #provinceCount;
  get provinceCount() {
    this.#provinceCount ??= this.dataView.getUint32(this.dimensions.provinceCountOffset);
    return this.#provinceCount;
  }

  set provinceCount(value) {
    this.#provinceCount = value;
    this.dataView.setUint32(this.dimensions.provinceCountOffset, value);
  }

  #hexStates;
  get hexStates() {
    return this.#hexStates ??= new Uint8Array(this.buffer, this.dimensions.hexStateOffset, this.dimensions.hexStateInBytesPerElement * this.hexCount);
  }

  set hexStates(value) {
    this.set(value, this.dimensions.hexStateOffset);
  }

  #hexOwners;
  get hexOwners() {
    return this.#hexOwners ??= new Uint16Array(this.buffer, this.dimensions.hexOwnerOffset, this.hexCount);
  }

  #hexProvinceIds;
  get hexProvinceIds() {
    return this.#hexProvinceIds ??= new Uint32Array(this.buffer, this.dimensions.hexProvinceIdOffset, this.hexCount);
  }

  set hexProvinceIds(value) {
    this.hexProvinceIds.set(value);
  }

  #maxProvinceFinance;
  get maxProvinceFinance() {
    this.#maxProvinceFinance ??= this.dataView.getUint32(this.dimensions.maxProvinceFinanceOffset);
    return this.#maxProvinceFinance;
  }

  set maxProvinceFinance(value) {
    this.#maxProvinceFinance = value;
    this.dataView.setUint32(this.dimensions.maxProvinceFinanceOffset, value);
  }

  #provinceFinanceStates;
  get provinceFinanceStates() {
    return this.#provinceFinanceStates ??= new Uint32Array(this.buffer, this.dimensions.provinceFinanceStateOffset, this.provinceCount);
  }

  set provinceFinanceStates(value) {
    this.provinceFinanceStates.set(value);
  }
}
