export function updateBrightnessAndSaturationMax(oklchColorsTable) {
    const L_Values = oklchColorsTable.map(([L]) => L);
    const C_Values = oklchColorsTable.map(([_, C]) => C);

    const maxL = Math.max(...L_Values);
    const maxC = Math.max(...C_Values);

    const maxBrightness = (1 / maxL).toFixed(2);
    const maxSaturation = Math.min(0.4 / maxC, 1.8).toFixed(2);
    
    return [maxBrightness, maxSaturation];
}