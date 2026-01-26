import { BitView } from '../utils/bitView.js';

export class MapStateManager {
    constructor(hexCount, playerCount, provinceCount) {
        // --- 1. STAŁE OFFSETY NAGŁÓWKA (w bitach) ---
        this.HEADER = {
            hexCount: 0,        // uint24
            playerCount: 24,    // uint24
            currentPlayer: 48,  // uint24
            currentRound: 72,   // uint32
            provinceCount: 104, // uint32
            maxFinance: 136,    // int32
        };

        const DATA_START = 168; // Start danych masowych po nagłówku

        // --- 2. PARAMETRY DYNAMICZNE ---
        this.hexCount = hexCount;
        this.playerCount = playerCount;
        this.provinceCount = provinceCount;

        // Wyliczamy ile bitów potrzebuje każdy rekord
        this.bitsPerPlayer = Math.ceil(Math.log2(playerCount)) || 1;
        this.bitsPerProvince = Math.ceil(Math.log2(provinceCount)) || 1;

        // --- 3. OFFSETY TABLIC (zależne od wartości w nagłówku) ---
        this.OFFSETS = {
            hexState: DATA_START,
            hexColor: DATA_START + (hexCount * 8),
            provinceMapping: DATA_START + (hexCount * 8) + (hexCount * this.bitsPerPlayer),
            // Finanse są na końcu, by zmiana ich rozmiaru nie psuła reszty offsetów
            provinceFinance: DATA_START + (hexCount * 8) + (hexCount * this.bitsPerPlayer) + (hexCount * this.bitsPerProvince)
        };

        // --- 4. ALOKACJA ---
        // Na ten moment zakładamy 32 bity na finanse prowincji (zapas)
        const totalBits = this.OFFSETS.provinceFinance + (provinceCount * 32);
        const bufferSize = Math.ceil(totalBits / 8);

        this.buffer = new ArrayBuffer(bufferSize);
        this.view = new BitView(this.buffer);

        // --- 5. INICJALIZACJA NAGŁÓWKA ---
        this.view.setBits(this.HEADER.hexCount, 24, hexCount);
        this.view.setBits(this.HEADER.playerCount, 24, playerCount);
        this.view.setBits(this.HEADER.provinceCount, 32, provinceCount);
    }

    // --- API DLA HEKSAGONÓW ---

    setHexState(index, state) {
        const bitPos = this.OFFSETS.hexState + (index * 8);
        this.view.setBits(bitPos, 8, state);
    }

    getHexState(index) {
        const bitPos = this.OFFSETS.hexState + (index * 8);
        return this.view.getBits(bitPos, 8);
    }

    setHexOwner(index, playerId) {
        const bitPos = this.OFFSETS.hexColor + (index * this.bitsPerPlayer);
        this.view.setBits(bitPos, this.bitsPerPlayer, playerId);
    }

    getHexOwner(index) {
        const bitPos = this.OFFSETS.hexColor + (index * this.bitsPerPlayer);
        return this.view.getBits(bitPos, this.bitsPerPlayer);
    }

    setHexProvince(index, provinceId) {
        const bitPos = this.OFFSETS.provinceMapping + (index * this.bitsPerProvince);
        this.view.setBits(bitPos, this.bitsPerProvince, provinceId);
    }

    getHexProvince(index) {
        const bitPos = this.OFFSETS.provinceMapping + (index * this.bitsPerProvince);
        return this.view.getBits(bitPos, this.bitsPerProvince);
    }

    // --- API DLA FINANSÓW ---

    setProvinceFinance(provinceIndex, amount, bits = 32) {
        const bitPos = this.OFFSETS.provinceFinance + (provinceIndex * bits);
        this.view.setBits(bitPos, bits, amount);
    }
}