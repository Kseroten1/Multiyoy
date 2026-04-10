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

  // Align for Float32Array (4 bytes)
  if (currentOffset % 4 !== 0) currentOffset += (4 - (currentOffset % 4));
  const calculatedEdgeMasksInBytesPerElement = 4;
  const calculatedEdgeMasksOffset = currentOffset;
  currentOffset += calculatedEdgeMasksInBytesPerElement * hexCount;

  const chuj =
    {
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
      calculatedEdgeMasksInBytesPerElement,
      calculatedEdgeMasksOffset,
      totalArraySize: currentOffset
    }

  return (chuj);
}

export class MapData {
  /**
   * @param {number} hexCount
   * @param {number} playerCount
   * @param {number} initialProvinceCount
   * @param {ArrayBuffer | SharedArrayBuffer} [sharedBuffer]
   */
  constructor(hexCount, playerCount, initialProvinceCount = 0, sharedBuffer) {
    const minProvinceCount = 1;
    const initialCount = Math.max(initialProvinceCount, minProvinceCount);
    this.dimensions = calculateMapStateDimensions(hexCount, initialCount);
    
    // Max capacity: provinces cannot exceed hex count in Multiyoy rules.
    const maxProvinceCount = Math.max(hexCount, initialCount);
    const maxDimensions = calculateMapStateDimensions(hexCount, maxProvinceCount);
    
    if (typeof SharedArrayBuffer === 'undefined') {
      console.warn("SharedArrayBuffer is not available. Falling back to ArrayBuffer. Map generation will not be shared between threads properly.");
      // Fallback to regular ArrayBuffer if SharedArrayBuffer is not supported or allowed
      const buffer = sharedBuffer ?? new ArrayBuffer(maxDimensions.totalArraySize, { maxByteLength: maxDimensions.totalArraySize });
      this.byteArray = new Uint8Array(buffer);
      this.dataView = new DataView(buffer);
    } else {
      const buffer = sharedBuffer ?? new SharedArrayBuffer(maxDimensions.totalArraySize);
      this.byteArray = new Uint8Array(buffer);
      this.dataView = new DataView(buffer);
    }
    
    this.hexCount = hexCount;
    this.playerCount = playerCount;
    this.provinceCount = initialCount;
    
    /** @typedef {Set<number>[]} ProvinceHexIdsByProvinceId */
    /** @type {ProvinceHexIdsByProvinceId} */
    this.provinceHexIdsByProvinceId = [new Set()];
  }

  /**
     * @param {number} count
     */
  ensureProvinceCapacity(count) {
    const neededDimensions = calculateMapStateDimensions(this.hexCount, count);
    if (this.byteArray.buffer.byteLength >= neededDimensions.totalArraySize) {
      return;
    }

    if (this.byteArray.buffer instanceof ArrayBuffer) {
      this.byteArray.buffer.resize(neededDimensions.totalArraySize);
    }
    this.dimensions = neededDimensions;

    // Invalidate cached views that might depend on total length or provinceCount
    this.#provinceFinanceStates = null;
  }
  
  /** @type {number} */ #hexCount; 
  get hexCount() {
    this.#hexCount ??= (this.dataView.getUint8(this.dimensions.hexCountOffset) << 16) | this.dataView.getUint16(this.dimensions.hexCountOffset + 1);
    return this.#hexCount;
  }

  set hexCount(number) {
    this.#hexCount = number;
    this.dataView.setUint8(this.dimensions.hexCountOffset, (number >> 16) & 0xff);
    this.dataView.setUint16(this.dimensions.hexCountOffset + 1, number & 0xffff);
  }

  /** @type {number} */ #playerCount;
  get playerCount() {
    this.#playerCount ??= this.dataView.getUint16(this.dimensions.playerCountOffset);
    return this.#playerCount;
  }

  set playerCount(value) {
    this.#playerCount = value;
    this.dataView.setUint16(this.dimensions.playerCountOffset, value);
  }

  /** @type {number} */ #currentPlayer;
  get currentPlayer() {
    this.#currentPlayer ??= this.dataView.getUint16(this.dimensions.currentPlayerOffset);
    return this.#currentPlayer;
  }

  set currentPlayer(value) {
    this.#currentPlayer = value;
    this.dataView.setUint16(this.dimensions.currentPlayerOffset, value);
  }

  /** @type {number} */ #currentRound;
  get currentRound() {
    this.#currentRound ??= this.dataView.getUint32(this.dimensions.currentRoundOffset);
    return this.#currentRound;
  }

  set currentRound(value) {
    this.#currentRound = value;
    this.dataView.setUint32(this.dimensions.currentRoundOffset, value);
  }

  /** @type {number} */ #provinceCount;
  get provinceCount() {
    this.#provinceCount ??= this.dataView.getUint32(this.dimensions.provinceCountOffset);
    return this.#provinceCount;
  }

  set provinceCount(value) {
    this.ensureProvinceCapacity(value);
    this.#provinceCount = value;
    this.dataView.setUint32(this.dimensions.provinceCountOffset, value);
    this.#provinceFinanceStates = null;
  }

  /** @type {Uint8Array} */#hexStates;
  get hexStates() {
    return this.#hexStates ??= new Uint8Array(this.byteArray.buffer, this.dimensions.hexStateOffset, this.dimensions.hexStateInBytesPerElement * this.hexCount);
  }

  set hexStates(value) {
    this.byteArray.set(value, this.dimensions.hexStateOffset);
  }

  /** @type {Uint16Array} */ #hexOwners;
  get hexOwners() {
    return this.#hexOwners ??= new Uint16Array(this.byteArray.buffer, this.dimensions.hexOwnerOffset, this.hexCount);
  }

  /** @type {Uint32Array} */ #hexProvinceIds;
  get hexProvinceIds() {
    return this.#hexProvinceIds ??= new Uint32Array(this.byteArray.buffer, this.dimensions.hexProvinceIdOffset, this.hexCount);
  }

  set hexProvinceIds(value) {
    this.hexProvinceIds.set(value);
  }

  /** @type {number} */ #maxProvinceFinance;
  get maxProvinceFinance() {
    this.#maxProvinceFinance ??= this.dataView.getUint32(this.dimensions.maxProvinceFinanceOffset);
    return this.#maxProvinceFinance;
  }

  set maxProvinceFinance(value) {
    this.#maxProvinceFinance = value;
    this.dataView.setUint32(this.dimensions.maxProvinceFinanceOffset, value);
  }

  /** @type {Uint32Array} */ #provinceFinanceStates;
  get provinceFinanceStates() {
    return this.#provinceFinanceStates ??= new Uint32Array(this.byteArray.buffer, this.dimensions.provinceFinanceStateOffset, this.provinceCount);
  }

  set provinceFinanceStates(value) {
    this.provinceFinanceStates.set(value);
  }

  /** @type {Float32Array} */ #calculatedEdgeMasks;
  get calculatedEdgeMasks() {
    return this.#calculatedEdgeMasks ??= new Float32Array(this.byteArray.buffer, this.dimensions.calculatedEdgeMasksOffset, this.hexCount);
  }

  set calculatedEdgeMasks(value) {
    this.calculatedEdgeMasks.set(value);
  }
}
