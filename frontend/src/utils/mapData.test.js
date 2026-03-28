import { describe, it, expect } from 'vitest';
import { MapData } from './mapData.js';

describe('MapData Resizing', () => {
  it('should resize when increasing provinceCount', () => {
    const hexCount = 100;
    const playerCount = 2;
    const mapData = new MapData(hexCount, playerCount);
    
    const initialSize = mapData.byteArray.length;
    mapData.provinceCount = 10;
    expect(mapData.provinceCount).toBe(10);
    expect(mapData.provinceFinanceStates.length).toBe(10);

    const midSize = mapData.byteArray.length;
    mapData.provinceCount = 100;
    expect(mapData.provinceCount).toBe(100);
    expect(mapData.provinceFinanceStates.length).toBe(100);
    expect(mapData.byteArray.length).toBeGreaterThan(midSize);
  });

  it('maintains data when resizing', () => {
    const hexCount = 50;
    const playerCount = 2;
    const mapData = new MapData(hexCount, playerCount);
    
    mapData.hexOwners[0] = 42;
    mapData.provinceFinanceStates[0] = 1337;
    
    mapData.provinceCount = 50;
    expect(mapData.hexOwners[0]).toBe(42);
    expect(mapData.provinceFinanceStates[0]).toBe(1337);
  });
});
