import {selectedMapWidth} from "../script.js";
import {decodeRowMajor, encodeRowMajor} from "./rowMajor.js";

export const directions = [
  {dq: 0, dr: 1}, {dq: 1, dr: 0}, {dq: 1, dr: -1},
  {dq: 0, dr: -1}, {dq: -1, dr: 0}, {dq: -1, dr: 1}
];

// returns indexes of neighbour hexes
export function calculateHexNeighbour(index)  {
  const coords = decodeRowMajor(index, selectedMapWidth)
  let indexes = [];
  for (let i = 0; i < 6; i++) {
    indexes[i] = encodeRowMajor(coords.q + directions[i].dq, coords.r + directions[i].dr, selectedMapWidth); 
  }
  return indexes;
}