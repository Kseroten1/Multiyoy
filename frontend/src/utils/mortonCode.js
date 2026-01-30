export function encodeMorton(q, r, mapWidth) {
  const bits = Math.log2(mapWidth) + 1;
  const offset = mapWidth;
  const x = (q + offset) >>> 0;
  const y = (r + offset) >>> 0;
  let index = 0;
  
  for (let i = 0; i < bits; i++) {
    index |= ((x & (1 << i)) << i) | ((y & (1 << i)) << (i + 1));
  }
  return index >>> 0;
}

export function decodeMorton(index, mapWidth) {
  const bits = Math.log2(mapWidth) + 1;
  const offset = mapWidth;
  let x = 0, y = 0;
  for (let i = 0; i < bits; i++) {
    x |= (index & (1 << (2 * i))) >> i;
    y |= (index & (1 << (2 * i + 1))) >> (i + 1);
  }
  return { q: x - offset, r: y - offset };
}