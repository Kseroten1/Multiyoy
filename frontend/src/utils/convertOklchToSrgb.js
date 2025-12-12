// Converts an array of OKLCH colors to sRGB.
// Each input color is [L, C, H]. Returns array of [r, g, b] in 0–1 range.
//źródło do wzorów
//https://observablehq.com/@coulterg/oklab-oklch-color-functions
export function convertOklchToSrgb (colorsOklch) {
    const result = [];

    for (const [L, C, H] of colorsOklch) {
        const labL = (H * Math.PI) / 180;
        const a = Math.cos(labL) * C;
        const b = Math.sin(labL) * C;

        const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
        const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
        const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

        const l = l_ ** 3;
        const m = m_ ** 3;
        const s = s_ ** 3;

        let R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
        let G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
        let B = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

        R = R <= 0.0031308 ? 12.92 * R : 1.055 * Math.pow(R, 1 / 2.4) - 0.055;
        G = G <= 0.0031308 ? 12.92 * G : 1.055 * Math.pow(G, 1 / 2.4) - 0.055;
        B = B <= 0.0031308 ? 12.92 * B : 1.055 * Math.pow(B, 1 / 2.4) - 0.055;

        result.push([
            Math.min(Math.max(R, 0), 1),
            Math.min(Math.max(G, 0), 1),
            Math.min(Math.max(B, 0), 1),
        ]);
    }

    return result;
}