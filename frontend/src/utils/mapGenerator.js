import { decodeRowMajor } from './rowMajor.js';

/**
 * Generates a map using SVG built-in Perlin noise (feTurbulence).
 * 
 * @param {number} width - The width of the map (corresponds to selectedMapWidth).
 * @param {object} options - SVG filter options.
 * @param {number|string} [options.baseFrequency=0.05] - The base frequency for feTurbulence.
 * @param {number} [options.numOctaves=1] - The number of octaves for feTurbulence.
 * @param {number} [options.seed=0] - The seed for feTurbulence.
 * @param {string} [options.type='turbulence'] - The type of noise ('turbulence' or 'fractalNoise').
 * @param {number} [options.threshold=0.5] - The threshold value (0-1) to determine if a hexagon is present.
 * @param {number} [options.blur=0] - The blur radius.
 * @param {number} [options.ridge=0] - The ridge intensity (0-1).
 * @param {number} [options.island=0] - The island intensity (0-1).
 * @param {number} [options.dilate=0] - The dilation radius (feMorphology).
 * @param {boolean} [options.connected=false] - Whether to ensure only the largest connected component is kept.
 * @returns {Promise<Uint8Array>} A promise that resolves to a Uint8Array of size width**2 with 1s and 0s.
 */
export async function generateMap(width, {
  baseFrequency = 0.05,
  numOctaves = 1,
  seed = 0,
  type = 'turbulence',
  threshold = 0.5,
  blur = 0,
  ridge = 0,
  island = 0,
  dilate = 0,
  connected = false
} = {}) {
  const svg = `
    <svg width="${width}" height="${width}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="islandGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="white" />
          <stop offset="100%" stop-color="black" />
        </radialGradient>
      </defs>
      <filter id="noise" x="0" y="0" width="100%" height="100%">
        <feTurbulence 
          type="${type}" 
          baseFrequency="${baseFrequency}" 
          numOctaves="${numOctaves}" 
          seed="${seed}" 
          result="raw"
        />
        <feGaussianBlur in="raw" stdDeviation="${blur}" result="blurred" />
        
        <feComponentTransfer in="blurred" result="ridged">
          <feFuncR type="table" tableValues="0 1 0" />
        </feComponentTransfer>
        
        <feComposite in="blurred" in2="ridged" operator="arithmetic" k2="${1 - ridge}" k3="${ridge}" result="combined" />
        
        <feMorphology in="combined" operator="dilate" radius="${dilate}" result="dilated" />
        
        <feComposite in="dilated" in2="SourceGraphic" operator="arithmetic" k1="${island}" k2="${1 - island}" />
      </filter>
      <rect width="100%" height="100%" fill="url(#islandGrad)" filter="url(#noise)" />
    </svg>
  `;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  try {
    const img = new Image();
    img.src = url;
    
    // Wait for the image to load and decode
    await img.decode();

    const canvas = new OffscreenCanvas(width, width);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, width, width);
    const data = imageData.data;
    let result = new Uint8Array(width * width);

    for (let i = 0; i < width * width; i++) {
      // feTurbulence output is in RGB channels. We use the red channel (index i*4).
      const val = data[i * 4] / 255;
      result[i] = val > threshold ? 1 : 0;
    }

    if (connected) {
      result = ensureConnectivity(result, width);
    }

    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Ensures that only the largest connected component of the map is kept.
 * 
 * @param {Uint8Array} data - The map data (1s and 0s).
 * @param {number} width - The width of the map.
 * @returns {Uint8Array} A new Uint8Array with only the largest connected component.
 */
function ensureConnectivity(data, width) {
  const size = width * width;
  const visited = new Uint8Array(size);
  let largestComponent = [];

  for (let i = 0; i < size; i++) {
    if (data[i] === 1 && !visited[i]) {
      const component = [];
      const queue = [i];
      visited[i] = 1;

      let head = 0;
      while (head < queue.length) {
        const curr = queue[head++];
        component.push(curr);

        const { q, r } = decodeRowMajor(curr, width);
        // Neighbors in axial coordinates for pointy-top hex grid
        const neighbors = [
          { q: q + 1, r: r },
          { q: q - 1, r: r },
          { q: q, r: r + 1 },
          { q: q, r: r - 1 },
          { q: q + 1, r: r - 1 },
          { q: q - 1, r: r + 1 }
        ];

        for (const n of neighbors) {
          const row = n.r;
          const col = n.q + (row - (row & 1)) / 2;
          if (row >= 0 && row < width && col >= 0 && col < width) {
            const ni = row * width + col;
            if (data[ni] === 1 && !visited[ni]) {
              visited[ni] = 1;
              queue.push(ni);
            }
          }
        }
      }

      if (component.length > largestComponent.length) {
        largestComponent = component;
      }
    }
  }

  const result = new Uint8Array(size);
  for (let i = 0; i < largestComponent.length; i++) {
    result[largestComponent[i]] = 1;
  }
  return result;
}
