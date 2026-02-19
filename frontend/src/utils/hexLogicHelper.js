import {selectedMapWidth} from "../script.js";

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
