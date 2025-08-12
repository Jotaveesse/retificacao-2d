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
    horizon: 2,
    crossratio3: 6,
    crossratio4: 8,
    metric: 20,
    circle: 10
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
        resetPoints();
        ui.setInstructions(instructions, methodSelect.value);
    });

    rectifyBtn.addEventListener('click', rectifyImage);
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

    const method = methodSelect.value;
    let H = getHomography(state.points, method);
    redrawAll();

    applyHomography(ctx, outCtx, state.imgData, H);

    redrawAll();
}

function getHomography(points, method) {
    let H = null;

    switch (method) {
        case 'horizon': {
            if (points.length < 2) {
                alert('Horizon method requires 2 points to define the line.');
                break;
            }

            const l_inf = numerical.lineFromPoints(points[0], points[1]);
            ui.drawVanishingVisuals(ctx, null, null, l_inf);
            H = buildAffineHFromVanishingLine(l_inf);

            break;
        }
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
        case 'crossratio4': {
            if (points.length < 8) {
                alert('Four-point Cross-Ratio method requires 8 points: 4 collinear points for each of two directions.');
                break;
            }

            const { l_inf, v1, v2 } = rect.getVanishingDataCross4(points);
            ui.drawVanishingVisuals(ctx, v1, v2, l_inf);
            H = buildAffineHFromVanishingLine(l_inf);

            break;
        }
        case 'crossratio3': {
            if (points.length < 6) {
                alert('Cross-ratio method requires 6 points (3 collinear per direction).');
                break;
            }

            const { l_inf, v1, v2 } = rect.getVanishingDataCross3(points);
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
        case 'circle': {
            if (points.length < 10) {
                alert('Método circular requer 10 pontos.');
                break;
            }

            const coeffs1 = rect.fitEllipse(points.slice(0, 5));
            const coeffs2 = rect.fitEllipse(points.slice(5, 10));

            H = affineRectificationFromCircles(coeffs1, coeffs2);

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

/**
 * Convert 6-element ellipse params to 3x3 conic matrix
 * [A, B, C, D, E, F] -> symmetric matrix
 */
function ellipseToConic(params) {
  const [A, B, C, D, E, F] = params;
  return math.matrix([
    [A, B / 2, D / 2],
    [B / 2, C, E / 2],
    [D / 2, E / 2, F],
  ]);
}

/**
 * Find the line through two points p and q in homogeneous coords
 */
function lineThroughPoints(p, q) {
  return math.cross(p, q);
}

/**
 * Solve for lambda such that det(lambda*C1 + (1-lambda)*C2) = 0
 * Returns the roots of the quadratic characteristic equation
 */
function findIntersectionLambdas(C1, C2) {
  // det(lambda C1 + (1-lambda) C2) = det((C1 - C2) lambda + C2) = 0
  // This is a cubic polynomial in lambda (degree 3 matrix det), but
  // since matrices are 3x3, we can expand it as a cubic polynomial.
  // For simplicity, solve det(M(lambda)) = 0 by numeric approach:

  // Coefficients of polynomial det(M(lambda)) = a*lambda^3 + b*lambda^2 + c*lambda + d = 0
  // We'll use mathjs det on linear combos of matrices.

  // Calculate determinants at lambda=0,1 and derivative approx:
  // For simplicity, we approximate by scanning:

  // Better approach: det is cubic in lambda, use numeric solver (e.g. Newton, but here we do simple numeric root finding)

  // Instead, let's do eigenvalues of the matrix pencil (C1, C2)

  // This is a generalized eigenvalue problem:
  // det(C1 - lambda*C2) = 0, solve for lambda

  // So we solve eigs of inv(C2)*C1 and eigenvalues = lambda

  const C2inv = math.inv(C2);
  const M = math.multiply(C2inv, C1);

  const eig = math.eigs(M);
  // eig.values = array of eigenvalues (possibly complex)
  return eig.values;
}

/**
 * Given lambda, compute the degenerate conic: D = lambda*C1 + (1-lambda)*C2
 */
function degenerateConic(C1, C2, lambda) {
  return math.add(math.multiply(lambda, C1), math.multiply(1 - lambda, C2));
}

/**
 * Find nullspace (kernel) of a 3x3 matrix (conic matrix) using SVD
 * Returns an array of 3x1 vectors spanning the nullspace
 */
function nullspace(mat) {
  const svdRes = svd.svd(mat);
  // Smallest singular value corresponds to nullspace vector
  const tol = 1e-12;
  let nullvecs = [];
  for (let i = 0; i < svd.s.length; i++) {
    if (svdRes.s[i] < tol) {
      // ith column of V corresponds to nullspace vector
      nullvecs.push(math.subset(svdRes.V, math.index([0, 1, 2], i)));
    }
  }
  // Often nullspace dimension is 1 for degenerate conic (pair of lines), so return all
  return nullvecs;
}

/**
 * Normalize homogeneous point/vector so last coordinate = 1
 */
function normalizeHomogeneous(pt) {
  return pt.map((v) => v / pt[pt.length - 1]);
}

/**
 * Main function: Given two ellipses (each 6 params),
 * returns 3x3 affine rectification homography matrix
 */
function affineRectificationFromCircles(ellipse1, ellipse2) {
  const C1 = ellipseToConic(ellipse1);
  const C2 = ellipseToConic(ellipse2);

  // Find lambdas from generalized eigenvalues:
  const lambdas = findIntersectionLambdas(C1, C2);

  // For each lambda, compute degenerate conic and find nullspace (intersection points)
  // The degenerate conic corresponds to two lines (product of two lines)
  // The intersection points of the two ellipses are where these two lines intersect
  // So nullspace gives the points.

  let points = [];
  for (let i = 0; i < lambdas.length; i++) {
    const D = degenerateConic(C1, C2, lambdas[i]);
    const ns = nullspace(D);
    // nullspace of degenerate conic matrix D is 2D - the two lines (line vectors)
    if (ns.length === 2) {
      // The intersection points = intersection of these two lines
      // Lines are l1 and l2 = ns[0], ns[1]
      // intersection point = l1 x l2
      const p = math.cross(ns[0], ns[1]);
      points.push(p);
    }
  }

  // We expect two intersection points = the images of the circular points I and J
  // They are complex conjugates in general - we'll pick the first two points
  if (points.length < 2) {
    throw new Error('Failed to find two intersection points of ellipses.');
  }

  const I_prime = points[0];
  const J_prime = points[1];

  // The image of the line at infinity is the line through these two points
  const l_inf_prime = lineThroughPoints(I_prime, J_prime);

  // Normalize line so last coord = 1 (for convenience)
  const l = l_inf_prime.map((v) => v / l_inf_prime[2]);

  // The affine rectification homography H has form:
  // [1 0 0; 0 1 0; a b 1] and should satisfy H^{-T} l_inf_prime = [0 0 1]^T
  // So H^{-T} l = [0,0,1]^T  =>  l = H^T [0 0 1]^T = last column of H^T = [a b 1]^T
  // So (a, b, 1) = l  => a = l[0], b = l[1]

  const a = l[0];
  const b = l[1];

  const H = [
    [1, 0, 0],
    [0, 1, 0],
    [a, b, 1],
  ];

  return H;
}
