export function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error('Shader compile error: ' + info);
    }
    return shader;
}

export function createProgram(gl, vertSource, fragSource) {
    const program = gl.createProgram();
    const vertShader = createShader(gl, gl.VERTEX_SHADER, vertSource);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragSource);

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        throw new Error('Program linking error: ' + info);
    }

    return program;
}

export function createAndBindBuffer(gl, data, usage = gl.STATIC_DRAW) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    return buffer;
}

export function setupAttribute(gl, location, buffer, size, type = gl.FLOAT, isInt = false, divisor = 1) {
    if (location === -1) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);

    if (isInt) {
        gl.vertexAttribIPointer(location, size, type, 0, 0);
    } else {
        gl.vertexAttribPointer(location, size, type, false, 0, 0);
    }

    gl.vertexAttribDivisor(location, divisor);
}