import { COLOR_TABLE_FILL, MAP_SIDE_LENGTH, PLAYER_COUNTS } from "./config.js";
import {makeHexColorMask} from "./math.js";
import {MapState} from "./mapState.js";

/** @typedef {Set<number>[]} ProvinceHexIdsByProvinceId */

/**
 * @param {number} playerCount
 */
export function createHexOwners(playerCount) {
  const owners = [];
  for (let i = 0; i < COLOR_TABLE_FILL.length; i++) {
    for (let j = 0; j < COLOR_TABLE_FILL.length; j++) {
      for (let k = 0; k < 2; k++) {
        if (owners.length >= playerCount) break;
        if (i === j && k === 1) {
          break;
        }
        owners.push(makeHexColorMask(i, j, k));
      }
      if (owners.length >= playerCount) break;
    }
    if (owners.length >= playerCount) break;
  }
  return owners;
}


/**
 * @returns {Generator<number>} Yields the current provinceId after each province is fully populated.
 * @param {MapState} mapState
 * @param {number} playerCount
 * @param {number} totalHexCount
 * @param {number} selectedMapSideLength
 */
// export 
