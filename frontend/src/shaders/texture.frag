#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D u_atlas;
uniform float u_brightness;
uniform float u_saturation;

out vec4 outColor;

void main() {
    vec4 texColor = texture(u_atlas, v_uv);
    if (texColor.a < 0.1) discard;

    vec3 color = texColor.rgb;
    color *= u_brightness;
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luma), color, u_saturation);

    outColor = vec4(color, texColor.a);
}