#version 300 es
precision highp float;

uniform vec3  u_colorA;  // top color
uniform vec3  u_colorB;  // bottom color

in vec2 v_local;
flat in int v_edgeId;
out vec4 outColor;

// source : https://iquilezles.org/articles/distfunctions2d/
// squared distance to a hexagon (unsigned, no sqrt)
float sdHexSq(vec2 p) {
    const float s = 1.0 / 0.8660254037844386; // = 1 / cos(30°)
    p *= s;
    p = vec2(-p.y, p.x);
    const vec3 k = vec3(-0.8660254, 0.5, 0.577350269);
    p = abs(p);
    float h = dot(k.xy, p);
    p -= 2.0 * min(h, 0.0) * k.xy;
    p -= vec2(clamp(p.x, -k.z, k.z), 1.0);

    // pure squared distance, no sign
    return dot(p, p) / (s * s);
}

// kolory krawędzi wg id 0..5 (stała tablica jak HEX_OFFSETS)
const vec3 EDGE_DEBUG_COLORS[6] = vec3[](
    vec3(1.0, 0.0, 0.0), // czerwony
    vec3(1.0, 0.5, 0.0), // pomarańczowy
    vec3(1.0, 1.0, 0.0), // żółty
    vec3(0.0, 1.0, 0.0), // zielony
    vec3(0.0, 0.5, 1.0), // niebieski
    vec3(0.6, 0.0, 1.0)  // fioletowy
);

void main() {
    float isCurrentPixelOnTopHalf = step(v_local.y, 0.0);
    vec3 fillColor = mix(u_colorA, u_colorB, isCurrentPixelOnTopHalf);

    float dSq = sdHexSq(v_local);
    const float borderWidth = 0.06;
    
    float isCurrentPixelOnBorder = step(dSq, borderWidth * borderWidth);
    vec3 pixelColor = mix(fillColor, EDGE_DEBUG_COLORS[v_edgeId], isCurrentPixelOnBorder);

    outColor = vec4(pixelColor, 1.0);
}