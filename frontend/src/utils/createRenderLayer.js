import {createProgram, createAndBindBuffer, setupAttribute} from './glUtils.js';

export function createRenderLayer(context, vertSource, fragSource, data) {
    const program = createProgram(context, vertSource, fragSource);
    const vao = context.createVertexArray();
    context.bindVertexArray(vao);

    const locations = {
        mvp: context.getUniformLocation(program, "u_mvp"),
        center: context.getAttribLocation(program, "u_center"),
        edgeMask: context.getAttribLocation(program, "u_edgeMask"),
        fillMask: context.getAttribLocation(program, "u_fillColorMask"),
        borderWidth: context.getUniformLocation(program, "u_borderWidth"),
        fillColors: context.getUniformLocation(program, "FILL_COLORS"),
        edgeColors: context.getUniformLocation(program, "EDGE_COLORS")
    };

    const centerUsage = data.dynamic ? context.DYNAMIC_DRAW : context.STATIC_DRAW;

    const centersBuffer = createAndBindBuffer(context, data.centers, centerUsage);
    setupAttribute(context, locations.center, centersBuffer, 2, context.FLOAT, false, 1);

    const edgeMaskBuffer = createAndBindBuffer(context, data.edgeMasks, context.STATIC_DRAW);
    setupAttribute(context, locations.edgeMask, edgeMaskBuffer, 1, context.INT, true, 1);

    const fillMaskBuffer = createAndBindBuffer(context, data.fillMasks, context.STATIC_DRAW);
    setupAttribute(context, locations.fillMask, fillMaskBuffer, 1, context.INT, true, 1);

    const updateCenters = (newCentersData) => {
        context.bindBuffer(context.ARRAY_BUFFER, centersBuffer);
        context.bufferSubData(context.ARRAY_BUFFER, 0, newCentersData);
    };

    return {
        program,
        vao,
        locations,
        instanceCount: data.count,
        updateCenters
    };
}