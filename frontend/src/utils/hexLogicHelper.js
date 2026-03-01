import {selectedMapSideLength} from "../script.js";
import {screenToWorld} from "./math.js";

export function getHexNeighbors(index) {
  const r = Math.floor(index / selectedMapSideLength);
  const isRowOdd = (r & 1) !== 0;
  const c = index % selectedMapSideLength;

  const neighbors = [];

  if (c + 1 < selectedMapSideLength) neighbors.push(index + 1);
  if (c - 1 >= 0) neighbors.push(index - 1);

  if (r + 1 < selectedMapSideLength) {
    const rowBelow = index + selectedMapSideLength;
    if (c + isRowOdd < selectedMapSideLength) neighbors.push(rowBelow + isRowOdd);
    if (c + isRowOdd - 1 >= 0) neighbors.push(rowBelow + isRowOdd - 1);
  }

  if (r - 1 >= 0) {
    const rowAbove = index - selectedMapSideLength;
    if (c + isRowOdd < selectedMapSideLength) neighbors.push(rowAbove + isRowOdd);
    if (c + isRowOdd - 1 >= 0) neighbors.push(rowAbove + isRowOdd - 1);
  }

  return neighbors;
}

/**
 * 
 * @param mouseX {number}
 * @param mouseY {number}
 * @param matrix {DOMMatrix}
 * @returns {number}
 */
export function getHexIndexFromMouseCoords(mouseX, mouseY, matrix) {
  const { x: worldX, y: worldY } = screenToWorld(mouseX, mouseY, matrix);
  const sqrt3 = 1.73205081;
  const row = Math.round(worldY / 1.5);
  const rowOffset = (Math.abs(row) % 2) * 0.5 * sqrt3;
  const col = Math.round((worldX - rowOffset) / sqrt3);

  // Zabezpieczenie przed wyjściem poza zakres
  if (col < 0 || col >= selectedMapSideLength || row < 0 || row >= selectedMapSideLength) return -1;
  return row * selectedMapSideLength + col;
}