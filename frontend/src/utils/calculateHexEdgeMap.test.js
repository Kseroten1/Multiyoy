import {makeMask} from "./math.js";



function calculateHexEdgeMap(bloke, neighbours) {
  return makeMask([
    bloke !== neighbours[0],
    bloke !== neighbours[1],
    bloke !== neighbours[2],
    bloke !== neighbours[3],
    bloke !== neighbours[4],
    bloke !== neighbours[5],
  ])
}

const cases = [
  { bloke: 10, neighbours: [10, 10, 10, 10, 10, 10], expected: makeMask([0, 0, 0, 0, 0, 0]) },
  { bloke: 21, neighbours: [99, 21, 21, 21, 21, 21], expected: makeMask([1, 0, 0, 0, 0, 0]) },
  { bloke: 32, neighbours: [32, 99, 32, 32, 32, 32], expected: makeMask([0, 1, 0, 0, 0, 0]) },
  { bloke: 43, neighbours: [99, 99, 43, 43, 43, 43], expected: makeMask([1, 1, 0, 0, 0, 0]) },
  { bloke: 54, neighbours: [54, 54, 99, 54, 54, 54], expected: makeMask([0, 0, 1, 0, 0, 0]) },
  { bloke: 65, neighbours: [99, 65, 99, 65, 65, 65], expected: makeMask([1, 0, 1, 0, 0, 0]) },
  { bloke: 76, neighbours: [76, 99, 99, 76, 76, 76], expected: makeMask([0, 1, 1, 0, 0, 0]) },
  { bloke: 87, neighbours: [99, 99, 99, 87, 87, 87], expected: makeMask([1, 1, 1, 0, 0, 0]) },
  { bloke: 98, neighbours: [98, 98, 98, 99, 98, 98], expected: makeMask([0, 0, 0, 1, 0, 0]) },
  { bloke: 11, neighbours: [99, 11, 11, 99, 11, 11], expected: makeMask([1, 0, 0, 1, 0, 0]) },
  { bloke: 22, neighbours: [22, 99, 22, 99, 22, 22], expected: makeMask([0, 1, 0, 1, 0, 0]) },
  { bloke: 33, neighbours: [99, 99, 33, 99, 33, 33], expected: makeMask([1, 1, 0, 1, 0, 0]) },
  { bloke: 44, neighbours: [44, 44, 99, 99, 44, 44], expected: makeMask([0, 0, 1, 1, 0, 0]) },
  { bloke: 55, neighbours: [99, 55, 99, 99, 55, 55], expected: makeMask([1, 0, 1, 1, 0, 0]) },
  { bloke: 66, neighbours: [66, 99, 99, 99, 66, 66], expected: makeMask([0, 1, 1, 1, 0, 0]) },
  { bloke: 77, neighbours: [99, 99, 99, 99, 77, 77], expected: makeMask([1, 1, 1, 1, 0, 0]) },
  { bloke: 88, neighbours: [88, 88, 88, 88, 99, 88], expected: makeMask([0, 0, 0, 0, 1, 0]) },
  { bloke: 99, neighbours: [10, 99, 99, 99, 10, 99], expected: makeMask([1, 0, 0, 0, 1, 0]) },
  { bloke: 12, neighbours: [12, 10, 12, 12, 10, 12], expected: makeMask([0, 1, 0, 0, 1, 0]) },
  { bloke: 23, neighbours: [10, 10, 23, 23, 10, 23], expected: makeMask([1, 1, 0, 0, 1, 0]) },
  { bloke: 34, neighbours: [34, 34, 10, 34, 10, 34], expected: makeMask([0, 0, 1, 0, 1, 0]) },
  { bloke: 45, neighbours: [10, 45, 10, 45, 10, 45], expected: makeMask([1, 0, 1, 0, 1, 0]) },
  { bloke: 56, neighbours: [56, 10, 10, 56, 10, 56], expected: makeMask([0, 1, 1, 0, 1, 0]) },
  { bloke: 67, neighbours: [10, 10, 10, 67, 10, 67], expected: makeMask([1, 1, 1, 0, 1, 0]) },
  { bloke: 78, neighbours: [78, 78, 78, 10, 10, 78], expected: makeMask([0, 0, 0, 1, 1, 0]) },
  { bloke: 89, neighbours: [10, 89, 89, 10, 10, 89], expected: makeMask([1, 0, 0, 1, 1, 0]) },
  { bloke: 13, neighbours: [13, 10, 13, 10, 10, 13], expected: makeMask([0, 1, 0, 1, 1, 0]) },
  { bloke: 24, neighbours: [10, 10, 24, 10, 10, 24], expected: makeMask([1, 1, 0, 1, 1, 0]) },
  { bloke: 35, neighbours: [35, 35, 10, 10, 10, 35], expected: makeMask([0, 0, 1, 1, 1, 0]) },
  { bloke: 46, neighbours: [10, 46, 10, 10, 10, 46], expected: makeMask([1, 0, 1, 1, 1, 0]) },
  { bloke: 57, neighbours: [57, 10, 10, 10, 10, 57], expected: makeMask([0, 1, 1, 1, 1, 0]) },
  { bloke: 68, neighbours: [10, 10, 10, 10, 10, 68], expected: makeMask([1, 1, 1, 1, 1, 0]) },
  { bloke: 79, neighbours: [79, 79, 79, 79, 79, 10], expected: makeMask([0, 0, 0, 0, 0, 1]) },
  { bloke: 90, neighbours: [10, 90, 90, 90, 90, 10], expected: makeMask([1, 0, 0, 0, 0, 1]) },
  { bloke: 14, neighbours: [14, 10, 14, 14, 14, 10], expected: makeMask([0, 1, 0, 0, 0, 1]) },
  { bloke: 25, neighbours: [10, 10, 25, 25, 25, 10], expected: makeMask([1, 1, 0, 0, 0, 1]) },
  { bloke: 36, neighbours: [36, 36, 10, 36, 36, 10], expected: makeMask([0, 0, 1, 0, 0, 1]) },
  { bloke: 47, neighbours: [10, 47, 10, 47, 47, 10], expected: makeMask([1, 0, 1, 0, 0, 1]) },
  { bloke: 58, neighbours: [58, 10, 10, 58, 58, 10], expected: makeMask([0, 1, 1, 0, 0, 1]) },
  { bloke: 69, neighbours: [10, 10, 10, 69, 69, 10], expected: makeMask([1, 1, 1, 0, 0, 1]) },
  { bloke: 80, neighbours: [80, 80, 80, 10, 80, 10], expected: makeMask([0, 0, 0, 1, 0, 1]) },
  { bloke: 91, neighbours: [10, 91, 91, 10, 91, 10], expected: makeMask([1, 0, 0, 1, 0, 1]) },
  { bloke: 15, neighbours: [15, 10, 15, 10, 15, 10], expected: makeMask([0, 1, 0, 1, 0, 1]) },
  { bloke: 26, neighbours: [10, 10, 26, 10, 26, 10], expected: makeMask([1, 1, 0, 1, 0, 1]) },
  { bloke: 37, neighbours: [37, 37, 10, 10, 37, 10], expected: makeMask([0, 0, 1, 1, 0, 1]) },
  { bloke: 48, neighbours: [10, 48, 10, 10, 48, 10], expected: makeMask([1, 0, 1, 1, 0, 1]) },
  { bloke: 59, neighbours: [59, 10, 10, 10, 59, 10], expected: makeMask([0, 1, 1, 1, 0, 1]) },
  { bloke: 70, neighbours: [10, 10, 10, 10, 70, 10], expected: makeMask([1, 1, 1, 1, 0, 1]) },
  { bloke: 81, neighbours: [81, 81, 81, 81, 10, 10], expected: makeMask([0, 0, 0, 0, 1, 1]) },
  { bloke: 92, neighbours: [10, 92, 92, 92, 10, 10], expected: makeMask([1, 0, 0, 0, 1, 1]) },
  { bloke: 16, neighbours: [16, 10, 16, 16, 10, 10], expected: makeMask([0, 1, 0, 0, 1, 1]) },
  { bloke: 27, neighbours: [10, 10, 27, 27, 10, 10], expected: makeMask([1, 1, 0, 0, 1, 1]) },
  { bloke: 38, neighbours: [38, 38, 10, 38, 10, 10], expected: makeMask([0, 0, 1, 0, 1, 1]) },
  { bloke: 49, neighbours: [10, 49, 10, 49, 10, 10], expected: makeMask([1, 0, 1, 0, 1, 1]) },
  { bloke: 60, neighbours: [60, 10, 10, 60, 10, 10], expected: makeMask([0, 1, 1, 0, 1, 1]) },
  { bloke: 71, neighbours: [10, 10, 10, 71, 10, 10], expected: makeMask([1, 1, 1, 0, 1, 1]) },
  { bloke: 82, neighbours: [82, 82, 82, 10, 10, 10], expected: makeMask([0, 0, 0, 1, 1, 1]) },
  { bloke: 93, neighbours: [10, 93, 93, 10, 10, 10], expected: makeMask([1, 0, 0, 1, 1, 1]) },
  { bloke: 17, neighbours: [17, 10, 17, 10, 10, 10], expected: makeMask([0, 1, 0, 1, 1, 1]) },
  { bloke: 28, neighbours: [10, 10, 28, 10, 10, 10], expected: makeMask([1, 1, 0, 1, 1, 1]) },
  { bloke: 39, neighbours: [39, 39, 10, 10, 10, 10], expected: makeMask([0, 0, 1, 1, 1, 1]) },
  { bloke: 50, neighbours: [10, 50, 10, 10, 10, 10], expected: makeMask([1, 0, 1, 1, 1, 1]) },
  { bloke: 61, neighbours: [61, 10, 10, 10, 10, 10], expected: makeMask([0, 1, 1, 1, 1, 1]) },
  { bloke: 72, neighbours: [10, 10, 10, 10, 10, 10], expected: makeMask([1, 1, 1, 1, 1, 1]) },]

function decodeMask(mask) {
  const edgesEnabled = new Array(6).fill(false);
  for (let index = 0; index < 6; index++) {
    // Check if the bit at the current index is set to 1
    if ((mask & (1 << index)) !== 0) {
      edgesEnabled[index] = true;
    }
  }
  return edgesEnabled;
}

function prettyPrintMask(edgesEnabled) {
  return (
`
bottom right: ${edgesEnabled[0]}
right:        ${edgesEnabled[1]}
top right:    ${edgesEnabled[2]}
top left:     ${edgesEnabled[3]}
left:         ${edgesEnabled[4]}
bottom left:  ${edgesEnabled[5]}
`    
  );
}

describe('calculateHexEdgeMap()', () => {
  for (const {bloke, neighbours, expected} of cases) {
    test(`bloke: ${bloke}, neighbours: ${neighbours}`, () => {
      const actualPretty= prettyPrintMask(decodeMask(calculateHexEdgeMap(bloke, neighbours)));
      const expectedPretty = prettyPrintMask(decodeMask(expected));
      expect(actualPretty).toEqual(expectedPretty);
    })
  }
})