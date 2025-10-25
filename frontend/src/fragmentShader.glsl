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
    return abs(A * point.x + B * point.y + C);
}

void main() {
    int edgeColorID = (vertexID - 2);

    int firstVertexIndex = edgeColorID + 1;
    int secondVertexIndex = ((edgeColorID + 1) % 6) + 1;
    float distanceCurrent = pointRelativeDistanceFromLine(v_local, HEX_OFFSETS[firstVertexIndex], HEX_OFFSETS[secondVertexIndex]);

    int currentSideOn = getBitAt(u_edgeMask, edgeColorID);
    int previousSideOn = getBitAt(u_edgeMask, (edgeColorID + 5) % 6);
    int nextSideOn = getBitAt(u_edgeMask, (edgeColorID + 1) % 6);

    // Dystanse do sąsiadów
    float distancePrevious = pointRelativeDistanceFromLine(
        v_local,
        HEX_OFFSETS[((edgeColorID + 5) % 6) + 1],
        HEX_OFFSETS[(edgeColorID + 1)]
    );

    float distanceNext = pointRelativeDistanceFromLine(
        v_local,
        HEX_OFFSETS[(edgeColorID + 2) % 6 + 1],
        HEX_OFFSETS[((edgeColorID + 1) % 6) + 1]
    );
    vec3 color = fillColor;
    // bieżąca aktywna krawędź
    if (currentSideOn == 1 && distanceCurrent < u_borderWidth) {
        color = EDGE_COLORS[edgeColorID];
    }
    // sąsiad wstecz: krawędź e‑1
    else if (previousSideOn == 1 && distancePrevious < u_borderWidth) {
        color = EDGE_COLORS[(edgeColorID + 5) % 6];
    }
    // sąsiad do przodu: krawędź e+1
    else if (nextSideOn == 1 && distanceNext < u_borderWidth) {
        color = EDGE_COLORS[(edgeColorID + 1) % 6];
    }
    outColor = vec4(color, 1.0);
}