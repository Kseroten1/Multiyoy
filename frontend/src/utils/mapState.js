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
   */
  constructor(playerCount, hexCount) {
    this.data = new MapData(hexCount, playerCount);
    this.logic = new MapLogic(this.data);
    this.renderer = new MapRenderer(this.data);
  }
}