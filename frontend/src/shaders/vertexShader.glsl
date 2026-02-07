#version 300 es
precision highp float; 

const vec2 HEX_OFFSETS[8] = vec2[8](
    vec2(0.0, 0.0),   // V0 (center)
    vec2(cos(radians(90.0)),   sin(radians(90.0))),   // V1 – góra
    vec2(cos(radians(30.0)),   sin(radians(30.0))),   // V2 – prawy‑góra
    vec2(cos(radians(330.0)),  sin(radians(330.0))),  // V3 – prawy‑dół
    vec2(cos(radians(270.0)),  sin(radians(270.0))),  // V4 – dół
    vec2(cos(radians(210.0)),  sin(radians(210.0))),  // V5 – lewy‑dół
    vec2(cos(radians(150.0)),  sin(radians(150.0))),  // V6 – lewy‑góra
    vec2(cos(radians(90.0)),   sin(radians(90.0)))    // powtórka V1 – domknięcie
);

uniform mat4 u_mvp;
uniform int u_mapWidth;

in float a_edgeMask;
in float a_fillColorMask;

flat out int v_vertexID;
flat out float v_edgeMask;
flat out float v_fillColorMask;
out vec2 v_local;

void main() {
    int idx = gl_InstanceID;
    int r = idx / u_mapWidth;
    int col = idx % u_mapWidth;

    float sqrt3 = 1.73205081;
    float x = float(col) * sqrt3 + float(r & 1) * 0.5 * sqrt3;
    float y = float(r) * 1.5;
    vec2 center = vec2(x, y);

    vec2 localPos = HEX_OFFSETS[gl_VertexID];
    v_vertexID = gl_VertexID;
    v_edgeMask = a_edgeMask;
    v_fillColorMask = a_fillColorMask;
    v_local = localPos;
    vec2 modelPos = center + localPos;
    vec4 clipPos = u_mvp * vec4(modelPos, 0.0, 1.0);
    gl_Position = vec4(clipPos.xy, 0.0, 1.0);
}