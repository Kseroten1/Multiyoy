#version 300 es
precision highp float;

const vec2 HEX_OFFSETS[8] = vec2[](
    // center
    vec2(0.0, 0.0),

    vec2(cos(radians(30.0)), sin(radians(30.0))),  
    vec2(cos(radians(90.0)), sin(radians(90.0))),  
    vec2(cos(radians(150.0)), sin(radians(150.0))),
    vec2(cos(radians(210.0)), sin(radians(210.0))),
    vec2(cos(radians(270.0)), sin(radians(270.0))),
    vec2(cos(radians(330.0)), sin(radians(330.0))),

    // repeat first corner to close the fan
    vec2(cos(radians(30.0)), sin(radians(30.0)))
);

uniform mat3 u_mvp;
uniform vec2 u_center;
out vec2 v_pos;
out vec2 v_local;
flat out int v_edgeId;

void main() {
    vec2 localPos = HEX_OFFSETS[gl_VertexID];
    v_edgeId = (gl_VertexID + 1) % 6;

    v_local = localPos;
    vec2 pos = u_center + localPos;
    vec3 clipPos = u_mvp * vec3(pos, 1.0);
    v_pos = clipPos.xy;
    gl_Position = vec4(clipPos.xy, 0.0, 1.0);
}
