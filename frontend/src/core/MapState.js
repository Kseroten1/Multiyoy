import {ExtendedDataView} from "../utils/ExtendedDataView.js";
import {axialToCenter} from "../utils/math.js";

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
    
    calculatedCenters = new Map();

    constructor(playerCount, hexCount) {
        const dimensions = calculateMapStateDimensions(playerCount, hexCount);
        
        super(dimensions.totalArraySize); // Tu robi się ta wyjebana tablica na wszystko
        this.dimensions = dimensions;
        
        this.playerCount = playerCount;
        this.hexCount = hexCount;
        
    }

    get hexCount() {
        return this.dataView.getNumber(this.dimensions.hexCountOffset, this.dimensions.hexCountInBytes);
    }

    set hexCount(number) {
        this.dataView.setNumber(this.dimensions.hexCountOffset, this.dimensions.hexCountInBytes, number);
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

    get hexStates() {
        return new Uint8Array(this.buffer, this.dimensions.hexStateOffset, this.dimensions.hexStateInBytesPerElement * this.hexCount);
    }

    set hexStates(value) {
        this.set(value, this.dimensions.hexStateOffset);
    }

    getHexState(index) {
        return this.hexStates[index];
    }

    setHexState(index, value, q, r) {
        this.hexStates[index] = value;
        
        // Tu szukasz indexu dla pary x,y tego hexa i aktualizujesz mu środek
        const calculateCenter = axialToCenter(q, r, 1);
        this.calculatedCenters.set(index, calculateCenter);
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
    
    get arrayForHexRenderer() {
        return new Float32Array(this.calculatedCenters.values());
    }
    
}