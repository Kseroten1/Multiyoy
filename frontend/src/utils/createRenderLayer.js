export function createRenderLayer(context, vertSource, fragSource, data) {
    const createShader = (type, source) => {
        const shader = context.createShader(type);
        context.shaderSource(shader, source);
        context.compileShader(shader);
        if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
            const info = context.getShaderInfoLog(shader);
            context.deleteShader(shader);
            throw new Error('Shader compile failed: ' + info);
        }
        return shader;
    };

    const program = context.createProgram();
    context.attachShader(program, createShader(context.VERTEX_SHADER, vertSource));
    context.attachShader(program, createShader(context.FRAGMENT_SHADER, fragSource));
    context.linkProgram(program);

    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
        throw new Error('Program link failed: ' + context.getProgramInfoLog(program));
    }

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

    const bindAttrib = (loc, bufferData, size, type = context.FLOAT, isInt = false) => {
        if (loc === -1) return;
        const buffer = context.createBuffer();
        context.bindBuffer(context.ARRAY_BUFFER, buffer);
        context.bufferData(context.ARRAY_BUFFER, bufferData, context.STATIC_DRAW);
        context.enableVertexAttribArray(loc);
        isInt
            ? context.vertexAttribIPointer(loc, size, type, 0, 0)
            : context.vertexAttribPointer(loc, size, type, false, 0, 0);
        context.vertexAttribDivisor(loc, 1);
    };

    // Ładowanie danych
    bindAttrib(locations.center, data.centers, 2);
    bindAttrib(locations.edgeMask, data.edgeMasks, 1, context.INT, true);
    bindAttrib(locations.fillMask, data.fillMasks, 1, context.INT, true);

    return {
        program,
        vao,
        locations,
        instanceCount: data.count
    };
}