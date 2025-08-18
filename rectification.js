import * as numerical from './math.js';
import * as svd from './svd.js';
import * as ui from './ui.js';

export function getVanishingDataParallel(points) {
    const line1a = numerical.lineFromPoints(points[0], points[1]);
    const line1b = numerical.lineFromPoints(points[2], points[3]);
    const line2a = numerical.lineFromPoints(points[4], points[5]);
    const line2b = numerical.lineFromPoints(points[6], points[7]);
    const v1 = math.cross(line1a, line1b);
    const v2 = math.cross(line2a, line2b);
    const l_inf = math.cross(v1, v2);

    return { l_inf, v1, v2 };
}

export function getVanishingDataCrossRatio(points, ratio1, ratio2) {
    const A1 = [points[0].x, points[0].y, 1];
    const B1 = [points[1].x, points[1].y, 1];
    const C1 = [points[2].x, points[2].y, 1];

    const A2 = [points[3].x, points[3].y, 1];
    const B2 = [points[4].x, points[4].y, 1];
    const C2 = [points[5].x, points[5].y, 1];

    const v1 = findVanishingPointFromCrossRatio(A1, B1, C1, ratio1);
    const v2 = findVanishingPointFromCrossRatio(A2, B2, C2, ratio2);

    const l_inf = math.cross(v1, v2);

    return { l_inf, v1, v2 };
}

export function getVanishingDataHomography1d(points, ratio1, ratio2) {
    const v1 = findVanishingPoint1D([points[0].x, points[0].y, 1], [points[1].x, points[1].y, 1], [points[2].x, points[2].y, 1], ratio1);
    const v2 = findVanishingPoint1D([points[3].x, points[3].y, 1], [points[4].x, points[4].y, 1], [points[5].x, points[5].y, 1], ratio2);

    if (!v1 || !v2) {
        alert("Não foi possível achar pontos de fuga. Os pontos escolhidos são realmente colineares?");
        throw error;
    }

    const l_inf = math.cross(v1, v2);

    return { l_inf, v1, v2 };
}

export function getVanishingDataGeometric(points, ratio1, ratio2) {
    const v1 = findVanishingPointGeometric(points[0], points[1], points[2], ratio1);
    const v2 = findVanishingPointGeometric(points[3], points[4], points[5], ratio2);

    if (!v1 || !v2) {
        alert("Não foi possível achar pontos de fuga. Os pontos escolhidos são realmente colineares?");
        throw error;
    }

    const l_inf = math.cross([v1.x, v1.y, 1], [v2.x, v2.y, 1]);

    return { l_inf, v1, v2 };
}

export function getMetricHomography(points) {
    const linesPairs = [];
    for (let i = 0; i < points.length - 3; i += 4) {
        const l = numerical.lineFromPoints(points[i], points[i + 1]);
        const m = numerical.lineFromPoints(points[i + 2], points[i + 3]);
        linesPairs.push([l, m]);
    }

    let H = extractMetricHomography(linesPairs);
    return H;
}

function extractMetricHomography(line_pairs) {

    const A = line_pairs.map(([l, m]) => [
        l[0] * m[0],
        0.5 * (l[0] * m[1] + l[1] * m[0]),
        l[1] * m[1],
        0.5 * (l[0] * m[2] + l[2] * m[0]),
        0.5 * (l[1] * m[2] + l[2] * m[1]),
        l[2] * m[2]
    ]);

    const svdResult = svd.svd(A);

    const V = svdResult.v;
    const lastColIndex = V.length - 1;

    const sol = V[lastColIndex];

    let imDCCP = [
        [sol[0], sol[1] / 2, sol[3] / 2],
        [sol[1] / 2, sol[2], sol[4] / 2],
        [sol[3] / 2, sol[4] / 2, sol[5]]
    ];

    for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++) {
            const avg = (imDCCP[i][j] + imDCCP[j][i]) / 2;
            imDCCP[i][j] = avg;
            imDCCP[j][i] = avg;
        }
    }

    const svd2 = svd.svd(imDCCP);
    const u = svd2.u;
    const q = svd2.q;

    q[2] = 1.0;

    const sqrtS = math.diag(q.map(x => Math.sqrt(x)));
    const A_rect = math.multiply(u, sqrtS);

    return math.inv(A_rect);
}

function computeH1D(worldPts, imgPts) {
    const X = worldPts.map(p => p[0]);
    const x = imgPts.map(p => p[0]);
    const A = [
        [X[0], 1, -x[0] * X[0]],
        [X[1], 1, -x[1] * X[1]],
        [X[2], 1, -x[2] * X[2]],
    ];

    const b = [x[0], x[1], x[2]];
    const detA = math.det(A);

    if (Math.abs(detA) < 1e-12) {
        alert("Matrix singular em computeH1D");
        return null;
    }

    const replaceColumn = (m, colIdx, vec) =>
        m.map((row, i) =>
            row.map((val, j) =>
                (j === colIdx ? vec[i] : val)
            )
        );

    const h00 = math.det(replaceColumn(A, 0, b)) / detA;
    const h01 = math.det(replaceColumn(A, 1, b)) / detA;
    const h10 = math.det(replaceColumn(A, 2, b)) / detA;
    return [[h00, h01], [h10, 1]];
}

