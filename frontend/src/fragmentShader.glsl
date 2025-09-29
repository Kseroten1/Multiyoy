#version 300 es
precision highp float;

uniform vec3  u_colorA;  // top color
uniform vec3  u_colorB;  // bottom color
uniform uint  u_edgeMask; // maska krawedzi 
uniform float u_borderWidth;     // border width in local hex units

in vec2 v_local;
out vec4 outColor;

// Zwraca i-ty bit maski (0 lub 1). Zabezpiecza indeks.
int getBitAt(uint mask, int index) {
    uint shifted = mask >> uint(index); //przesuń bit o indeksie podanym na pozycję LSB (least significant bit)
    uint lsb     = shifted & uint(1); // operacja AND czyli wyzerowanie wszystkich bitów poza pozycją 0 czyli LSB 
    return int(lsb);
}

const vec3 EDGE_COLORS[6] = vec3[](
  vec3(1.0, 0.0, 0.0),  // 1 czerwony
  vec3(1.0, 0.5, 0.0),  // 2 pomarańczowy
  vec3(1.0, 1.0, 0.0),  // 3 żółty
  vec3(0.0, 1.0, 0.0),  // 4 zielony
  vec3(0.0, 0.5, 1.0),  // 5 niebieski
  vec3(0.6, 0.0, 1.0)   // 6 fioletowy
);

//budujemy 3 skalary, które opisują położenie punktu względem 3 osi hexa
void hexAxes(vec2 pos, out float projA, out float projB, out float projC) {
    projA = pos.x * 0.5 + pos.y * -sqrt(3.0)/2.0;
    projB = pos.x;
    projC = pos.x * 0.5 + pos.y * sqrt(3.0)/2.0;
}

// Distance to the infinite line of a given side s.
// For sides at +1, distance = 1 - t; for sides at -1, distance = 1 + t.
float hexSideDistance(int sideIdx, float projA, float projB, float projC) {
    int idx = sideIdx % 3; // 0 -> projA 1 -> projB 2 -> projC
    float sign = 1.0 - 2.0 * step(3.0, float(sideIdx)); // wynik step -> 0.0 jeśli x < edge - 1.0 jeśli x >= edge
    // boki 1 2 3 daja wynik 0, 4 5 6 daja wynik 1, czyli sign to albo 1 albo - 1 
    float proj = mix(
        mix(projA, projB, float(idx == 1)),
        projC,
        float(idx == 2)
    );

    return 1.0 - sign * proj; // + -> 1-proj, - -> 1+proj
}

// Determine which side pair is dominant, then pick side by sign.
// Returns s0 in [0..5] and border distance dm (distance to hex boundary).
void hex_nearest_side(
    vec2 pos,
out int   sideIdx,
out float margin,
out float projA,
out float projB,
out float projC
) {
    hexAxes(pos, projA, projB, projC);
    
    float absProjA = abs(projA);
    float absProjB = abs(projB);
    float absProjC = abs(projC);

    // Signed distance to hex boundary band (positive inside)
    float absMax = max(max(absProjA, absProjB), absProjC);
    margin = 1.0 - absMax;

    // znajdowanie najwiekszej maski branchless
    float aGreaterEqualB = step(absProjB, absProjA);
    float aGreaterEqualC = step(absProjC, absProjA);
    float bGreaterEqualA = step(absProjA, absProjB);
    float bGreaterEqualC = step(absProjC, absProjB);
    float isAGreatest = aGreaterEqualB * aGreaterEqualC;
    float isBGreatest = (1.0 - isAGreatest) * (bGreaterEqualA * bGreaterEqualC);
    float isCGreatest = 1.0 - isAGreatest - isBGreatest;
    //index osi 0/1/2
    float dominantAxisIndexFloat = 0.0 * isAGreatest + 1.0 * isBGreatest + 2.0 * isCGreatest;
    int dominantAxisIndex = int(dominantAxisIndexFloat + 0.5); // dodawanie 0.5 niweluje problemy przy wartościach float 0.999999 itp.
    
    // wybór projekcji zwycięskiej osi (branchless)
    float projAxis = mix(
        mix(projA, projB, float(dominantAxisIndex == 1)),
        projC,
        float(dominantAxisIndex == 2)
    );

    // flaga znaku: 0 gdy projAxis >= 0, 1 gdy projAxis < 0
    float signFlag = step(projAxis, 0.0);

    // finalny indeks boku: 0..2 dla stron dodatnich, 3..5 dla ujemnych
    sideIdx = dominantAxisIndex + int(3.0 * signFlag);
}

void main() {
    float isTop = step(v_local.y, 0.0); //
    vec3 fillColor = mix(u_colorA, u_colorB, isTop);

    float projA, projB, projC;
    int nearestSideIdx;
    float margin;
    hex_nearest_side(v_local, nearestSideIdx, margin, projA, projB, projC);

    // 1 gdy piksel w paśmie obrysu (margin < borderWidth)
    float inBand = 1.0 - step(u_borderWidth, margin);

    float distanceNearest = hexSideDistance(nearestSideIdx, projA, projB, projC);
    float nearestOn = float(getBitAt(u_edgeMask, nearestSideIdx) != 0);

    // rysować najbliższy bok?
    float drawNearest = inBand * nearestOn * (1.0 - step(u_borderWidth, distanceNearest));

    int sideLeft  = (nearestSideIdx + 5) % 6;
    int sideRight = (nearestSideIdx + 1) % 6;

    float distanceLeft  = hexSideDistance(sideLeft,  projA, projB, projC);
    float distanceRight = hexSideDistance(sideRight, projA, projB, projC);

    float leftOn  = float(getBitAt(u_edgeMask, sideLeft)  != 0);
    float rightOn = float(getBitAt(u_edgeMask, sideRight) != 0);

    // kandydaci do przejęcia klina
    float canLeft  = inBand * (1.0 - nearestOn) * leftOn  * (1.0 - step(u_borderWidth, distanceLeft));
    float canRight = inBand * (1.0 - nearestOn) * rightOn * (1.0 - step(u_borderWidth, distanceRight));

    // wybór bliższego kandydata (branchless)
    float hasLeft  = step(0.0, canLeft);
    float hasRight = step(0.0, canRight);
    float rightNotWorse = 1.0 - step(distanceLeft, distanceRight); // 1 gdy dRight <= dLeft

    float pickRight = hasRight * (1.0 - hasLeft + hasLeft * rightNotWorse);
    float pickLeft  = 1.0 - pickRight;

    float drawLeftAdopt  = canLeft  * pickLeft;
    float drawRightAdopt = canRight * pickRight;

    float drawAny = clamp(drawNearest + drawLeftAdopt + drawRightAdopt, 0.0, 1.0);

    int sideOutIdx = int(
    float(nearestSideIdx) * drawNearest
    + float(sideLeft)       * drawLeftAdopt
    + float(sideRight)      * drawRightAdopt
    + 0.5
    );

    vec3 edgeColor = EDGE_COLORS[sideOutIdx];
    vec3 outRgb = mix(fillColor, edgeColor, drawAny);
    outColor = vec4(outRgb, 1.0);
}