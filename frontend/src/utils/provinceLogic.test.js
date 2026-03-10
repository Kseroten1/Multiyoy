import {expect, test, describe} from "bun:test";
import {handleProvinceRecalculation, syncProvinceCache} from "./provinceLogic.js";
import {UNASSIGNED_PROVINCE_ID} from "./config.js";

const MAP_SIDE = 10;
const MAX_HEXES = 100;

function setupTest() {
  return {
    mainProvinceArray: [],
    hexProvinceIds: new Int32Array(MAX_HEXES).fill(UNASSIGNED_PROVINCE_ID),
    hexOwners: new Float32Array(MAX_HEXES),
    hexEdgeMasks: new Float32Array(MAX_HEXES),
  };
}

describe("Province Logic (Direct Data Assertions)", () => {

  test("Merge: Hex 45 should join Province 0 and consume Province 1", () => {
    const {mainProvinceArray, hexProvinceIds, hexOwners, hexEdgeMasks} = setupTest();
    const ownerId = 1;
    hexProvinceIds[44] = 0;
    hexOwners[44] = ownerId;
    mainProvinceArray[0] = {hexes: [44]};

    hexProvinceIds[46] = 1;
    hexOwners[46] = ownerId;
    mainProvinceArray[1] = {hexes: [46]};

    syncProvinceCache(0, mainProvinceArray, hexOwners, hexEdgeMasks);
    syncProvinceCache(1, mainProvinceArray, hexOwners, hexEdgeMasks);

    hexOwners[45] = ownerId;

    handleProvinceRecalculation(
      45,
      mainProvinceArray,
      hexProvinceIds,
      hexOwners,
      hexEdgeMasks,
      MAP_SIDE,
    );

    const finalProvinceId = hexProvinceIds[45];

    expect(finalProvinceId).not.toBe(UNASSIGNED_PROVINCE_ID);

    const masterProvince = mainProvinceArray[finalProvinceId];
    expect(masterProvince.hexes).toContain(44);
    expect(masterProvince.hexes).toContain(45);
    expect(masterProvince.hexes).toContain(46);

    const otherProvinceId = finalProvinceId === 0 ? 1 : 0;
    const otherProvince = mainProvinceArray[otherProvinceId];

    expect(otherProvince.hexes.length).toBe(0);
    expect(otherProvince.owners).toBeNull();
    expect(otherProvince.indices).toBeNull();
  });

  test("Split: Breaking a 3-hex line into two separate provinces", () => {
    const {mainProvinceArray, hexProvinceIds, hexOwners, hexEdgeMasks} = setupTest();
    const initialOwner = 1;
    const hexes = [44, 45, 46];
    mainProvinceArray[0] = {hexes: [...hexes]};

    for (const id of hexes) {
      hexProvinceIds[id] = 0;
      hexOwners[id] = initialOwner;
    }

    hexOwners[45] = 2;

    handleProvinceRecalculation(
      45,
      mainProvinceArray,
      hexProvinceIds,
      hexOwners,
      hexEdgeMasks,
      MAP_SIDE,
    );

    const activeProvinces = mainProvinceArray.filter((province) => province.hexes.length);
    expect(activeProvinces.length).toBe(3);

    const provinceId44 = hexProvinceIds[44];
    const provinceId45 = hexProvinceIds[45];
    const provinceId46 = hexProvinceIds[46];

    expect(provinceId44).not.toBe(provinceId45);
    expect(provinceId46).not.toBe(provinceId45);
    expect(provinceId44).not.toBe(provinceId46);

    expect(hexOwners[45]).toBe(2);
  });

  test("Sync: Cache arrays should be populated after recalculation", () => {
    const {mainProvinceArray, hexProvinceIds, hexOwners, hexEdgeMasks} = setupTest();

    const targetHex = 50;
    const targetOwner = 7;
    hexOwners[targetHex] = targetOwner;

    handleProvinceRecalculation(
      targetHex,
      mainProvinceArray,
      hexProvinceIds,
      hexOwners,
      hexEdgeMasks,
      MAP_SIDE,
    );

    const provinceId = hexProvinceIds[targetHex];
    const province = mainProvinceArray[provinceId];

    expect(province.owners).toBeInstanceOf(Float32Array);
    expect(province.indices).toBeInstanceOf(Float32Array);

    expect(province.owners[0]).toBe(targetOwner);
    expect(province.indices[0]).toBe(targetHex);
  });
});