function findVanishingPoint1D(A, B, C, ratio) {
    const worldPoints = [[0, 1], [1, 1], [1 + ratio, 1]];
    const lineDir = [C[0] - A[0], C[1] - A[1]];
    const lineMagSq = lineDir[0] ** 2 + lineDir[1] ** 2;

    const proj1D = P => ((P[0] - A[0]) * lineDir[0] + (P[1] - A[1]) * lineDir[1]) / lineMagSq;

    const imgPoints = [[proj1D(A), 1], [proj1D(B), 1], [proj1D(C), 1]];

    const H1D = computeH1D(worldPoints, imgPoints);

    if (!H1D) return null;

    const v_img_scalar = H1D[0][0] / H1D[1][0];
    return [A[0] + v_img_scalar * lineDir[0], A[1] + v_img_scalar * lineDir[1], 1];
}

function findVanishingPointFromCrossRatio(A, B, C, ratio = 1) {
    const lineStart = [A[0], A[1]];
    const lineEnd = [B[0], B[1]];

    const crossratio = (1 / ratio) + 1;

    const a = numerical.projectToLineScalar(A, lineStart, lineEnd);
    const b = numerical.projectToLineScalar(B, lineStart, lineEnd);
    const c = numerical.projectToLineScalar(C, lineStart, lineEnd);

    const A_coef = crossratio * (b - c) - (a - c);
    const B_coef = - (a - c) * b + crossratio * a * (b - c);

    if (Math.abs(A_coef) < 1e-12) throw new Error("Divisao por zero findVanishingPointFrom4Points");

    const V = B_coef / A_coef;

    const vx = lineStart[0] + V * (lineEnd[0] - lineStart[0]);
    const vy = lineStart[1] + V * (lineEnd[1] - lineStart[1]);

    return [vx, vy, 1];
}

function lineThrough(p1, p2) {
    const { x: x1, y: y1 } = p1;
    const { x: x2, y: y2 } = p2;
    // line in form ax + by + c = 0
    const a = y1 - y2;
    const b = x2 - x1;
    const c = x1 * y2 - x2 * y1;
    return { a, b, c };
}

// intersection of two lines
function intersectLines(L1, L2) {
    const { a: a1, b: b1, c: c1 } = L1;
    const { a: a2, b: b2, c: c2 } = L2;
    const det = a1 * b2 - a2 * b1;
    if (Math.abs(det) < 1e-12) return null; // parallel
    const x = (b1 * c2 - b2 * c1) / det;
    const y = (c1 * a2 - c2 * a1) / det;
    return { x, y };
}

// point on line through p in direction dir with step lambda
function pointOnLineFrom(p, dir, lambda) {
    return { x: p.x + lambda * dir.x, y: p.y + lambda * dir.y };
}

// parallel line to "line" through "point"
function parallelThrough(line, point) {
    const { a, b } = line;
    // direction vector of line
    const dir = { x: -b, y: a };
    const q = { x: point.x + dir.x, y: point.y + dir.y };
    return lineThrough(point, q);
}

function findVanishingPointGeometric(aPrime, bPrime, cPrime, ratio) {
    // Step 1: pick arbitrary line l through a' not collinear with a'c'
    const dirAC = { x: cPrime.x - aPrime.x, y: cPrime.y - aPrime.y };
    const dirL = { x: dirAC.y, y: -dirAC.x }; // perpendicular
    const lineL = lineThrough(aPrime, { x: aPrime.x + dirL.x, y: aPrime.y + dirL.y });

    const ctx = document.getElementById('canvas').getContext('2d');
    ui.drawVanishingVisuals(ctx, null, null, [lineL.a, lineL.b, lineL.c]);

    // Step 2: mark off points a=a', b, c on l with ratio
    const b = pointOnLineFrom(aPrime, dirL, 1 / 4);       // ab = 1
    const c = pointOnLineFrom(b, dirL, ratio / 4);        // bc = ratio

    ui.drawPoint(ctx, b.x, b.y, 8, 'white');
    ui.drawPoint(ctx, c.x, c.y, 8, 'white');

    // Step 3: join bb' and cc' and find intersection o
    const Lbb = lineThrough(b, bPrime);
    const Lcc = lineThrough(c, cPrime);
    const o = intersectLines(Lbb, Lcc);

    ui.drawLine(ctx, b, o, 2, 'yellow');
    ui.drawLine(ctx, c, o, 2, 'yellow');
    ui.drawPoint(ctx, o.x, o.y, 8, 'white');

    // Step 4: draw line through o parallel to l
    const Lparallel = parallelThrough(lineL, o);

    // Step 5: intersect that line with a'c'
    const L_ac = lineThrough(aPrime, cPrime);
    const vPrime = intersectLines(Lparallel, L_ac);
    ui.drawPoint(ctx, vPrime.x, vPrime.y, 8, 'yellow');

    return vPrime;
}
