#version 300 es
precision highp float;

uniform vec3  u_colorA;  // górny kolor
uniform vec3  u_colorB;  // dolny color
uniform int  u_edgeMask;  // maska krawedzi 
uniform float u_borderWidth;  // szerokość krawedzi w jednostkach lokalnych

flat in int vertexID;
in vec2 v_local;
out vec4 outColor;

const float cos60 = cos(radians(60.0));
const float sin60 = sin(radians(60.0));
const vec3 fillColor = vec3(1.0, 1.0, 1.0);

// Zwraca i-ty bit maski (0 lub 1).
int getBitAt(int mask, int index) {
    int shifted = mask >> int(index); // przesuniecie bitowe w prawo
    int hexSideMaskOn = shifted & 1; // operacja AND: 1 -> jeśli maska właczona, 0 jeśli wyłaczona
    return int(hexSideMaskOn);
}

const vec2 HEX_OFFSETS[8] = vec2[](
    vec2(0.0, 0.0),   // V0 (center)
    vec2(cos(radians(90.0)),   sin(radians(90.0))),   // V1 – góra
    vec2(cos(radians(30.0)),   sin(radians(30.0))),   // V2 – prawy‑góra
    vec2(cos(radians(330.0)),  sin(radians(330.0))),  // V3 – prawy‑dół
    vec2(cos(radians(270.0)),  sin(radians(270.0))),  // V4 – dół
    vec2(cos(radians(210.0)),  sin(radians(210.0))),  // V5 – lewy‑dół
    vec2(cos(radians(150.0)),  sin(radians(150.0))),  // V6 – lewy‑góra
    vec2(cos(radians(90.0)),   sin(radians(90.0)))    // powtórka V1 – domknięcie
);

const vec3 EDGE_COLORS[6] = vec3[](
    vec3(1.0, 0.0, 0.0),  // 0 czerwony
    vec3(1.0, 0.5, 0.0),  // 1 pomarańczowy
    vec3(1.0, 1.0, 0.0),  // 2 żółty
    vec3(0.0, 1.0, 0.0),  // 3 zielony
    vec3(0.0, 0.5, 1.0),  // 4 niebieski
    vec3(0.6, 0.0, 1.0)   // 5 fioletowy
);

float pointRelativeDistanceFromLine(vec2 point, vec2 firstVertex, vec2 secondVertex) {
    // Współczynniki prostej opisanej na dwóch punktach (firstVertex, secondVertex)
    // Ax + By + C - wzór prostej 
    float A = firstVertex.y - secondVertex.y;
    float B = secondVertex.x - firstVertex.x;
    float C = firstVertex.x * secondVertex.y - secondVertex.x * firstVertex.y;
    // zwracamy odległość punktu od prostej wzór:
    // punkt (x0, y0)
    // (|Ax0 + By0 + C|)/sqrt(A^2+B^2)
    // !!! fajne zadanie na kolokwium
    // abs(A * point.x + B * point.y + C) / sqrt(A*A + B*B);
    return -(A * point.x + B * point.y + C);
}

void main() {
    // 6 dystansów (branchless)
    float d0 = pointRelativeDistanceFromLine(v_local, HEX_OFFSETS[1], HEX_OFFSETS[2]);
    float d1 = pointRelativeDistanceFromLine(v_local, HEX_OFFSETS[2], HEX_OFFSETS[3]);
    float d2 = pointRelativeDistanceFromLine(v_local, HEX_OFFSETS[3], HEX_OFFSETS[4]);
    float d3 = pointRelativeDistanceFromLine(v_local, HEX_OFFSETS[4], HEX_OFFSETS[5]);
    float d4 = pointRelativeDistanceFromLine(v_local, HEX_OFFSETS[5], HEX_OFFSETS[6]);
    float d5 = pointRelativeDistanceFromLine(v_local, HEX_OFFSETS[6], HEX_OFFSETS[1]);

    // aktywne krawędzie (float maska)
    float m0 = float((u_edgeMask >> 0) & 1);
    float m1 = float((u_edgeMask >> 1) & 1);
    float m2 = float((u_edgeMask >> 2) & 1);
    float m3 = float((u_edgeMask >> 3) & 1);
    float m4 = float((u_edgeMask >> 4) & 1);
    float m5 = float((u_edgeMask >> 5) & 1);

    // które blisko krawędzi
    float e0 = (1.0 - step(u_borderWidth, d0)) * m0;
    float e1 = (1.0 - step(u_borderWidth, d1)) * m1;
    float e2 = (1.0 - step(u_borderWidth, d2)) * m2;
    float e3 = (1.0 - step(u_borderWidth, d3)) * m3;
    float e4 = (1.0 - step(u_borderWidth, d4)) * m4;
    float e5 = (1.0 - step(u_borderWidth, d5)) * m5;

    vec3 edgeColor =
    e0 * EDGE_COLORS[0]
    + e1 * EDGE_COLORS[1]
    + e2 * EDGE_COLORS[2]
    + e3 * EDGE_COLORS[3]
    + e4 * EDGE_COLORS[4]
    + e5 * EDGE_COLORS[5];

    float anyEdge = clamp(e0 + e1 + e2 + e3 + e4 + e5, 0.0, 1.0);
    vec3 color = mix(fillColor, edgeColor, anyEdge);

    outColor = vec4(color, 1.0);
}