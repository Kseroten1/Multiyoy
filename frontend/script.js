const canvas = document.getElementById("main");
const gl = canvas.getContext("webgl2"); // ask for WebGL2 (newer GL). Required for gl_VertexID.

const vertexShaderSource = `#version 300 es //specifies usage of WebGL2
precision mediump float; 
uniform vec2 u_center;    // circle center in clip space (-1..1)
uniform float u_radius;   // circle radius in clip space
uniform int u_segments;   // how many segments the circle uses

void main() {
  int vid = gl_VertexID; // current vertex number: 0..u_segments+1
  vec2 pos;
  if (vid == 0) {
    pos = u_center;
  } else {
    float t = float(vid - 1) / float(u_segments); // 0..1 around the circle
    float angle = t * 6.28318530718;              // 2 * PI since webgl doesnt have PI and using radians is unpredictable
    vec2 dir = vec2(cos(angle), sin(angle));      // unit circle direction 
    pos = u_center + dir * u_radius;           
  }

  gl_Position = vec4(pos, 0.0, 1.0); // final position
}
`;

const fragmentShaderSource = `#version 300 es
precision lowp float;
out vec4 outColor; // explicit fragment output in WebGL2
uniform vec3 v_col;

void main() {
  outColor = vec4(v_col, 1.0); // solid color, full alpha
}
`;

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

const vao = gl.createVertexArray(); // create a VAO
gl.bindVertexArray(vao);            // bind it

// Look up uniform locations we will set each frame
const vColLoc = gl.getUniformLocation(program, "v_col");
const uCenterLoc = gl.getUniformLocation(program, "u_center");
const uRadiusLoc = gl.getUniformLocation(program, "u_radius");
const uSegmentsLoc = gl.getUniformLocation(program, "u_segments");

const segSlider = document.getElementById("seg");
const segLabel = document.getElementById("segVal");
let segments = Math.max(3, parseInt(segSlider.value, 10) || 3);
const circleColor = [0.2, 0.5, 1.0]; // RGB
const radius = 0.8;
const center = [0.0, 0.0];

gl.clearColor(0.07, 0.07, 0.07, 1);

function draw() {
    canvas.width = 700;
    canvas.height = 700;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindVertexArray(vao); // bind VAO (no attributes needed)
    gl.uniform3fv(vColLoc, circleColor); // set color
    gl.uniform2fv(uCenterLoc, center);   // set center
    gl.uniform1f(uRadiusLoc, radius);    // set radius
    gl.uniform1i(uSegmentsLoc, segments); // set segments

    const vertexCount = segments + 2; //N rim + 1 closing and rim center
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexCount);
}

// Update on slider change
segSlider.addEventListener("input", () => {
    segments = Math.max(3, parseInt(segSlider.value, 10) || 3);
    segLabel.textContent = segments;
    draw();
});

draw(); // initial draw