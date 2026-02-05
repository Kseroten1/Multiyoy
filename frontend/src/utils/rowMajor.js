export function encodeRowMajor(q, r, mapWidth) {
  const col = q + (r - (r & 1)) / 2;
  const row = r;

  return row * mapWidth + col;
}

/**
 * 
 * @param index
 * @param mapWidth
 * @returns {{q: number, r: number}}
 */
export function decodeRowMajor(index, mapWidth) {
  const col = index % mapWidth;
  const row = Math.floor(index / mapWidth);
  // 2. Convert Offset(col,row) to Axial(q,r)
  const q = col - (row - (row & 1)) / 2;
  const r = row;
  return { q, r };
}