#version 300 es //specifies usage of WebGL2
precision highp float; 
uniform vec2 u_center;    // circle center in clip space (-1..1)
uniform float u_radius;   // circle radius in clip space
layout(location = 0) in vec2 a_position; // stała siatka koła w lokalnych współrzędnych
uniform mat3 u_mvp; // 2D macierz 3x3: proj * view * model
out vec2 v_pos; // pozycja w clip-space dla fragment shadera (do sprawdzania u_center)

void main() {
    // a_position jest w przestrzeni lokalnej (np. unit circle)
    // Mnożenie macierzy 3x3 dla 2D: (x, y, 1)
    vec3 p = u_mvp * vec3(a_position, 1.0);
    v_pos = p.xy;
    gl_Position = vec4(p.xy, 0.0, 1.0);
}
