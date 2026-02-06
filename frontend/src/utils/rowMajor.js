export function encodeRowMajor(q, r, width) {
  const col = q + Math.floor(r / 2);
  const row = r;
  return row * width + col;
}

export function decodeRowMajor(index, width) {
  const r = Math.floor(index / width);
  const col = index % width;
  const q = col - Math.floor(r / 2);
  return { q, r };
}