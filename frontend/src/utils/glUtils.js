/**
 * @param {WebGL2RenderingContext} gl
 * @param {number} type
 * @param {string} source
 */
function createShader(gl, type, source) {
    const shader = /** @type {WebGLShader} */ (gl.createShader(type));
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error('Shader compile error: ' + info);
    }
    return shader;
}
/**
 * @param context {WebGL2RenderingContext}
 * @param vertexShader {string}
 * @param fragmentShader {string}
 * @returns {{program: WebGLProgram, vao: WebGLVertexArrayObject}}
 */
export function buildWebGLProgram(context, vertexShader, fragmentShader) {
  const program = context.createProgram();
  const vertShader = createShader(context, context.VERTEX_SHADER, vertexShader);
  const fragShader = createShader(context, context.FRAGMENT_SHADER, fragmentShader);
  const vao = context.createVertexArray();
  context.attachShader(program, vertShader);
  context.attachShader(program, fragShader);
  context.linkProgram(program);
  context.useProgram(program);
  context.bindVertexArray(vao);
  return {program, vao};
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {WebGLProgram} program
 */
export function getShaderLocations(context, program) {
  return {
    mvp: /** @type {WebGLUniformLocation} */ (context.getUniformLocation(program, "u_mvp")),
    borderWidth: /** @type {WebGLUniformLocation} */ (context.getUniformLocation(program, "u_borderWidth")),
    mapWidth: /** @type {WebGLUniformLocation} */ (context.getUniformLocation(program, "u_mapWidth")),
    hexIndex: /** @type {WebGLUniformLocation} */ (context.getUniformLocation(program, "u_index")),
    edgeColor: /** @type {WebGLUniformLocation} */ (context.getUniformLocation(program, "u_edgeColor")),
    fillColors: /** @type {WebGLUniformLocation} */ (context.getUniformLocation(program, "FILL_COLORS")),

    hexIndexAttrib: /** @type {GLint} */ (context.getAttribLocation(program, "a_hexIndex")),
    edgeMask: /** @type {GLint} */ (context.getAttribLocation(program, "a_edgeMask")),
    fillColorMask: /** @type {GLint} */ (context.getAttribLocation(program, "a_fillColorMask")),
  }
}

/**
 * @param context {WebGL2RenderingContext}
 * @param location {GLuint}
 * @param data {ArrayLike<number>}
 * @param size {number}
 * @returns {WebGLBuffer}
 */
export function initBuffer(context, location, data, size) {
  const buffer = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, buffer);
  // we need to specify that data will be used for whole hexagons rather than individual vertices
  context.enableVertexAttribArray(location);
  context.vertexAttribPointer(location, size, context.FLOAT, false, 0, 0);
  context.bufferData(context.ARRAY_BUFFER, new Float32Array(data), context.DYNAMIC_DRAW);
  context.vertexAttribDivisor(location, 1);
  return buffer;
}

/**
 * @param context {WebGL2RenderingContext}
 * @param buffer {WebGLBuffer}
 * @param offset {number}
 * @param data {ArrayLike<number>}
 */
export function modifyBuffer(context, buffer, offset, data) {
  context.bindBuffer(context.ARRAY_BUFFER, buffer);
  context.bufferSubData(context.ARRAY_BUFFER, offset * Float32Array.BYTES_PER_ELEMENT , new Float32Array(data));
}