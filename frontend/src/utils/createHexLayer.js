import {createLayerBase, createInstanceBuffer} from "./glUtils.js";

export function createHexLayer(gl, vert, frag, data) {
    const { program, vao } = createLayerBase(gl, vert, frag);
    
    const locs = {
        u_center: gl.getAttribLocation(program, "u_center"),
        u_edgeMask: gl.getAttribLocation(program, "u_edgeMask"),
        u_fillColorMask: gl.getAttribLocation(program, "u_fillColorMask"),
        
        u_mvp: gl.getUniformLocation(program, "u_mvp"),
        u_borderWidth: gl.getUniformLocation(program, "u_borderWidth"),
        FILL_COLORS: gl.getUniformLocation(program, "FILL_COLORS"),
        EDGE_COLORS: gl.getUniformLocation(program, "EDGE_COLORS"),
    };

    const bufferCenters = createInstanceBuffer(
        gl,
        vao,
        locs.u_center,
        data.centers,
        2,
    );
    const bufferEdge = createInstanceBuffer(
        gl,
        vao,
        locs.u_edgeMask,
        data.edgeMasks,
        1,
        gl.INT,
    );
    const bufferFill = createInstanceBuffer(
        gl,
        vao,
        locs.u_fillColorMask,
        data.fillMasks,
        1,
        gl.INT,
    );

    return {
        program,
        vao,
        locations: locs,
        instanceCount: data.count,

        updateCenters: (newData) => {
            gl.bindBuffer(gl.ARRAY_BUFFER, bufferCenters);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, newData);
        },

        updateEdges: (newData) => {
            gl.bindBuffer(gl.ARRAY_BUFFER, bufferEdge);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, newData);
        },

        updateFills: (newData) => {
            gl.bindBuffer(gl.ARRAY_BUFFER, bufferFill);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, newData);
        },
    };
}