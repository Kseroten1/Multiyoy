import {makeModelMat3} from "../utils/math.js";
import {COLOR_TABLE_EDGE, COLOR_TABLE_FILL, CONFIG} from "../utils/config.js";
import {layers, state} from "./state.js";
import {convertOklchToRgb} from "../utils/convertOklchToRgb.js";

export const canvas = document.getElementById("main");
export const secondaryCanvas = document.getElementById("secondary");

export const gl = canvas.getContext("webgl2", {colorSpace: "display-p3"});
export const gl2 = secondaryCanvas.getContext("webgl2", {colorSpace: "display-p3"});

export function updateHexColors() {
    const applyColorTransform = (table) => table.map(([L, C, h]) => [
        Math.min(L * state.brightness, 1),
        C * state.saturation,
        h,
    ]);
    const fillRgb = convertOklchToRgb(applyColorTransform(COLOR_TABLE_FILL)).flat();
    const edgeRgb = convertOklchToRgb(applyColorTransform(COLOR_TABLE_EDGE)).flat();

    gl.useProgram(layers.hex.program);
    gl.bindVertexArray(layers.hex.vao);
    gl.uniform3fv(layers.hex.locations.FILL_COLORS, new Float32Array(fillRgb));
    gl.uniform3fv(layers.hex.locations.EDGE_COLORS, new Float32Array(edgeRgb));
    gl.uniform1f(layers.hex.locations.u_borderWidth, CONFIG.defaultBorderWidth);

    gl2.useProgram(layers.highlight.program);
    gl2.bindVertexArray(layers.highlight.vao);
    gl2.uniform3fv(layers.highlight.locations.FILL_COLORS, new Float32Array(fillRgb));
    gl2.uniform3fv(layers.highlight.locations.EDGE_COLORS, new Float32Array(edgeRgb));
    gl2.uniform1f(layers.highlight.locations.u_borderWidth, CONFIG.defaultBorderWidth);
}

export function drawFrame() {
    state.renderRequestId = null;
    const modelMatrix = makeModelMat3(state.panOffset, state.scale, canvas.width, canvas.height);

    gl.useProgram(layers.hex.program);
    gl.bindVertexArray(layers.hex.vao);
    gl.uniformMatrix3fv(layers.hex.locations.u_mvp, false, modelMatrix);
    gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 8, layers.hex.instanceCount);

    layers.units.draw(modelMatrix, CONFIG.hexSize, state.brightness, state.saturation);

    if (!state.hasMouse) {
        return;
    }

    layers.highlight.updateCenters(new Float32Array(state.hlCenters));
    gl2.useProgram(layers.highlight.program);
    gl2.bindVertexArray(layers.highlight.vao);
    gl2.uniformMatrix3fv(layers.highlight.locations.u_mvp, false, modelMatrix);
    gl2.drawArraysInstanced(gl2.TRIANGLE_FAN, 0, 8, layers.highlight.instanceCount);

    if (state.hlUnitTex.length > 0) {
        layers.highlightUnits.updateData(new Float32Array(state.hlUnitPos), new Float32Array(state.hlUnitTex));
        layers.highlightUnits.draw(modelMatrix, CONFIG.hexSize, state.brightness * 1.2, state.saturation);
    }
}

export function scheduleRender() {
    if (state.renderRequestId === null) {
        state.renderRequestId = requestAnimationFrame(drawFrame);
    }
}

export function resize() {
    const dpr = window.devicePixelRatio;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    secondaryCanvas.width = rect.width * dpr;
    secondaryCanvas.height = rect.height * dpr;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl2.viewport(0, 0, secondaryCanvas.width, secondaryCanvas.height);

    scheduleRender();
}