#version 300 es
precision highp float;

uniform vec3  u_colorA;  // top color
uniform vec3  u_colorB;  // bottom color
in vec2 v_pos;
in float v_localY;
out vec4 outColor;

void main() {
  vec3 rgb = (v_localY >= 0.0) ? u_colorA : u_colorB;  //jeżeli powyżej color A, jeżeli poniżej color B 
  outColor = vec4(rgb, 1.0);
}