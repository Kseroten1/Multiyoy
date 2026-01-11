#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D u_atlas;

out vec4 outColor;

void main() {
    vec4 texColor = texture(u_atlas, v_uv);

    if (texColor.a < 0.1) {
        discard;
    }

    outColor = texColor;
}