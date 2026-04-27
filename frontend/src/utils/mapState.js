import {MapData} from "./mapData.js";
import {MapLogic} from "./mapLogic.js";
import {MapRenderer} from "./mapRenderer.js";

/**
 * MapState orchestrates the different layers.
 * It provides a single point of entry for the application while keeping responsibilities separated.
 */
export class MapState {
  /**
   * @param {number} playerCount
   * @param {number} hexCount
   * @param {ArrayBuffer | SharedArrayBuffer} [sharedBuffer]
   */
  constructor(playerCount, hexCount, sharedBuffer) {
    this.data = new MapData(hexCount, playerCount, 0, sharedBuffer);
    this.logic = new MapLogic(this.data);
    this.renderer = new MapRenderer(this.data);
  }
}