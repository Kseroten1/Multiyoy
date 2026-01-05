#version 300 es
precision highp float;

layout(location=0) in vec2 a_center;
layout(location=1) in float a_textureIndex;

uniform mat3 u_mvp;
uniform float u_size;

out vec2 v_uv;

const float ATLAS_COLS = 4.0;
const float ATLAS_ROWS = 4.0;

const vec2 SPRITE_OFFSETS[4] = vec2[](
vec2(-1.0,  1.0),
vec2(-1.0, -1.0),
vec2( 1.0,  1.0),
vec2( 1.0, -1.0)
);

void main() {
    vec2 localPos = SPRITE_OFFSETS[gl_VertexID];

    float padding = 0.6;
    vec2 modelPos = a_center + (localPos * u_size * padding);

    vec3 clipPos = u_mvp * vec3(modelPos, 1.0);
    gl_Position = vec4(clipPos.xy, 0.0, 1.0);

    vec2 baseUV = (localPos + vec2(1.0)) * 0.5;

    baseUV.y = 1.0 - baseUV.y;

    int index = int(a_textureIndex);
    float col = float(index % int(ATLAS_COLS));
    float row = float(index / int(ATLAS_COLS));
    vec2 sizeUV = vec2(1.0 / ATLAS_COLS, 1.0 / ATLAS_ROWS);

    v_uv = (baseUV * sizeUV) + (vec2(col, row) * sizeUV);
}