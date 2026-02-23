import {selectedMapWidth} from "../script.js";
import {screenToWorld} from "./math.js";

export function getHexNeighbors(index) {
  const r = Math.floor(index / selectedMapWidth);
  const isRowOdd = (r & 1) !== 0;

  return [
    index + 1,                                  // 0: East
    index - 1,                                  // 1: West
    index + selectedMapWidth + isRowOdd,        // 2: LowerRight
    index + selectedMapWidth + isRowOdd - 1,    // 3: LowerLeft
    index - selectedMapWidth + isRowOdd,        // 4: UpperRight
    index - selectedMapWidth + isRowOdd - 1,    // 5: UpperLeft
  ];
}

/**
 * 
 * @param mouseX {number}
 * @param mouseY {number}
 * @param matrix {DOMMatrix}
 * @returns {number}
 */
export function getHexIndexFromCoords(mouseX, mouseY, matrix) {
  const { x: worldX, y: worldY } = screenToWorld(mouseX, mouseY, matrix);
  const sqrt3 = 1.73205081;
  const row = Math.round(worldY / 1.5);
  const rowOffset = (Math.abs(row) % 2) * 0.5 * sqrt3;
  const col = Math.round((worldX - rowOffset) / sqrt3);

  // Zabezpieczenie przed wyjściem poza zakres
  if (col < 0 || col >= selectedMapWidth || row < 0) return -1;
  return row * selectedMapWidth + col;
}