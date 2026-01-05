import {
    createLayerBase,
    createInstanceBuffer,
} from "./glUtils.js";

export function createSpriteLayer(gl, vert, frag, atlasTexture) {
    const { program, vao } = createLayerBase(gl, vert, frag);

    const locs = {
        a_center: gl.getAttribLocation(program, "a_center"),
        a_textureIndex: gl.getAttribLocation(program, "a_textureIndex"),
        u_mvp: gl.getUniformLocation(program, "u_mvp"),
        u_size: gl.getUniformLocation(program, "u_size"),
        u_atlas: gl.getUniformLocation(program, "u_atlas"),
    };

    const bufferCenters = createInstanceBuffer(
        gl,
        vao,
        locs.a_center,
        new Float32Array(0),
        2
    );
    const bufferIndices = createInstanceBuffer(
        gl,
        vao,
        locs.a_textureIndex,
        new Float32Array(0),
        1
    );

    let instanceCount = 0;

    return {
        program,
        vao,
        locations: locs,

        updateData: (centers, textureIndices) => {
            instanceCount = textureIndices.length;

            gl.bindBuffer(gl.ARRAY_BUFFER, bufferCenters);
            gl.bufferData(gl.ARRAY_BUFFER, centers, gl.DYNAMIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, bufferIndices);
            gl.bufferData(gl.ARRAY_BUFFER, textureIndices, gl.DYNAMIC_DRAW);
        },

        draw: (modelMatrix, hexSize) => {
            if (instanceCount === 0) return;

            gl.useProgram(program);

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            gl.uniformMatrix3fv(locs.u_mvp, false, modelMatrix);
            gl.uniform1f(locs.u_size, hexSize);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
            gl.uniform1i(locs.u_atlas, 0);

            gl.bindVertexArray(vao);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, instanceCount);

            gl.disable(gl.BLEND);
            gl.bindVertexArray(null);
        }
    };
}