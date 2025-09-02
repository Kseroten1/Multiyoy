export function generateCircleFan({ cx, cy, radius, segments }) {
    import ELEMENTS_PER_VERTEX from './script.js';
    const count = 2 + segments; // center and closing + ring 
    const data = new Float32Array(count * ELEMENTS_PER_VERTEX); // count is the number of points, we need to multiply in this case for x and y 
    
    let o = 0;
    
    data[o++] = cx;
    data[o++] = cy;
    
    const twoPI = Math.PI * 2;
    for (let i = 0; i <= segments; i++) {
        const t = (i/segments) * twoPI;
        const x = cx + radius * Math.cos(t);
        const y = cy + radius * Math.sin(t);
        data[o++] = x;
        data[o++] = y;
    }
    
    return data;
}