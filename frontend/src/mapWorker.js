import { MapState } from "./utils/mapState.js";
import { generateSlayLikeMap } from "./utils/mapGenerator.js";

self.onmessage = async (e) => {
  const { config, sharedBuffer } = e.data;
  
  const mapState = new MapState(config.playerCount, config.totalHexCount, sharedBuffer);
  generateSlayLikeMap(mapState.data, mapState.logic);

  self.postMessage({ type: 'COMPLETE' });
};
