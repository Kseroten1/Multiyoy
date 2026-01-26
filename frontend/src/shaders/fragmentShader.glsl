#version 300 es
precision highp float;

uniform vec3 EDGE_COLORS[6];
uniform vec3 FILL_COLORS[14];
uniform float u_borderWidth;  // szerokość krawedzi w jednostkach lokalnych

flat in int v_edgeMask;  // maska krawedzi 
flat in int v_fillColorMask;
flat in int v_vertexID;
in vec2 v_local;

out vec4 outColor;

const float cos60 = cos(radians(60.0));
const float sin60 = sin(radians(60.0));
const vec3 fillColor = vec3(1.0, 1.0, 1.0);


const vec2 HEX_OFFSETS[6] = vec2[](
    vec2(cos(radians(90.0)),   sin(radians(90.0))),   // V0 – góra
    vec2(cos(radians(30.0)),   sin(radians(30.0))),   // V1 – prawy‑góra
    vec2(cos(radians(330.0)),  sin(radians(330.0))),  // V2 – prawy‑dół
    vec2(cos(radians(270.0)),  sin(radians(270.0))),  // V3 – dół
    vec2(cos(radians(210.0)),  sin(radians(210.0))),  // V4 – lewy‑dół
    vec2(cos(radians(150.0)),  sin(radians(150.0)))  // V5 – lewy‑góra
);

int getBitAt(int mask, int index) {
    int shifted = mask >> int(index); // przesuniecie bitowe w prawo
    int hexSideMaskOn = shifted & 1; // operacja AND: 1 -> jeśli maska właczona, 0 jeśli wyłaczona
    return int(hexSideMaskOn);
}

float pointRelativeDistanceFromLine(vec2 point, vec2 firstVertex, vec2 secondVertex) {
    float A = firstVertex.y - secondVertex.y;
    float B = secondVertex.x - firstVertex.x;
    float C = firstVertex.x * secondVertex.y - secondVertex.x * firstVertex.y;
    return -(A * point.x + B * point.y + C);
}

int wrapAround(int index){
    int result = index % 6;
    result += int(result < 0) * 6;
    return result;
}

void main() {
    vec3 fillColorFirst = FILL_COLORS[v_fillColorMask & 0xF];
    vec3 fillColorSecond = FILL_COLORS[(v_fillColorMask >> 4) & 0xF];
    int isVertical = (v_fillColorMask >> 8) & 1;
    float splitCoord = mix(v_local.y, v_local.x, float(isVertical));
    float t = step(0.0, splitCoord);
    vec3 baseFillColor = mix(fillColorFirst, fillColorSecond, t);

    int edgeID = wrapAround((v_vertexID - 2));
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

    int currentSideOn = getBitAt(v_edgeMask, edgeID);
    int previousSideOn = getBitAt(v_edgeMask, previousEdgeID);
    int nextSideOn = getBitAt(v_edgeMask, nextEdgeID);

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