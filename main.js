import * as ui from './ui.js';
import * as numerical from './helper/numerical.js';
import * as canvas from './canvas.js';
import { getVanishingDataParallel } from './rectification/parallel.js';
import { getVanishingDataHomography1d } from './rectification/homography1d.js';
import { getVanishingDataCrossRatio } from './rectification/crossratio.js';
import { getVanishingDataGeometric } from './rectification/geometric.js';
import { getMetricHomography } from './rectification/metric.js';

const state = {
    img: new Image(),
    imgData: new Image(),
    imgLoaded: false,
    points: [],
    showLabels: true,
};

const methodMaxPoints = {
    parallel: 8,
    homography1d: 6,
    crossratio: 6,
    geometric: 6,
    metric: 20,
};

const inputCanvas = document.getElementById('canvas');
const inCtx = inputCanvas.getContext('2d');
const outputCanvas = document.getElementById('canvas-out');
const outCtx = outputCanvas.getContext('2d');
const fileInput = document.getElementById('file');
const methodSelect = document.getElementById('method');
const pointsList = document.getElementById('pointsList');
const instructions = document.getElementById('instructions');
const rectifyBtn = document.getElementById('rectify');
const clearBtn = document.getElementById('clear');
const ratioInput1 = document.getElementById('ratioInput1');
const ratioInput2 = document.getElementById('ratioInput2');

window.addEventListener('load', () => {
    ui.setInstructions(instructions, methodSelect.value);
    inCtx.fillStyle = '#f3f4f7';
    inCtx.fillRect(0, 0, inputCanvas.width, inputCanvas.height);

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        state.img.onload = () => {
            state.imgLoaded = true;
            resetPoints();
            canvas.fitCanvas(inputCanvas, state.img.width, state.img.height);
            redrawAll();

            state.imgData = inCtx.getImageData(0, 0, inCtx.canvas.width, inCtx.canvas.height);
        };
        state.img.src = url;
    });
    let movingPoint = null;

    inputCanvas.addEventListener('mousedown', (ev) => {
        if (ev.button !== 0) return;
        if (!state.imgLoaded) return;
        const rect = inputCanvas.getBoundingClientRect();
        const scaleX = inputCanvas.width / rect.width;
        const scaleY = inputCanvas.height / rect.height;
        const x = (ev.clientX - rect.left) * scaleX;
        const y = (ev.clientY - rect.top) * scaleY;

        const threshold = 10;

        const closestPoint = state.points.reduce((closest, point) => {
            const dist = Math.hypot(point[0] - x, point[1] - y);
            if (dist < threshold && dist < closest.dist) {
                return { point, dist };
            }
            return closest;
        }, { point: null, dist: Infinity });

        movingPoint = closestPoint.point;

        if (movingPoint) {
            movingPoint[0] = x;
            movingPoint[1] = y;
        }
    });

    inputCanvas.addEventListener('mouseup', (ev) => {
        if (ev.button !== 0) return;
        if (!state.imgLoaded) return;
        if (movingPoint) {
            movingPoint = null;
            redrawAll();
            ui.updatePointsList(pointsList, state.points);
            return
        }

        const rect = inputCanvas.getBoundingClientRect();
        const scaleX = inputCanvas.width / rect.width;
        const scaleY = inputCanvas.height / rect.height;
        const x = (ev.clientX - rect.left) * scaleX;
        const y = (ev.clientY - rect.top) * scaleY;

        const maxPoints = methodMaxPoints[methodSelect.value] || 0;

        if (state.points.length >= maxPoints) {
            alert(`Máximo de ${maxPoints} pontos atingido para o método selecionado.`);
            return;
        }

        addPoint(x, y);

        if (state.points.length >= maxPoints) {
            rectifyImage();
            return;
        }
    });

    inputCanvas.addEventListener('mousemove', (ev) => {
        if (movingPoint) {
            const rect = inputCanvas.getBoundingClientRect();
            const scaleX = inputCanvas.width / rect.width;
            const scaleY = inputCanvas.height / rect.height;
            const x = (ev.clientX - rect.left) * scaleX;
            const y = (ev.clientY - rect.top) * scaleY;
            movingPoint[0] = x;
            movingPoint[1] = y;
            redrawAll();
            ui.updatePointsList(pointsList, state.points);

            if (methodMaxPoints[methodSelect.value] <= state.points.length) {
                rectifyImage();
            }
        }
    });

    inputCanvas.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        if (state.points.length > 0) {
            removePoint(state.points.length - 1);
        }
    });

    methodSelect.addEventListener('change', () => {
        ui.setInstructions(instructions, methodSelect.value);
    });

    rectifyBtn.addEventListener('click', rectifyImage);
    ratioInput1.addEventListener('change', rectifyImage);
    ratioInput2.addEventListener('change', rectifyImage);
    clearBtn.addEventListener('click', resetPoints);
});


function rectifyImage() {
    if (!state.imgLoaded) {
        alert('Carregue uma imagem primeiro');
        return;
    }

    let H = getHomography(state.points, parseFloat(ratioInput1.value), parseFloat(ratioInput2.value), methodSelect.value);

    redrawAll();

    canvas.applyHomography(inCtx, outCtx, state.imgData, H);

    redrawAll();
}

function getHomography(points, ratio1, ratio2, method) {
    let H = null;

    if (points.length < methodMaxPoints[methodSelect.value]) {
        alert(`São necessários pelo menos ${methodMaxPoints[methodSelect.value]} pontos para o método selecionado.`);
        return H;
    }

    switch (method) {
        case 'parallel': {
            const { l_inf, v1, v2 } = getVanishingDataParallel(points);

            canvas.drawVanishingVisuals(inCtx, v1, v2, l_inf);
            H = numerical.homographyFromVanishingLine(l_inf);

            break;
        }
        case 'crossratio': {
            const { l_inf, v1, v2 } = getVanishingDataCrossRatio(points, ratio1, ratio2);

            canvas.drawVanishingVisuals(inCtx, v1, v2, l_inf);
            H = numerical.homographyFromVanishingLine(l_inf);

            break;
        }
        case 'homography1d': {
            const { l_inf, v1, v2 } = getVanishingDataHomography1d(points, ratio1, ratio2);

            canvas.drawVanishingVisuals(inCtx, v1, v2, l_inf);
            H = numerical.homographyFromVanishingLine(l_inf);

            break;
        }
        case 'geometric': {
            const { l_inf, v1, v2 } = getVanishingDataGeometric(points, ratio1, ratio2);

            canvas.drawVanishingVisuals(inCtx, v1, v2, l_inf);
            H = numerical.homographyFromVanishingLine(l_inf);

            break;
        }
        case 'metric': {
            H = getMetricHomography(points);
            break;
        }
        default:
            alert("Método selecionado não foi reconhecido");
    }

    return H;
}

function redrawAll() {
    const redrawState = { ...state, method: methodSelect.value };
    canvas.redraw(inCtx, redrawState);
}

function resetPoints() {
    state.points = [];
    redrawAll();
    ui.updatePointsList(pointsList, state.points);
}

function addPoint(x, y) {
    state.points.push([x, y, 1]);
    redrawAll();
    ui.updatePointsList(pointsList, state.points);
}

function removePoint(index) {
    if (index >= 0 && index < state.points.length) {
        state.points.splice(index, 1);
        redrawAll();
        ui.updatePointsList(pointsList, state.points);
    }
}