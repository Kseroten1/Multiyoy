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
 * @returns {Promise<Uint8Array>} A promise that resolves to a Uint8Array of size width**2 with 1s and 0s.
 */
export async function generateMap(width, {
  baseFrequency = 0.05,
  numOctaves = 1,
  seed = 0,
  type = 'turbulence',
  threshold = 0.5
} = {}) {
  const svg = `
    <svg width="${width}" height="${width}" xmlns="http://www.w3.org/2000/svg">
      <filter id="noise" x="0" y="0" width="100%" height="100%">
        <feTurbulence 
          type="${type}" 
          baseFrequency="${baseFrequency}" 
          numOctaves="${numOctaves}" 
          seed="${seed}" 
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" />
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
    const result = new Uint8Array(width * width);

    for (let i = 0; i < width * width; i++) {
      // feTurbulence output is in RGB channels. We use the red channel (index i*4).
      const val = data[i * 4] / 255;
      result[i] = val > threshold ? 1 : 0;
    }

    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}
