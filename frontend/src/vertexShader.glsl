#version 300 es //specifies usage of WebGL2
precision highp float; 

const vec2 HEX_OFFSETS[8] = vec2[](
    // center
    vec2(0.0, 0.0),
    // 6 corners counter-clockwise starting at angle = 0
    vec2( 1.0, 0.0),        // 0 deg
    vec2( 0.5, 0.8660254),  // 60 deg  (sqrt(3)/2)
    vec2(-0.5, 0.8660254),  // 120 deg
    vec2(-1.0, 0.0),        // 180 deg
    vec2(-0.5, -0.8660254),  // 240 deg
    vec2( 0.5, -0.8660254),  // 300 deg
    //first vertex again to create last triangle
    vec2(1.0, 0.0)
);

uniform mat3 u_mvp;
out vec2 v_pos;

void main() {
    vec2 localPos = HEX_OFFSETS[gl_VertexID];
    vec3 clipPos = u_mvp * vec3(localPos, 1.0);
    v_pos = clipPos.xy;
    gl_Position = vec4(clipPos.xy, 0.0, 1.0);
}
