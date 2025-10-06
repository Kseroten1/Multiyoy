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

const vec3 EDGE_COLORS[6] = vec3[](
  vec3(1.0, 0.0, 0.0),  // 1 czerwony
  vec3(1.0, 0.5, 0.0),  // 2 pomarańczowy
  vec3(1.0, 1.0, 0.0),  // 3 żółty
  vec3(0.0, 1.0, 0.0),  // 4 zielony
  vec3(0.0, 0.5, 1.0),  // 5 niebieski
  vec3(0.6, 0.0, 1.0)   // 6 fioletowy
);

// budujemy trzy projekcje piksela (pos) względem trzech osi 0, +60 stopni, -60 stopni
// projekcja to rzut punktu na jeden z trzech kierunków 
void hexAxes(vec2 pos, out float projA, out float projB, out float projC) {
    projA = pos.x * cos60 + pos.y * (-sin60);
    projB = pos.x;
    projC = pos.x * cos60 + pos.y * sin60;
}

float hexSideDistance(int sideIdx, float projA, float projB, float projC) {
    // 3 projekcje, kazda odpowiada za 2 boki (dla proj = 1 lub -1), dlatego mod
    int idx = sideIdx % 3; // 0 -> projA 1 -> projB 2 -> projC
    float isNegativeSide = float(sideIdx >= 3); // 0.0 dla 0..2, 1.0 dla 3..5
    // wynik = mix(a, b, t)
    // gdy t = 1 wynik = b
    // gdy t = 0 wynik = a
    // jest 3 przypadek gdy 0 < t < 1, ale nie korzystamy z tego nigdzie
    float sign = mix(1.0, -1.0, isNegativeSide);
    // ktora projekcja bedzie miala zastosowanie dla tej krawedzi
    float isProjA = float(idx == 0);
    float isProjB = float(idx == 1);
    float isProjC = float(idx == 2);
    float selectedAB = mix(projA, projB, isProjB);
    float selectedProjection = mix(selectedAB, projC, isProjC);

    return 1.0 - sign * selectedProjection; // + -> 1-projekcja, - -> 1+projekcja
}

// funkcja liczy : 
// indeks najbliższej krawedzi -> sideIdx
// jak daleko od krawedzi jestesmy -> margin
// trzy projekcje do ponownego użycia
void hex_nearest_side(
    vec2  pos,
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

    // odległośc od krawędzi (jeżeli dodatnia to jesteśmy wewnątrz hexa)
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
// a -> projectionA (boki o indeksach 0, 3)
// b -> projectionB (boki o indeksach 1, 4)
// c -> projectionC (boki o indeksach 2, 5)  
//               [a >= b ?]
//               /        \
//             tak         nie
//             /             \
//      [a >= c ?]          [b >= c ?]
//        /     \             /     \
//      tak     nie         tak      nie
//     /          \         /          \
//   isA=1       [b>=a?]  isB=1       isC=1
//                /   \
//              tak   nie
//              /        \
//           isB=1      isC=1
    // index osi 0/1/2
    float dominantAxisIndexFloat = 0.0 * isAGreatest + 1.0 * isBGreatest + 2.0 * isCGreatest;
    int dominantAxisIndex = int(dominantAxisIndexFloat); 
    
    // wybór projekcji zwycięskiej osi
    float selectedAB = mix(projA, projB, float(dominantAxisIndex == 1));
    float selectedProjection = mix(selectedAB, projC, float(dominantAxisIndex == 2));
    float signFlag = step(selectedProjection, 0.0);

    // finalny indeks boku: 0..2 dla stron dodatnich, 3..5 dla ujemnych
    sideIdx = dominantAxisIndex + int(3.0 * signFlag);
}

void main() {
    float isTop = step(v_local.y, 0.0);
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

    int previousSide = (nearestSideIdx + 5) % 6;
    int nextSide = (nearestSideIdx + 1) % 6;

    float distancePrevious = hexSideDistance(previousSide, projA, projB, projC);
    float distanceNext = hexSideDistance(nextSide, projA, projB, projC);

    float previousOn = float(getBitAt(u_edgeMask, previousSide) != 0);
    float nextOn = float(getBitAt(u_edgeMask, nextSide) != 0);

    // kandydaci do przejęcia klina
    // 1) Czy piksel jest na krawedzi?
    float inBorderBand = 1.0 - step(u_borderWidth, margin);

    // 2) Czy najbliższa krawędź jest wyłączona?
    float nearestDisabled = 1.0 - nearestOn;

    // 3) Czy sąsiedzi są włączeni?
    float previousEnabled = float(getBitAt(u_edgeMask, previousSide) != 0);
    float nextEnabled = float(getBitAt(u_edgeMask, nextSide) != 0);

    // 4) Czy piksel leży na krawedzi danego sąsiada?
    float inPreviousStroke = 1.0 - step(u_borderWidth, distancePrevious);
    float inNextStroke = 1.0 - step(u_borderWidth, distanceNext);

    // Maska adopcji (wszystkie cztery warunki na raz, 0/1)
    float previousAdoptMask = inBorderBand * nearestDisabled * previousEnabled * inPreviousStroke;
    float nextAdoptMask = inBorderBand * nearestDisabled * nextEnabled * inNextStroke;

    // wybór bliższego kandydata
    float previousCandidateExists = step(0.0, previousAdoptMask);
    float nextCandidateExists = step(0.0, nextAdoptMask);
    float nextCloserOrEqual = 1.0 - step(distancePrevious, distanceNext);

    // przypadek: istnieje tylko next (previous nie istnieje)
    float onlyNext = nextCandidateExists * (1.0 - previousCandidateExists);

    // przypadek: istnieją obaj i next jest ≤ previous
    float bothExist = nextCandidateExists * previousCandidateExists;
    float nextWinsWhenBoth = bothExist * nextCloserOrEqual;

    // finalny wybór next = "tylko next" LUB "obaj i next ≤ previous"
    float chooseNext = onlyNext + nextWinsWhenBoth;

    // previous to dopełnienie
    float choosePrevious = 1.0 - chooseNext;

    float shouldDrawWedgeFromPreviousEdge = previousAdoptMask * choosePrevious;
    float shouldDrawWedgeFromNextEdge = nextAdoptMask * chooseNext;
    // clamp (x, 0, 1) 
    // jesli 0 < x < 1 zwraca x
    // jesli x < 0 zwraca 0
    // jesli x > 1 zwraca 1
    float drawAny = clamp(drawNearest + shouldDrawWedgeFromPreviousEdge + shouldDrawWedgeFromNextEdge, 0.0, 1.0);

    int sideOutIdx = int(
    float(nearestSideIdx) * drawNearest
    + float(previousSide) * shouldDrawWedgeFromPreviousEdge
    + float(nextSide) * shouldDrawWedgeFromNextEdge
    );

    vec3 edgeColor = EDGE_COLORS[sideOutIdx];
    vec3 outRgb = mix(fillColor, edgeColor, drawAny);
    outColor = vec4(outRgb, 1.0);
}