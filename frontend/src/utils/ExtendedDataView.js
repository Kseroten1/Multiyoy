export class ExtendedDataView extends DataView {
  /**
   * Read an unsigned number with arbitrary byte length.
   *
   * @param {number} offset - Byte offset to start reading from
   * @param {number} bytes - Number of bytes to read (1–8)
   * @returns {number|bigint} Number for ≤6 bytes, BigInt for >6 bytes
   */
  getNumber(offset, bytes) {
    if (bytes < 1 || bytes > 8) {
      throw new RangeError("bytes must be between 1 and 8");
    }

    if (offset < 0 || offset + bytes > this.byteLength) {
      throw new RangeError("Offset out of bounds");
    }

    let value = 0n;

    for (let i = 0; i < bytes; i++) {
      value = (value << 8n) | BigInt(this.getUint8(offset + i));
    }

    // Return Number when safe, otherwise BigInt
    if (bytes <= 6) {
      return Number(value);
    }

    return value;
  }
  /**
   * Write an unsigned number with arbitrary byte length.
   *
   * @param {number} offset - Byte offset to start writing to
   * @param {number} bytes - Number of bytes to write (1–8)
   * @param {number|bigint} value - Value to write
   */
  setNumber(offset, bytes, value) {
    if (bytes < 1 || bytes > 8) {
      throw new RangeError("bytes must be between 1 and 8");
    }

    if (offset < 0 || offset + bytes > this.byteLength) {
      throw new RangeError("Offset out of bounds");
    }

    let v = BigInt(value);

    const maxValue = (1n << BigInt(bytes * 8)) - 1n;
    if (v < 0n || v > maxValue) {
      throw new RangeError("Value does not fit in the given byte length");
    }

    for (let i = bytes - 1; i >= 0; i--) {
      this.setUint8(offset + i, Number(v & 0xffn));
      v >>= 8n;
    }
  }
}