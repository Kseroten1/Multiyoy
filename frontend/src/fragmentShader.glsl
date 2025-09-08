#version 300 es
precision highp float;

in vec2 v_pos;
uniform vec3  u_colorA;  // top color
uniform vec3  u_colorB;  // bottom color

out vec4 outColor;

uniform vec2  u_center;
uniform float u_radius;

void main() {
  float yNorm = clamp((v_pos.y - u_center.y) / u_radius, -1.0, 1.0);  // każdy punkt dostaje wartość 1 lub -1 w zależności od tego czy znajduje się pod czy nad środkiem 
  float t = (yNorm + 1.0) * 0.5; // normalizacja żeby dojść do zakresu 0-1 gdzie wszystko poniżej wartości 0.5 będzie dołem 
  vec3 rgb = (t >= 0.5) ? u_colorA : u_colorB;  //jeżeli powyżej color A, jeżeli poniżej color B 
  outColor = vec4(rgb, 1.0);
  return;
}