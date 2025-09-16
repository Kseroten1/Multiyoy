#version 300 es
precision highp float;

uniform vec3  u_colorA;  // top color
uniform vec3  u_colorB;  // bottom color
uniform uint  u_edgeMask; // maska krawedzi 

in vec2 v_local;
flat in int v_edgeId;
out vec4 outColor;

//source : https://iquilezles.org/articles/distfunctions2d/
float sdHex(vec2 p) {
    const float s = 1.0 / 0.8660254037844386;
    p *= s;
    p = vec2(-p.y, p.x);
    const vec3 k = vec3(-0.8660254, 0.5, 0.577350269);
    p = abs(p);
    float h = dot(k.xy, p);
    p -= 2.0 * min(h, 0.0) * k.xy;
    p -= vec2(clamp(p.x, -k.z, k.z), 1.0);
    float d = length(p) * sign(p.y);
    return d / s;
}


void main() {
    float d = sdHex(v_local);

    // prosta grubość ramki (jednostki heksa)
    const float borderWidth = 0.06;

    // jeżeli w pasie [0, borderWidth] => zielona ramka
    bool onBorder = abs(d) <= borderWidth;

    bool edgeEnabled = false;
    if (v_edgeId > 0) { // wierzchołek 0 to środek, więc nie odpowiada za konkretne krawedzie
        uint bit = uint(v_edgeId - 1); // wierzcholek 1 to bit 0, 2 to bit 1 itd
        edgeEnabled = ( (u_edgeMask & (uint(1) << bit)) != uint(0) ); 
		// & zwraca liczbe po porownaniu AND wszystkich bitow obu liczb podanych 
		// uint(1) << bit wstawia 1 na pozycji ktora chcemy sprawdzic 
		// przyklad: 0b00110101 liczba 53, chcemy miec krawedzie wszedzie oprocz 2 i 4 bo tam sa 0 
		// sprawdzamy krawedz 3 czyli bit 2 ustawiamy uint(1) << 2 to daje nam 0b00000100
		// porownanie: 0b00110101
		// 			   0b00000100
		//             0b00000100 -> wynik & czyli AND da nam liczbe ktora potem jest sprawdzana warunkiem != 0 
    }

    vec3 fillRGB = (v_local.y >= 0.0) ? u_colorA : u_colorB;
	vec3 rgb = fillRGB;
    if (onBorder && v_edgeId > 0 && edgeEnabled) {
        rgb = vec3(0.0, 1.0, 1.0);
    }

    outColor = vec4(rgb, 1.0);
}