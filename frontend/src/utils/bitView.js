export class BitView extends Uint8Array{
    
    /**
     * Odczytuje n bitów z dowolnego offsetu.
     * @param {number} bitOffset - Offset startowy w bitach.
     * @param {number} bitLength - Ile bitów odczytać (max 32).
     */
    getBits(bitOffset, bitLength) {
        const byteOffset = Math.floor(bitOffset / 8);
        const shift = bitOffset % 8;

        // Składamy 4 bajty w uint32 (Little Endian)
        // Używamy >>> 0 aby wymusić interpretację jako unsigned int
        let result = (
            this[byteOffset] |
            (this[byteOffset + 1] << 8) |
            (this[byteOffset + 2] << 16) |
            (this[byteOffset + 3] << 24)
        ) >>> 0;

        const mask = (1 << bitLength) - 1;
        return (result >>> shift) & mask;
    }

    /**
     * Zapisuje n bitów w dowolnym offsecie.
     * @param {number} bitOffset - Offset startowy w bitach.
     * @param {number} bitLength - Ile bitów zapisać.
     * @param {number} value - Wartość do zapisania.
     */
    setBits(bitOffset, bitLength, value) {
        const byteOffset = Math.floor(bitOffset / 8);
        const shift = bitOffset % 8;
        const mask = (1 << bitLength) - 1;

        // Aktualizujemy 4 kolejne bajty, aby obsłużyć wartości przecinające granice
        for (let i = 0; i < 4; i++) {
            const currentByte = this[byteOffset + i];

            // Tworzymy maskę czyszczącą dla danego bajtu
            const clearMask = ~( (mask << shift) >>> (i * 8) ) & 0xFF;
            // Przygotowujemy bity do wpisania w ten konkretny bajt
            const writeVal = ( (value << shift) >>> (i * 8) ) & 0xFF;

            this[byteOffset + i] = (currentByte & clearMask) | writeVal;
        }
    }
}