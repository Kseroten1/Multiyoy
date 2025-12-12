import { expect, test } from 'vitest'
import { convertOklchToSrgb } from './convertOklchToSrgb.js'

const sampleColors = [
    [[0.7804, 0.099, 228.76], [0.431372549, 0.768627451, 0.9176470588]],
    [[0.6683, 0.228, 320.18], [0.8117647059, 0.3450980392, 0.9137254902]],
    [[0.9177, 0.190, 97.52], [1.00, 0.8898649010183901, 0]],
    [[0.7551, 0.146, 142.3], [0.4588235294, 0.7803921569, 0.431372549]]
]

test.each(sampleColors)('OKLCH → sRGB conversion', (oklch, expected) => {
    const [[r, g, b]] = convertOklchToSrgb([oklch]);
    const [er, eg, eb] = expected;

    expect(r).toBeCloseTo(er, 2);
    expect(g).toBeCloseTo(eg, 2);
    expect(b).toBeCloseTo(eb, 2);
});