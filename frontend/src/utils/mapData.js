/**
 * @param {number} hexCount
 * @param {number} provinceCount
 */
function calculateMapStateDimensions(hexCount, provinceCount) {

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

  // Align for Uint32Array (4 bytes)
  if (currentOffset % 4 !== 0) currentOffset += (4 - (currentOffset % 4));
  const hexProvinceIdInBytesPerElement = 4;
  const hexProvinceIdOffset = currentOffset;
  currentOffset += hexProvinceIdInBytesPerElement * hexCount;

  // Align for maxProvinceFinance (4 bytes)
  if (currentOffset % 4 !== 0) currentOffset += (4 - (currentOffset % 4));
  const maxProvinceFinanceInBytes = 4;
  const maxProvinceFinanceOffset = currentOffset;
  currentOffset += maxProvinceFinanceInBytes;

  // Align for Uint32Array (4 bytes)
  if (currentOffset % 4 !== 0) currentOffset += (4 - (currentOffset % 4));
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

export class MapData {
  /** @type {Uint8Array} */
  byteArray;
  /** @type {DataView} */
  dataView;
  /** @type {ReturnType<calculateMapStateDimensions>} */
  dimensions;

  /**
   * @param {number} hexCount
   * @param {number} playerCount
   * @param {SharedArrayBuffer} [sharedBuffer]
   * @param {SharedArrayBuffer} [sharedEdgeBuffer]
   */
  constructor(hexCount, playerCount, sharedBuffer, sharedEdgeBuffer) {
    this.dimensions = calculateMapStateDimensions(hexCount, 0);
    
    // Max capacity: provinces cannot exceed hex count in Multiyoy rules.
    const maxDimensions = calculateMapStateDimensions(hexCount, hexCount);
    
    const buffer = sharedBuffer ?? new SharedArrayBuffer(this.dimensions.totalArraySize, { maxByteLength: maxDimensions.totalArraySize });

    this.byteArray = new Uint8Array(buffer);
    this.dataView = new DataView(buffer);
    this.hexCount = hexCount;
    this.playerCount = playerCount;
    this.provinceCount = 0;
    
    /** @typedef {Set<number>[]} ProvinceHexIdsByProvinceId */
    /** @type {ProvinceHexIdsByProvinceId} */
    this.provinceHexIdsByProvinceId = [new Set()];

    const edgeBuffer = sharedEdgeBuffer ?? new SharedArrayBuffer(hexCount * 4);
    /** @type {Float32Array} */
    this.calculatedEdgeMasks = new Float32Array(edgeBuffer);
  }

  /**
   * @param {ArrayBuffer} buffer
   */
  static fromBuffer(buffer) {
    // This will be used by save files / multiplayer
    const dataView = new DataView(buffer);
    const hexCount = (dataView.getUint8(0) << 16) | dataView.getUint16(1);
    const playerCount = dataView.getUint16(3);
    const provinceCount = dataView.getUint32(11);

    const mapData = new MapData(hexCount, playerCount);
    mapData.ensureProvinceCapacity(provinceCount);
    const sourceData = new Uint8Array(buffer);
    const dataToCopy = sourceData.subarray(0, Math.min(sourceData.length, mapData.byteArray.length));
    mapData.byteArray.set(dataToCopy);
    mapData.provinceCount = provinceCount;

    const hexProvinceIds = mapData.hexProvinceIds;
    for (let i = 0; i < hexCount; i++) {
      const provinceId = hexProvinceIds[i];
      if (provinceId !== 0) {
        while (mapData.provinceHexIdsByProvinceId.length <= provinceId) {
          mapData.provinceHexIdsByProvinceId.push(new Set());
        }
        mapData.provinceHexIdsByProvinceId[provinceId].add(i);
      }
    }

    return mapData;
  }

  ensureProvinceCapacity(count) {
    const neededDimensions = calculateMapStateDimensions(this.hexCount, count);
    if (this.byteArray.buffer.byteLength >= neededDimensions.totalArraySize) {
      return;
    }

    const currentProvinceCount = this.provinceCount;
    const newCapacity = Math.max(count, Math.floor(currentProvinceCount * 1.5));
    const growDimensions = calculateMapStateDimensions(this.hexCount, Math.min(this.hexCount, newCapacity));

    this.byteArray.buffer.grow(growDimensions.totalArraySize);
    this.dimensions = growDimensions;
  }

  get hexCount() {
    return (this.dataView.getUint8(this.dimensions.hexCountOffset) << 16) | this.dataView.getUint16(this.dimensions.hexCountOffset + 1);
  }

  set hexCount(number) {
    this.dataView.setUint8(this.dimensions.hexCountOffset, (number >> 16) & 0xff);
    this.dataView.setUint16(this.dimensions.hexCountOffset + 1, number & 0xffff);
  }

  get playerCount() {
    return this.dataView.getUint16(this.dimensions.playerCountOffset);
  }

  set playerCount(value) {
    this.dataView.setUint16(this.dimensions.playerCountOffset, value);
  }

  get currentPlayer() {
    return this.dataView.getUint16(this.dimensions.currentPlayerOffset);
  }

  set currentPlayer(value) {
    this.dataView.setUint16(this.dimensions.currentPlayerOffset, value);
  }

  get currentRound() {
    return this.dataView.getUint32(this.dimensions.currentRoundOffset);
  }

  set currentRound(value) {
    this.dataView.setUint32(this.dimensions.currentRoundOffset, value);
  }

  get provinceCount() {
    return this.dataView.getUint32(this.dimensions.provinceCountOffset);
  }

  set provinceCount(value) {
    this.ensureProvinceCapacity(value);
    this.dataView.setUint32(this.dimensions.provinceCountOffset, value);
  }

  #hexStates;
  get hexStates() {
    return this.#hexStates ??= new Uint8Array(this.byteArray.buffer, this.dimensions.hexStateOffset, this.dimensions.hexStateInBytesPerElement * this.hexCount);
  }

  set hexStates(value) {
    this.byteArray.set(value, this.dimensions.hexStateOffset);
  }

  #hexOwners;
  get hexOwners() {
    return this.#hexOwners ??= new Uint16Array(this.byteArray.buffer, this.dimensions.hexOwnerOffset, this.hexCount);
  }

  #hexProvinceIds;
  get hexProvinceIds() {
    return this.#hexProvinceIds ??= new Uint32Array(this.byteArray.buffer, this.dimensions.hexProvinceIdOffset, this.hexCount);
  }

  set hexProvinceIds(value) {
    this.hexProvinceIds.set(value);
  }

  get maxProvinceFinance() {
    return this.dataView.getUint32(this.dimensions.maxProvinceFinanceOffset);
  }

  set maxProvinceFinance(value) {
    this.dataView.setUint32(this.dimensions.maxProvinceFinanceOffset, value);
  }

  #provinceFinanceStates;
  get provinceFinanceStates() {
    return this.#provinceFinanceStates ??= new Uint32Array(this.byteArray.buffer, this.dimensions.provinceFinanceStateOffset);
  }

  set provinceFinanceStates(value) {
    this.provinceFinanceStates.set(value);
  }

  reconstructProvinceHexIds() {
    this.provinceHexIdsByProvinceId = [];

    for (let i = 0; i < this.hexCount; i++) {
      const provinceId = this.hexProvinceIds[i];
      this.provinceHexIdsByProvinceId[provinceId] ??= new Set();
      this.provinceHexIdsByProvinceId[provinceId].add(i);
    }
  }
}
