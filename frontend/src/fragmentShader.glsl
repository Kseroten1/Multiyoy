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

const vec2 HEX_OFFSETS[6] = vec2[](
    vec2(cos(radians(90.0)),   sin(radians(90.0))),   // V0 – góra
    vec2(cos(radians(30.0)),   sin(radians(30.0))),   // V1 – prawy‑góra
    vec2(cos(radians(330.0)),  sin(radians(330.0))),  // V2 – prawy‑dół
    vec2(cos(radians(270.0)),  sin(radians(270.0))),  // V3 – dół
    vec2(cos(radians(210.0)),  sin(radians(210.0))),  // V4 – lewy‑dół
    vec2(cos(radians(150.0)),  sin(radians(150.0)))  // V5 – lewy‑góra
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

int wrapAround(int index, int max){
    int result = index % max;
    if (result < 0) {
        result += max;
    }
    return result;
}

void main() {
    int edgeID = wrapAround((vertexID - 2), 6);
    int previousEdgeID = wrapAround((edgeID - 1), 6);
    int nextEdgeID = wrapAround((edgeID + 1), 6);

    float distanceCurrent = pointRelativeDistanceFromLine(
        v_local,
        HEX_OFFSETS[edgeID],
        HEX_OFFSETS[wrapAround((edgeID + 1),6)]
    );

    float distancePrevious = pointRelativeDistanceFromLine(
        v_local,
        HEX_OFFSETS[previousEdgeID],
        HEX_OFFSETS[wrapAround((previousEdgeID + 1),6)]
    );

    float distanceNext = pointRelativeDistanceFromLine(
        v_local,
        HEX_OFFSETS[nextEdgeID],
        HEX_OFFSETS[wrapAround((nextEdgeID + 1),6)]
    );
    
    int currentSideOn = getBitAt(u_edgeMask, edgeID);
    int previousSideOn = getBitAt(u_edgeMask, previousEdgeID);
    int nextSideOn = getBitAt(u_edgeMask, nextEdgeID);

    float currentMask = float(currentSideOn) * step(distanceCurrent, u_borderWidth);
    float prevMask = float(previousSideOn) * step(distancePrevious, u_borderWidth);
    float nextMask = float(nextSideOn) * step(distanceNext, u_borderWidth);

    vec3 color =
    fillColor * (1.0 - currentMask) * (1.0 - prevMask) * (1.0 - nextMask) +
    EDGE_COLORS[nextEdgeID] * nextMask * (1.0 - prevMask) * (1.0 - currentMask) +
    EDGE_COLORS[previousEdgeID] * prevMask * (1.0 - currentMask) +
    EDGE_COLORS[edgeID] * currentMask;

    outColor = vec4(color, 1.0);
}