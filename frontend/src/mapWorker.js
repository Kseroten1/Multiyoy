import { MapData } from "./utils/mapData.js";
import { MapLogic } from "./utils/mapLogic.js";
import { generateSlayLikeMap } from "./utils/mapGenerator.js";

self.onmessage = (e) => {
  const { hexCount, playerCount, sharedBuffer, sharedEdgeBuffer } = e.data;
  const mapData = new MapData(hexCount, playerCount, sharedBuffer, sharedEdgeBuffer);
  const mapLogic = new MapLogic(mapData);
  
  generateSlayLikeMap(mapData, mapLogic);
  
  self.postMessage({ status: "done" });
};
