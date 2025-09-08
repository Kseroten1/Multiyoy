import vertexShaderString from './vertexShader.glsl?raw'
import fragmentShaderString from './fragmentShader.glsl?raw'

const canvas = document.getElementById("main");
const gl = canvas.getContext("webgl2"); // ask for WebGL2 (newer GL). Required for gl_VertexID.

const vertexShaderSource = vertexShaderString;
const fragmentShaderSource = fragmentShaderString;

function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); // attach source code
    gl.compileShader(shader); // compile it
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error('Shader compile failed: ' + info);
    }
    return shader;
}

const vertShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
const fragShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = gl.createProgram();

gl.attachShader(program, vertShader);
gl.attachShader(program, fragShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error('Program link failed: ' + info);
}

gl.useProgram(program);

const vao = gl.createVertexArray(); //GPU-state object that remembers how your vertex data is provided to the shader, not functional in this implementation, but still needed 
gl.bindVertexArray(vao);

// Look up uniform locations we will set each frame
const uCenterLoc = gl.getUniformLocation(program, "u_center");
const uRadiusLoc = gl.getUniformLocation(program, "u_radius");
const uSegmentsLoc = gl.getUniformLocation(program, "u_segments");
const uColorALoc = gl.getUniformLocation(program, 'u_colorA');
const uColorBLoc = gl.getUniformLocation(program, 'u_colorB');

const colorA = [1.0, 1.0, 1.0]; // polska
const colorB = [0.9, 0.2, 0.2]; // gurom

const segSlider = document.getElementById("seg");
const segLabel = document.getElementById("segVal");
let segments = Math.max(3, parseInt(segSlider.value, 10) || 3);
const circleColor = [0.2, 0.5, 1.0]; // RGB
const radius = 0.8;
const center = [0.0, 0.0];

const backgroundColor = [0.07, 0.07, 0.07, 1]

gl.clearColor(...backgroundColor);

function draw() {
    canvas.width = 700;
    canvas.height = 700;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindVertexArray(vao); // bind VAO (no attributes needed)
    gl.uniform2fv(uCenterLoc, center);   // set center
    gl.uniform1f(uRadiusLoc, radius);    // set radius
    gl.uniform1i(uSegmentsLoc, segments); // set segments
    gl.uniform3fv(uColorALoc, colorA);
    gl.uniform3fv(uColorBLoc, colorB);

    const vertexCount = segments + 2; //N rim + 1 closing + rim center
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexCount);
}

// Update on slider change
segSlider.addEventListener("input", () => {
    segments = Math.max(3, parseInt(segSlider.value, 10) || 3);
    segLabel.textContent = segments;
    draw();
});

draw(); // initial draw