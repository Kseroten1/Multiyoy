#version 300 es
precision highp float;

uniform vec3  u_colorA;  // top color
uniform vec3  u_colorB;  // bottom color

in vec2 v_local;
out vec4 outColor;

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

    vec3 fillRGB = (v_local.y >= 0.0) ? u_colorA : u_colorB;
    vec3 rgb = onBorder ? vec3(0.3, 1.0, 0.8) : fillRGB;

    outColor = vec4(rgb, 1.0);
}