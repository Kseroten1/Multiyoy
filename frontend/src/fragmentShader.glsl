#version 300 es
precision highp float;

uniform vec3  u_colorA;  // top color
uniform vec3  u_colorB;  // bottom color
uniform vec2  u_center;
in vec2 v_pos;
out vec4 outColor;

void main() {
  vec3 rgb = (v_pos.y >= u_center.y) ? u_colorA : u_colorB;  //jeżeli powyżej color A, jeżeli poniżej color B 
  outColor = vec4(rgb, 1.0);
}