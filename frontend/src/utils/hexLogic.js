import { makeMask } from "./math.js";

export const directions = [
  {dq: 0, dr: 1}, {dq: 1, dr: 0}, {dq: 1, dr: -1},
  {dq: 0, dr: -1}, {dq: -1, dr: 0}, {dq: -1, dr: 1}
];


export function calculateHexEdgeMask(bloke, neighbours) {
  return makeMask([
    bloke !== neighbours[0],
    bloke !== neighbours[1],
    bloke !== neighbours[2],
    bloke !== neighbours[3],
    bloke !== neighbours[4],
    bloke !== neighbours[5],
  ])
}