import * as ui from './ui.js';
import * as numerical from './helper/numerical.js';
import * as canvas from './canvas.js';
import { getVanishingDataParallel } from './rectification/parallel.js';
import { getVanishingDataHomography1d } from './rectification/homography1d.js';
import { getVanishingDataCrossRatio } from './rectification/crossratio.js';
import { getVanishingDataGeometric } from './rectification/geometric.js';
import { getMetricHomography } from './rectification/metric.js';

const inputCanvas = document.getElementById('canvas');
const inCtx = inputCanvas.getContext('2d');
const outputCanvas = document.getElementById('canvas-out');
const outCtx = outputCanvas.getContext('2d');

const fileInput = document.getElementById('file');
const methodSelect = document.getElementById('method');

const stretchCheckbox = document.getElementById('stretchCheckbox');
const rotateCheckbox = document.getElementById('rotateCheckbox');

const showLinesCheckbox1 = document.getElementById('showLinesCheckbox1');
const showLinesCheckbox2 = document.getElementById('showLinesCheckbox2');

const pointsList = document.getElementById('pointsList');
const instructions = document.getElementById('instructions');

const rectifyBtn = document.getElementById('rectify');
const clearBtn = document.getElementById('clear');

const ratioInput1 = document.getElementById('ratioInput1');
const ratioInput2 = document.getElementById('ratioInput2');

const state = {
    img: new Image(),
    imgData: new Image(),
    imgLoaded: false,
    points: [],
    showExtraLines1: showLinesCheckbox1.checked,
    showExtraLines2: showLinesCheckbox2.checked,
    inputCtx: inCtx,
    outputCtx: outCtx,
};

const methodMaxPoints = {
    parallel: 8,
    homography1d: 6,
    crossratio: 6,
    geometric: 6,
    metric: 20,
};

const buttonDistThreshold = 10;

window.addEventListener('load', () => {
    ui.setInstructions(instructions, methodSelect.value);
    inCtx.fillStyle = 'white';
    inCtx.fillRect(0, 0, inputCanvas.width, inputCanvas.height);

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        state.img.onload = () => {
            state.imgLoaded = true;
            resetPoints();
            redrawInputCanvas();

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


        const closestPoint = state.points.reduce((closest, point) => {
            const dist = Math.hypot(point[0] - x, point[1] - y);
            if (dist < buttonDistThreshold && dist < closest.dist) {
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
            ui.updatePointsList(pointsList, state.points);

            if (state.points.length >= methodMaxPoints[methodSelect.value]) {
                rectifyImage();
            }

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
            redrawInputCanvas();
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
        const hideRatioInputs = !['crossratio', 'geometric', 'homography1d'].includes(methodSelect.value);
        document.getElementsByClassName("text-input-container")[0].style.display = hideRatioInputs ? 'none' : 'flex';

        resetPoints();
        redrawInputCanvas();
        ui.updatePointsList(pointsList, state.points);
    });

    showLinesCheckbox1.addEventListener('change', () => {
        state.showExtraLines1 = showLinesCheckbox1.checked;
        rectifyImage();
    });

    showLinesCheckbox2.addEventListener('change', () => {
        state.showExtraLines2 = showLinesCheckbox2.checked;
        rectifyImage();
    });

    rectifyBtn.addEventListener('click', () => {
        if (!state.imgLoaded) {
            alert('Carregue uma imagem primeiro');
            return;
        }
        if (state.points.length < methodMaxPoints[methodSelect.value]) {
            alert(`São necessários pelo menos ${methodMaxPoints[methodSelect.value]} pontos para o método selecionado.`);
            return H;
        }
        rectifyImage();
    });

    ratioInput1.addEventListener('keyup', rectifyImage);
    ratioInput2.addEventListener('keyup', rectifyImage);
    stretchCheckbox.addEventListener('change', rectifyImage);
    rotateCheckbox.addEventListener('change', rectifyImage);
    clearBtn.addEventListener('click', resetPoints);
});

function rectifyImage() {
    redrawInputCanvas();

    let H = getHomography(state.points, parseFloat(ratioInput1.value), parseFloat(ratioInput2.value), methodSelect.value);

    canvas.applyHomography(inCtx, outCtx, state.imgData, H, stretchCheckbox.checked, rotateCheckbox.checked);
}

function getHomography(points, ratio1, ratio2, method) {
    let H = null;

    switch (method) {
        case 'parallel': {
            const { lineInf, v1, v2 } = getVanishingDataParallel(points, state);

            H = numerical.homographyFromVanishingLine(lineInf);

            break;
        }
        case 'crossratio': {
            const { lineInf, v1, v2 } = getVanishingDataCrossRatio(points, ratio1, ratio2, state);

            H = numerical.homographyFromVanishingLine(lineInf);

            break;
        }
        case 'homography1d': {
            const { lineInf, v1, v2 } = getVanishingDataHomography1d(points, ratio1, ratio2, state);

            H = numerical.homographyFromVanishingLine(lineInf);

            break;
        }
        case 'geometric': {
            const { lineInf, v1, v2 } = getVanishingDataGeometric(points, ratio1, ratio2, state);

            H = numerical.homographyFromVanishingLine(lineInf);

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

function redrawInputCanvas() {
    const redrawState = { ...state, method: methodSelect.value };
    canvas.redraw(inCtx, redrawState);
}

function resetPoints() {
    state.points = [];
    redrawInputCanvas();
    ui.updatePointsList(pointsList, state.points);
}

function addPoint(x, y) {
    state.points.push([x, y, 1]);
    redrawInputCanvas();
    ui.updatePointsList(pointsList, state.points);
}

function removePoint(index) {
    if (index >= 0 && index < state.points.length) {
        state.points.splice(index, 1);
        redrawInputCanvas();
        ui.updatePointsList(pointsList, state.points);
    }
}