#version 300 es
precision highp float; 

const vec2 HEX_OFFSETS[8] = vec2[](
    vec2(0.0, 0.0),   // V0 (center)
    vec2(cos(radians(90.0)),   sin(radians(90.0))),   // V1 – góra
    vec2(cos(radians(30.0)),   sin(radians(30.0))),   // V2 – prawy‑góra
    vec2(cos(radians(330.0)),  sin(radians(330.0))),  // V3 – prawy‑dół
    vec2(cos(radians(270.0)),  sin(radians(270.0))),  // V4 – dół
    vec2(cos(radians(210.0)),  sin(radians(210.0))),  // V5 – lewy‑dół
    vec2(cos(radians(150.0)),  sin(radians(150.0))),  // V6 – lewy‑góra
    vec2(cos(radians(90.0)),   sin(radians(90.0)))    // powtórka V1 – domknięcie
);

uniform mat3 u_mvp;
uniform vec2 u_center;
out vec2 v_local;
flat out int vertexID;

void main() {
    vec2 localPos = HEX_OFFSETS[gl_VertexID];
    vertexID = gl_VertexID;
    v_local = localPos;
    vec2 modelPos = u_center + localPos;
    vec3 clipPos = u_mvp * vec3(modelPos, 1.0);
    gl_Position = vec4(clipPos.xy, 0.0, 1.0);
}
