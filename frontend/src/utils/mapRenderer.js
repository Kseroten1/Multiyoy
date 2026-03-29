export class MapRenderer {
  /**
   * @param {import("./mapData.js").MapData} mapData
   */
  constructor(mapData) {
    this.mapData = mapData;
  }

  get fillMasksArray() {
    const hexCount = this.mapData.hexCount;
    const masks = new Float32Array(hexCount);
    const hexStates = this.mapData.hexStates;
    const hexOwners = this.mapData.hexOwners;
    for (let i = 0; i < hexCount; i++) {
      masks[i] = +(hexStates[i] !== 0) * hexOwners[i];
    }
    return masks;
  }

  /**
   * @param provinceId {number}
   * @returns {{count: number, indices: Float32Array, owners: Float32Array, edgeMasks: Float32Array}}
   */
  getProvinceRenderData(provinceId) {
    const provinceHexes = this.mapData.provinceHexIdsByProvinceId[provinceId];
    const count = provinceHexes?.size ?? 0;

    const indices = new Float32Array(count);
    const owners = new Float32Array(count);
    const edgeMasks = new Float32Array(count);
    
    let i = 0;
    if (provinceHexes) {
      for (const hexIdx of provinceHexes) {
        indices[i] = hexIdx;
        owners[i] = this.mapData.hexOwners[hexIdx];
        edgeMasks[i] = this.mapData.calculatedEdgeMasks[hexIdx];
        i++;
      }
    }

    return {
      count: count,
      indices,
      owners,
      edgeMasks,
    };
  }
}
