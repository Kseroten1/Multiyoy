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

/**
 * 
 * @param mouseX {number}
 * @param mouseY {number}
 * @param matrix {DOMMatrix}
 * @returns {DOMPoint}
 */
export function screenToWorld(mouseX, mouseY, matrix) {
  const viewCenterX = window.innerWidth / 2;
  const viewCenterY = window.innerHeight / 2;
  const screenX = mouseX - viewCenterX;
  const screenY = mouseY - viewCenterY;
  const inv = matrix.inverse();
  return new DOMPoint(screenX, screenY).matrixTransform(inv);
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