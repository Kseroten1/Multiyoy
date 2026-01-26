/**
 * @param q
 * @param r
 * @param size
 * @returns {number[x,y]}
 */
export function axialToCenter(q, r, size) {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * (3 / 2) * r;
  return [x, y];
}

export function pixelToAxial(x, y, size) {
  const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / size;
  const r = (2 / 3 * y) / size;
  return [q, r];
}

export function hexRound(q, r) {
  const x = q;
  const z = r;
  const y = -x - z;

  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);

  const x_diff = Math.abs(rx - x);
  const y_diff = Math.abs(ry - y);
  const z_diff = Math.abs(rz - z);

  if (x_diff > y_diff && x_diff > z_diff) {
    rx = -ry - rz;
  } else if (y_diff > z_diff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return [rx, rz];
}

/**
 *
 * @param radius
 * @param size
 * @returns {number[]} Flat array of [x1,y1,x2,y2,...]
 */
export function generateAxialHexCenters(radius, size) {
  /** @type {number[]} */
  const centers = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) > radius) continue;
      centers.push(...axialToCenter(q, r, size));
    }
  }
  return centers;
}

/**
 * 
 * @param edgesEnabled
 * @returns {number}
 */
export function makeMask(edgesEnabled) {
  let mask = 0;
  for (let index = 0; index < 6; index++) {
    if (edgesEnabled[index]) {
      mask |= (1 << index);
    }
  }
  return mask;
}

/**
 * 
 * @param color1 {number}
 * @param color2 {number}
 * @param isVertical {boolean}
 * @returns {number}
 */
export function makeHexColorMask(color1, color2, isVertical) {
  const orientationBit = isVertical ? 1 : 0;
  return (orientationBit << 8) | (color2 << 4) | color1;
}