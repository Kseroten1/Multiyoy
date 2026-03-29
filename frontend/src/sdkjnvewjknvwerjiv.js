class ResizableByteArray {
  buffer;
  
  constructor(initialCapacity = 4, maxCapacity = 1024) {
    this.buffer = new ArrayBuffer(initialCapacity, {
      maxByteLength: maxCapacity,
    });
    this.length = 0;
  }

  push(value) {
    if (this.length >= this.buffer.byteLength) {
      const newSize = Math.min(
        Math.max(1, this.buffer.byteLength * 2),
        this.buffer.maxByteLength
      );

      if (newSize <= this.buffer.byteLength) {
        throw new Error("Buffer is full");
      }

      this.buffer.resize(newSize);
    }

    new Uint8Array(this.buffer)[this.length++] = value;
  }

  toArray() {
    return Array.from(new Uint8Array(this.buffer).slice(0, this.length));
  }
}

// To być może działa
const indicies2 = new ResizableByteArray(0, 99990);
for (let i = 0; i <= 5; i++) {
  indicies2.push(i);
}
const typed2 = new Uint8Array(indicies2.buffer);
console.log(new Uint8Array(typed2.buffer, 0, 6));

for (let i = 5; i <= 10; i++) {
  indicies2.push(i);
}
console.log(new Uint8Array(typed2.buffer, 0, 12));

//
//
// for (let i = 0; i < 10; i++) {
//   indicies2.push(i);
// }
//
// console.log(typed2);