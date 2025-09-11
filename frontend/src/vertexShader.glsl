#version 300 es
precision highp float; 

const vec2 HEX_OFFSETS[8] = vec2[](
    // center
    vec2(0.0, 0.0),

    // 6 corners, pointy-top (start at 30°, step 60°)
    vec2( 0.8660254,  0.5),   // 30°  = (cos 30,  sin 30)
    vec2( 0.0,        1.0),   // 90°
    vec2(-0.8660254,  0.5),   // 150°
    vec2(-0.8660254, -0.5),   // 210°
    vec2( 0.0,       -1.0),   // 270°
    vec2( 0.8660254, -0.5),   // 330°

    // repeat first corner to close the fan
    vec2( 0.8660254,  0.5)
);

uniform mat3 u_mvp;
uniform vec2 u_center;
out vec2 v_pos;
out float v_localY;

void main() {
    vec2 localPos = HEX_OFFSETS[gl_VertexID];
    v_localY = localPos.y;
    vec2 pos = u_center + localPos;
    vec3 clipPos = u_mvp * vec3(pos, 1.0);
    v_pos = clipPos.xy;
    gl_Position = vec4(clipPos.xy, 0.0, 1.0);
}
