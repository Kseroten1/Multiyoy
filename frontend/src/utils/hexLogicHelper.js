import {screenToWorld} from "./math.js";

export function getHexNeighbors(index, sideLength) {
  const r = Math.floor(index / sideLength);
  const isRowOdd = (r & 1) !== 0;
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
  if (col < 0 || col >= sideLength || row < 0 || row >= sideLength) return -1;
  return row * sideLength + col;
}

export function calculateHexMaskIndex(indices, mapState, sideLength) {
  const neighborMasks = [
    0b000010, // East
    0b010000, // West
    0b000001, // LowerRight
    0b100000, // LowerLeft
    0b000100, // UpperRight
    0b001000  // UpperLeft
  ];

  for (const currentIndex of indices) {
    const neighbors = getHexNeighbors(currentIndex, sideLength);
    const currentOwner = mapState.hexOwners[currentIndex];
    let mask = 0;

    for (const neighborId of neighbors) {
      const i = neighbors.indexOf(neighborId);
      if (currentOwner !== mapState.hexOwners[neighborId]) {mask |= neighborMasks[i];}
    }

    mapState.calculatedEdgeMasks[currentIndex] = mask;
  }
}