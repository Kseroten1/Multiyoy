#version 300 es
precision lowp float;
out vec4 outColor; // explicit fragment output in WebGL2
uniform vec3 v_col;

void main() {
  outColor = vec4(v_col, 1.0); // solid color, full alpha
}
