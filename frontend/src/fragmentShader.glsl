#version 300 es
precision highp float;

uniform vec3  u_colorA;  // top color
uniform vec3  u_colorB;  // bottom color
uniform uint  u_edgeMask; // maska krawedzi 

in vec2 v_local;
flat in int v_edgeId;
out vec4 outColor;
int bit(uint mask, int i) { return int((mask >> uint(i)) & uint(1)); }

//source : https://iquilezles.org/articles/distfunctions2d/
float sdHex(vec2 position) {
    const float scale = 1.0 / 0.8660254037844386;
    position *= scale;
    position = vec2(-position.y, position.x);
    const vec3 basis = vec3(-0.8660254, 0.5, 0.577350269);
    position = abs(position);
    float projection = dot(basis.xy, position);
    position -= 2.0 * min(projection, 0.0) * basis.xy;
    position -= vec2(clamp(position.x, -basis.z, basis.z), 1.0);
    return dot(position, position) / (scale * scale);
}

// kolor krawędzi wg id 1..6
const vec3 EDGE_COLORS[6] = vec3[](
  vec3(1.0, 0.0, 0.0),  // 1 czerwony
  vec3(1.0, 0.5, 0.0),  // 2 pomarańczowy
  vec3(1.0, 1.0, 0.0),  // 3 żółty
  vec3(0.0, 1.0, 0.0),  // 4 zielony
  vec3(0.0, 0.5, 1.0),  // 5 niebieski
  vec3(0.6, 0.0, 1.0)   // 6 fioletowy
);

void main() {
    float isCurrentPixelOnTopHalf = step(v_local.y, 0.0);
    vec3 fillColor = mix(u_colorA, u_colorB, isCurrentPixelOnTopHalf);

    float distanceSq = sdHex(v_local);
    const float borderWidth = 0.06;
    
    float isCurrentPixelOnBorder = step(distanceSq, borderWidth * borderWidth);
    vec3 edgeColor = mix(fillColor, EDGE_COLORS[v_edgeId], float(bit(u_edgeMask, v_edgeId)));
	vec3 pixelColor = mix(fillColor, edgeColor, isCurrentPixelOnBorder);

    outColor = vec4(pixelColor, 1.0);
}