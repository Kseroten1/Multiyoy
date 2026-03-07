import { expect, test, describe } from "bun:test";
import { handleProvinceRecalculation, syncProvinceCache } from "./provinceLogic.js";
import { UNASSIGNED_PROVINCE_ID } from "./config.js";

const MAP_SIDE = 10;
const MAX_HEXES = 100;

function createMockEnvironment() {
  const mapState = {
    owners: new Float32Array(MAX_HEXES).fill(0),
    provinceIds: new Int32Array(MAX_HEXES).fill(UNASSIGNED_PROVINCE_ID),
    calculatedEdgeMasks: new Float32Array(MAX_HEXES).fill(0),
    getHexOwner: (id) => mapState.owners[id],
    getHexProvinceId: (id) => mapState.provinceIds[id],
    setHexProvinceId: (hexId, provinceId) => { mapState.provinceIds[hexId] = provinceId; },
  };
  return { mapState, mainProvinceArray: [] };
}


/**
 * @param env { mapState, mainProvinceArray }
 * @param hexes {{ id: number, owner: number, provinceId: number }[]}
 */
function setupHexes(env, hexes) {
  for (const { id, owner, provinceId } of hexes) {
    env.mapState.owners[id] = owner;
    env.mapState.provinceIds[id] = provinceId;
    if (provinceId !== UNASSIGNED_PROVINCE_ID) {
      if (!env.mainProvinceArray[provinceId]) {
        env.mainProvinceArray[provinceId] = { hexes: [] };
      }
      env.mainProvinceArray[provinceId].hexes.push(id);
    }
  }
}

describe("Province Logic (Direct Data Assertions)", () => {

  test("Merge: Hex 45 should join Province 0 and consume Province 1", () => {
    const env = createMockEnvironment();

    setupHexes(env, [
      { id: 44, owner: 1, provinceId: 0 },
      { id: 46, owner: 1, provinceId: 1 }
    ]);

    syncProvinceCache(0, env.mainProvinceArray, env.mapState);
    syncProvinceCache(1, env.mainProvinceArray, env.mapState);

    env.mapState.owners[45] = 1;
    handleProvinceRecalculation(45, env.mainProvinceArray, env.mapState, MAP_SIDE);

    const finalProvinceId = env.mapState.getHexProvinceId(44);
    const masterProvince = env.mainProvinceArray[finalProvinceId];

    expect(finalProvinceId).not.toBe(UNASSIGNED_PROVINCE_ID);
    expect(masterProvince.hexes).toContain(44);
    expect(masterProvince.hexes).toContain(45);
    expect(masterProvince.hexes).toContain(46);

    const otherProvinceId = finalProvinceId === 0 ? 1 : 0;
    expect(env.mainProvinceArray[otherProvinceId].hexes.length).toBe(0);
  });

  test("Split: Breaking a 3-hex line into two separate provinces", () => {
    const env = createMockEnvironment();

    setupHexes(env, [
      { id: 44, owner: 1, provinceId: 0 },
      { id: 45, owner: 1, provinceId: 0 },
      { id: 46, owner: 1, provinceId: 0 }
    ]);

    env.mapState.owners[45] = 2;
    handleProvinceRecalculation(45, env.mainProvinceArray, env.mapState, MAP_SIDE);

    const activeProvinces = env.mainProvinceArray.filter(p => p?.hexes?.length > 0);
    expect(activeProvinces.length).toBe(3);

    const provinceId45 = env.mapState.getHexProvinceId(45);
    expect(env.mapState.getHexOwner(45)).toBe(2);
    expect(env.mainProvinceArray[provinceId45].hexes).toEqual([45]);

    const provinceId44 = env.mapState.getHexProvinceId(44);
    const provinceId46 = env.mapState.getHexProvinceId(46);
    expect(provinceId44).not.toBe(provinceId46);
  });

  test("Sync: Cache arrays should be populated after recalculation", () => {
    const env = createMockEnvironment();

    env.mapState.owners[50] = 7;
    handleProvinceRecalculation(50, env.mainProvinceArray, env.mapState, MAP_SIDE);

    const provinceId = env.mapState.getHexProvinceId(50);
    const province = env.mainProvinceArray[provinceId];

    expect(province.owners[0]).toBe(7);
    expect(province.indices[0]).toBe(50);
  });
});