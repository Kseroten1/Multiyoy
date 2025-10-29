#version 300 es
precision highp float;

uniform int  u_edgeMask;  // maska krawedzi 
uniform float u_borderWidth;  // szerokość krawedzi w jednostkach lokalnych
uniform int u_fillColorMask;

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

const vec3 FILL_COLORS[16] = vec3[](
    vec3(0.000, 0.122, 0.247), // NAVY #001f3f
    vec3(0.000, 0.455, 0.851), // BLUE #0074D9
    vec3(0.498, 0.859, 1.000), // AQUA #7FDBFF
    vec3(0.224, 0.800, 0.800), // TEAL #39CCCC
    vec3(0.694, 0.051, 0.788), // PURPLE #B10DC9
    vec3(0.941, 0.071, 0.745), // FUCHSIA #F012BE
    vec3(0.522, 0.078, 0.294), // MAROON #85144B
    vec3(1.000, 0.255, 0.212), // RED #FF4136
    vec3(1.000, 0.521, 0.106), // ORANGE #FF851B
    vec3(1.000, 0.863, 0.000), // YELLOW #FFDC00
    vec3(0.239, 0.600, 0.439), // OLIVE #3D9970
    vec3(0.180, 0.800, 0.251), // GREEN #2ECC40
    vec3(0.004, 1.000, 0.439), // LIME #01FF70
    vec3(0.667, 0.667, 0.667), // GRAY #AAAAAA
    vec3(0.867, 0.867, 0.867), // SILVER #DDDDDD
    vec3(1.000, 1.000, 1.000)  // WHITE #FFFFFF
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

int wrapAround(int index){
    int result = index % 6;
    result += int(result < 0) * 6;
    return result;
}

void main() {
    vec3 fillColorFirst = FILL_COLORS[u_fillColorMask & 0xF];
    vec3 fillColorSecond = FILL_COLORS[(u_fillColorMask >> 4) & 0xF];
    int isVertical = (u_fillColorMask >> 8) & 1;
    float splitCoord = mix(v_local.y, v_local.x, float(isVertical));
    float t = step(0.0, splitCoord);
    vec3 baseFillColor = mix(fillColorFirst, fillColorSecond, t);
    
    int edgeID = wrapAround((vertexID - 2));
    int previousEdgeID = wrapAround((edgeID - 1));
    int nextEdgeID = wrapAround((edgeID + 1));

    float distanceCurrent = pointRelativeDistanceFromLine(
        v_local,
        HEX_OFFSETS[edgeID],
        HEX_OFFSETS[wrapAround((edgeID + 1))]
    );

    float distancePrevious = pointRelativeDistanceFromLine(
        v_local,
        HEX_OFFSETS[previousEdgeID],
        HEX_OFFSETS[wrapAround((previousEdgeID + 1))]
    );

    float distanceNext = pointRelativeDistanceFromLine(
        v_local,
        HEX_OFFSETS[nextEdgeID],
        HEX_OFFSETS[wrapAround((nextEdgeID + 1))]
    );
    
    int currentSideOn = getBitAt(u_edgeMask, edgeID);
    int previousSideOn = getBitAt(u_edgeMask, previousEdgeID);
    int nextSideOn = getBitAt(u_edgeMask, nextEdgeID);

    float currentMask = float(currentSideOn) * step(distanceCurrent, u_borderWidth);
    float prevMask = float(previousSideOn) * step(distancePrevious, u_borderWidth);
    float nextMask = float(nextSideOn) * step(distanceNext, u_borderWidth);

    vec3 color =
    baseFillColor * (1.0 - currentMask) * (1.0 - prevMask) * (1.0 - nextMask) +
    EDGE_COLORS[nextEdgeID] * nextMask * (1.0 - prevMask) * (1.0 - currentMask) +
    EDGE_COLORS[previousEdgeID] * prevMask * (1.0 - currentMask) +
    EDGE_COLORS[edgeID] * currentMask;

    outColor = vec4(color, 1.0);
}