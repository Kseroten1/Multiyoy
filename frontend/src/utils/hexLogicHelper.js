import {screenToWorld} from "./math.js";
import {INVALID_HEX_INDEX} from "./config.js";

/**
 * 
 * @param index {number}
 * @param sideLength {number}
 * @returns {number[]}
 */
export function getHexNeighbors(index, sideLength) {
  const r = Math.floor(index / sideLength);
  const isRowOdd = +((r & 1) !== 0);
  const c = index % sideLength;

  const neighbors = [];

  if (c + 1 < sideLength) neighbors.push(index + 1);
  if (c - 1 >= 0) neighbors.push(index - 1);

  if (r + 1 < sideLength) {
    const rowBelow = index + sideLength;
    if (c + isRowOdd < sideLength) neighbors.push(rowBelow + isRowOdd);
    if (c + isRowOdd - 1 >= 0) neighbors.push(rowBelow + isRowOdd - 1);
  }

  if (r - 1 >= 0) {
    const rowAbove = index - sideLength;
    if (c + isRowOdd < sideLength) neighbors.push(rowAbove + isRowOdd);
    if (c + isRowOdd - 1 >= 0) neighbors.push(rowAbove + isRowOdd - 1);
  }

  return neighbors;
}

/**
 * 
 * @param mouseX {number}
 * @param mouseY {number}
 * @param matrix {DOMMatrix}
 * @param sideLength {number}
 * @returns {number}
 */
export function getHexIndexFromMouseCoords(mouseX, mouseY, matrix, sideLength) {
  const { x: worldX, y: worldY } = screenToWorld(mouseX, mouseY, matrix);
  const sqrt3 = 1.73205081;
  const row = Math.round(worldY / 1.5);
  const rowOffset = (Math.abs(row) % 2) * 0.5 * sqrt3;
  const col = Math.round((worldX - rowOffset) / sqrt3);

  // Zabezpieczenie przed wyjściem poza zakres
  // more readable version
  // if (col < 0 || col >= sideLength || row < 0 || row >= sideLength) return INVALID_HEX_INDEX;
  if ((col >>> 0) >= sideLength || (row >>> 0) >= sideLength) return INVALID_HEX_INDEX;
  return row * sideLength + col;
}

