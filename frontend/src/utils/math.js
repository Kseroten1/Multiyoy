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

/**
 *
 * @param color1 {number}
 * @param color2 {number}
 * @param isVertical {boolean | number}
 * @returns {number}
 */
export function makeHexColorMask(color1, color2, isVertical) {
  const orientationBit = isVertical ? 1 : 0;
  return (orientationBit << 8) | (color2 << 4) | color1;
}