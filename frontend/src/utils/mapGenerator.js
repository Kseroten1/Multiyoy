import { decodeRowMajor, encodeRowMajor } from './rowMajor.js';

/**
 * Generates a map using a random walk algorithm.
 * 
 * @param {number} width - The width of the map (corresponds to selectedMapWidth).
 * @param {object} options - Generation options.
 * @param {number} [options.totalHexagons=1000] - The target number of hexagons in the map.
 * @param {number} [options.numBatches=1] - The number of batches to walk.
 * @returns {Promise<Uint8Array>} A promise that resolves to a Uint8Array of size width**2 with 1s and 0s.
 */
export async function generateMap(width, {
  totalHexagons = 1000,
  numBatches = 1
} = {}) {
  const size = width * width;
  const result = new Uint8Array(size);
  
  if (totalHexagons <= 0) return result;
  if (totalHexagons > size) totalHexagons = size;

  const hexes = new Set();
  const hexList = [];
  
  const axialNeighbors = [
    { dq: 1, dr: 0 },
    { dq: -1, dr: 0 },
    { dq: 0, dr: 1 },
    { dq: 0, dr: -1 },
    { dq: 1, dr: -1 },
    { dq: -1, dr: 1 }
  ];

  const cryptoArray = new Uint32Array(1);

  for (let b = 0; b < numBatches; b++) {
    if (hexes.size >= totalHexagons) break;

    // Start in a random place for each batch
    window.crypto.getRandomValues(cryptoArray);
    let row = cryptoArray[0] % width;
    window.crypto.getRandomValues(cryptoArray);
    let col = cryptoArray[0] % width;
    
    // Convert to axial for easy neighbor calculation
    let q = col - (row - (row & 1)) / 2;
    let r = row;

    let currentIdx = encodeRowMajor(q, r, width);
    if (result[currentIdx] === 0) {
      result[currentIdx] = 1;
      hexes.add(currentIdx);
      hexList.push(currentIdx);
    }

    const remainingToAssign = totalHexagons - hexes.size;
    const remainingBatches = numBatches - b;
    const targetHexagonsForThisBatch = Math.ceil(remainingToAssign / remainingBatches);
    let hexagonsAddedInThisBatch = 0;

    while (hexagonsAddedInThisBatch < targetHexagonsForThisBatch && hexes.size < totalHexagons) {
      window.crypto.getRandomValues(cryptoArray);
      const dir = axialNeighbors[cryptoArray[0] % 6];
      
      const nextQ = q + dir.dq;
      const nextR = r + dir.dr;
      
      // Convert back to offset to check boundaries
      const nextRow = nextR;
      const nextCol = nextQ + (nextR - (nextR & 1)) / 2;

      if (nextRow >= 0 && nextRow < width && nextCol >= 0 && nextCol < width) {
        q = nextQ;
        r = nextR;
        const index = nextRow * width + nextCol;
        if (result[index] === 0) {
          result[index] = 1;
          hexes.add(index);
          hexList.push(index);
          hexagonsAddedInThisBatch++;
        }
      } else {
        // If we hit the border, we don't move, but we will pick a new direction in the next iteration.
        // Alternatively, we could jump back to a random hex in the set to avoid getting stuck.
        window.crypto.getRandomValues(cryptoArray);
        if ((cryptoArray[0] % 100) < 5) { // 5% chance to jump back to a random hex to avoid being stuck at borders
           window.crypto.getRandomValues(cryptoArray);
           const randomHexIdx = hexList[cryptoArray[0] % hexList.length];
           const coords = decodeRowMajor(randomHexIdx, width);
           q = coords.q;
           r = coords.r;
        }
      }
    }
  }

  return result;
}
