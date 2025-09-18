#version 300 es
precision highp float; 

const vec2 HEX_OFFSETS[8] = vec2[](
  vec2(0.0, 0.0),                                   // V0 (center)
    	// 6 corners, pointy-top (start at 30°, step 60°)
vec2(cos(radians(270.0)),  sin(radians(270.0))),   // 270°
vec2(cos(radians(210.0)),  sin(radians(210.0))),   // 210°
vec2(cos(radians(150.0)),  sin(radians(150.0))),   // 150°
vec2(cos(radians(90.0)),   sin(radians(90.0))),    // 90°
vec2(cos(radians(30.0)),   sin(radians(30.0))),    // 30°
vec2(cos(radians(330.0)),  sin(radians(330.0))),   // 330°

vec2(cos(radians(270.0)),  sin(radians(270.0)))   // 270°
);

uniform mat3 u_mvp;
uniform vec2 u_center;
out vec2 v_local;
flat out int v_edgeId;


void main() {
    vec2 localPos = HEX_OFFSETS[gl_VertexID];
    v_edgeId = (gl_VertexID + 1) % 6;

    v_local = localPos;
    vec2 modelPos = u_center + localPos;
    vec3 clipPos = u_mvp * vec3(modelPos, 1.0);
    gl_Position = vec4(clipPos.xy, 0.0, 1.0);
}
