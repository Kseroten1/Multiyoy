import {updateBrightnessAndSaturationMax} from "../utils/updateBrightnessAndSaturationMax.js";
import {canvas, resize, scheduleRender, secondaryCanvas, updateHexColors} from "./renderer.js";
import {state} from "./state.js";
import {updateUnderPointerSelection} from "./mapLogic.js";
import {COLOR_TABLE_FILL} from "../utils/config.js";

export async function setupEventHandlers() {
    const [maxB, maxS] = updateBrightnessAndSaturationMax(COLOR_TABLE_FILL);
    const bInput = document.getElementById("brightness");
    const sInput = document.getElementById("saturation");

    window.addEventListener("resize", resize);
    bInput.max = maxB;
    bInput.addEventListener("input", (e) => { state.brightness = e.target.value; updateHexColors(); scheduleRender(); });

    sInput.max = maxS;
    sInput.addEventListener("input", (e) => { state.saturation = e.target.value; updateHexColors(); scheduleRender(); });

    secondaryCanvas.addEventListener("pointerdown", (e) => {
        if (state.dragging) return;
        e.preventDefault();
        state.activePointerId = e.pointerId;
        state.dragging = true;
        state.lastPosition.x = e.clientX;
        state.lastPosition.y = e.clientY;
        secondaryCanvas.setPointerCapture(e.pointerId);
    });

    secondaryCanvas.addEventListener("pointermove", (e) => {
        const rect = secondaryCanvas.getBoundingClientRect();
        state.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        state.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
        state.hasMouse = true;
        if (state.dragging && e.pointerId === state.activePointerId) {
            const deltaX = e.clientX - state.lastPosition.x;
            const deltaY = e.clientY - state.lastPosition.y;
            state.lastPosition.x = e.clientX;
            state.lastPosition.y = e.clientY;

            state.panOffset.x += (deltaX / rect.width) * 2.0;
            state.panOffset.y -= (deltaY / rect.height) * 2.0;
        }
        updateUnderPointerSelection();
        scheduleRender();
    });

    const endDrag = (e) => {
        if (!state.dragging || e.pointerId !== state.activePointerId) return;
        state.dragging = false;
        secondaryCanvas.releasePointerCapture(e.pointerId);
    };

    secondaryCanvas.addEventListener("pointerup", endDrag);
    secondaryCanvas.addEventListener("pointerleave", endDrag);

    secondaryCanvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const rect = secondaryCanvas.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const my = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        const zoom = Math.exp(-e.deltaY * 0.001);
        const newScale = Math.max(0.0005, Math.min(500.0, state.scale * zoom));
        const eff = newScale / state.scale;
        state.panOffset.x -= (mx - state.panOffset.x) * (eff - 1);
        state.panOffset.y -= (my - state.panOffset.y) * (eff - 1);
        state.scale = newScale;
        updateUnderPointerSelection();
        scheduleRender();
    }, { passive: false });
}