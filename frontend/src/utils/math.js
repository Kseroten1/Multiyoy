export function axialToCenterX(q, r) {
  return Math.sqrt(3) * (q + r / 2);
}

export function axialToCenterY(q, r) {
  return (3 / 2) * r;
}

/**
 * @param q
 * @param r
 * @returns {number[x,y]}
 */
export function axialToCenter(q, r) {
  return [axialToCenterX(q, r), axialToCenterY(q, r)];
}

export function pixelToAxial(x, y) {
  const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y);
  const r = (2 / 3 * y);
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
 * @param edgesEnabled
 * @returns {number}
 */
export function makeMask(edgesEnabled) {
  let mask = 0;
  for (let index = 0; index < 8; index++) {
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