import * as numerical from './math.js';
import * as ui from './ui.js';
import * as rect from './rectification.js';
import { buildAffineHFromVanishingLine, applyHomography } from './homography.js';

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

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const out = document.getElementById('canvas-out');
const outCtx = out.getContext('2d');
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
    ctx.fillStyle = '#f3f4f7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        state.img.onload = () => {
            state.imgLoaded = true;
            resetPoints();
            ui.fitCanvas(canvas, state.img.width, state.img.height);
            redrawAll();

            state.imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        };
        state.img.src = url;
    });
    let movingPoint = null;

    canvas.addEventListener('mousedown', (ev) => {
        if (ev.button !== 0) return;
        if (!state.imgLoaded) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (ev.clientX - rect.left) * scaleX;
        const y = (ev.clientY - rect.top) * scaleY;

        const threshold = 10;

        const closestPoint = state.points.reduce((closest, point) => {
            const dist = Math.hypot(point.x - x, point.y - y);
            if (dist < threshold && dist < closest.dist) {
                return { point, dist };
            }
            return closest;
        }, { point: null, dist: Infinity });

        movingPoint = closestPoint.point;


        if (movingPoint) {
            movingPoint.x = x;
            movingPoint.y = y;
        }
    });

    canvas.addEventListener('mouseup', (ev) => {
        if (ev.button !== 0) return;
        if (!state.imgLoaded) return;
        if (movingPoint) {
            movingPoint = null;
            redrawAll();
            ui.updatePointsList(pointsList, state.points);
            return
        }

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
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

    canvas.addEventListener('mousemove', (ev) => {
        if (movingPoint) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (ev.clientX - rect.left) * scaleX;
            const y = (ev.clientY - rect.top) * scaleY;
            movingPoint.x = x;
            movingPoint.y = y;
            redrawAll();
            ui.updatePointsList(pointsList, state.points);

            if (methodMaxPoints[methodSelect.value] <= state.points.length) {
                rectifyImage();
            }
        }
    });

    canvas.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        if (state.points.length > 0) {
            removePoint(state.points.length - 1);
        }
    });

    methodSelect.addEventListener('change', () => {
        // resetPoints();
        ui.setInstructions(instructions, methodSelect.value);
    });

    rectifyBtn.addEventListener('click', rectifyImage);
    ratioInput1.addEventListener('change', rectifyImage);
    ratioInput2.addEventListener('change', rectifyImage);
    clearBtn.addEventListener('click', resetPoints);
});

function addPoint(x, y) {
    state.points.push({ x, y });
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

function rectifyImage() {
    if (!state.imgLoaded) {
        alert('Carregue uma imagem primeiro');
        return;
    }

    let H = getHomography(state.points, parseFloat(ratioInput1.value), parseFloat(ratioInput2.value), methodSelect.value);

    redrawAll();

    applyHomography(ctx, outCtx, state.imgData, H);

    redrawAll();
}

function getHomography(points, ratio1, ratio2, method) {
    let H = null;

    switch (method) {
        case 'parallel': {
            if (points.length < 8) {
                alert('Parallel method requires 8 points (4 lines).');
                break;
            }

            const { l_inf, v1, v2 } = rect.getVanishingDataParallel(points);
            ui.drawVanishingVisuals(ctx, v1, v2, l_inf);
            H = buildAffineHFromVanishingLine(l_inf);

            break;
        }
        case 'crossratio': {
            if (points.length < 6) {
                alert('Four-point Cross-Ratio method requires 6 points: 3 collinear points for each of two directions.');
                break;
            }

            const { l_inf, v1, v2 } = rect.getVanishingDataCrossRatio(points, ratio1, ratio2);
            ui.drawVanishingVisuals(ctx, v1, v2, l_inf);
            H = buildAffineHFromVanishingLine(l_inf);

            break;
        }
        case 'homography1d': {
            if (points.length < 6) {
                alert('Cross-ratio method requires 6 points (3 collinear per direction).');
                break;
            }

            const { l_inf, v1, v2 } = rect.getVanishingDataHomography1d(points, ratio1, ratio2);
            ui.drawVanishingVisuals(ctx, v1, v2, l_inf);
            H = buildAffineHFromVanishingLine(l_inf);

            break;
        }
        case 'geometric': {
            if (points.length < 6) {
                alert('Cross-ratio method requires 6 points (3 collinear per direction).');
                break;
            }

            const { l_inf, v1, v2 } = rect.getVanishingDataGeometric(points, ratio1, ratio2);

            ui.drawVanishingVisuals(ctx, v1, v2, l_inf);
            H = buildAffineHFromVanishingLine(l_inf);

            break;
        }
        case 'metric': {
            if (points.length < 20) {
                alert('Método métrico requer 20 pontos: 5 pares de retas ortogonais (2 pontos por reta).');
                break;
            }

            H = rect.getMetricHomography(points);
            break;
        }
        default:
            alert("Método selecionado não foi reconhecido");
    }

    return H;
}

function redrawAll() {
    const redrawState = { ...state, method: methodSelect.value };
    ui.redraw(ctx, redrawState);
}

function resetPoints() {
    state.points = [];
    redrawAll();
    ui.updatePointsList(pointsList, state.points);
}