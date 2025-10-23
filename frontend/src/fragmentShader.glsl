#version 300 es
precision highp float;

uniform vec3  u_colorA;  // górny kolor
uniform vec3  u_colorB;  // dolny color
uniform uint  u_edgeMask;  // maska krawedzi 
uniform float u_borderWidth;  // szerokość krawedzi w jednostkach lokalnych

in vec2 v_local;
out vec4 outColor;

const float cos60 = cos(radians(60.0));
const float sin60 = sin(radians(60.0));

// Zwraca i-ty bit maski (0 lub 1).
int getBitAt(uint mask, int index) {
    uint shifted = mask >> uint(index); // przesuniecie bitowe w prawo
    uint hexSideMaskOn = shifted & uint(1); // operacja AND: 1 -> jeśli maska właczona, 0 jeśli wyłaczona
    return int(hexSideMaskOn);
}

const vec2 HEX_VERTICES[6] = vec2[](
vec2(cos(radians(270.0)),  sin(radians(270.0))),
vec2(cos(radians(330.0)),  sin(radians(330.0))),
vec2(cos(radians(30.0)),   sin(radians(30.0))),
vec2(cos(radians(90.0)),   sin(radians(90.0))),
vec2(cos(radians(150.0)),  sin(radians(150.0))),
vec2(cos(radians(210.0)),  sin(radians(210.0)))
);

const vec3 EDGE_COLORS[6] = vec3[](
  vec3(1.0, 0.0, 0.0),  // 1 czerwony
  vec3(1.0, 0.5, 0.0),  // 2 pomarańczowy
  vec3(1.0, 1.0, 0.0),  // 3 żółty
  vec3(0.0, 1.0, 0.0),  // 4 zielony
  vec3(0.0, 0.5, 1.0),  // 5 niebieski
  vec3(0.6, 0.0, 1.0)   // 6 fioletowy
);

float pointDistanceFromLine(vec2 point, vec2 firstVertex, vec2 secondVertex) {
    // Współczynniki prostej opisanej na dwóch punktach (firstVertex, secondVertex)
    // Ax + By + C - wzór prostej 
    float A = firstVertex.y - secondVertex.y;
    float B = firstVertex.x - secondVertex.x;
    float C = firstVertex.x * secondVertex.y - secondVertex.x * firstVertex.y;
    
    // zwracamy odległość punktu od prostej wzór:
    // punkt (x0, y0)
    // (|Ax0 + By0 + C|)/sqrt(A^2+B^2)
    return abs(A * point.x + B * point.y + C) / sqrt(A * A + B * B);
}

void main() {
    float isTop = step(v_local.y, 0.0);
    vec3 fillColor = mix(u_colorA, u_colorB, isTop);
    vec3 outRgb = fillColor;
    for (int i = 0; i < 6; ++i) {
        if (getBitAt(u_edgeMask, i) == 1) {
            vec2 vertex0 = HEX_VERTICES[i];
            vec2 vertex1 = HEX_VERTICES[(i + 1) % 6];
            float dist = pointDistanceFromLine(v_local, vertex0, vertex1);
            if (dist < u_borderWidth) {
                outRgb = EDGE_COLORS[i];
            }
        }
    }
    outColor = vec4(outRgb, 1.0);
}