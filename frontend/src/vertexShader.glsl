#version 300 es //specifies usage of WebGL2
precision mediump float; 
uniform vec2 u_center;    // circle center in clip space (-1..1)
uniform float u_radius;   // circle radius in clip space
uniform int u_segments;   // how many segments the circle uses

void main() {
  float twoPi = 6.28318530718; //since webgl doesnt have PI and using radians is unpredictable
  int vid = gl_VertexID; // current vertex number: 0..u_segments+1
  vec2 pos;
  if (vid == 0) {
    pos = u_center;
  } else {
    float t = float(vid - 1) / float(u_segments); // 0..1 around the circle
    float angle = t * twoPi;              
    vec2 dir = vec2(cos(angle), sin(angle));      // unit circle direction 
    pos = u_center + dir * u_radius;           
  }

  gl_Position = vec4(pos, 0.0, 1.0); // final position
}
