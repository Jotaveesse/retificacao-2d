import * as numerical from './math.js';
import * as svd from './svd.js';


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

export function getVanishingDataCross4(points) {
    const A1 = [points[0].x, points[0].y, 1];
    const B1 = [points[1].x, points[1].y, 1];
    const C1 = [points[2].x, points[2].y, 1];
    const D1 = [points[3].x, points[3].y, 1];

    const A2 = [points[4].x, points[4].y, 1];
    const B2 = [points[5].x, points[5].y, 1];
    const C2 = [points[6].x, points[6].y, 1];
    const D2 = [points[7].x, points[7].y, 1];

    const CR1_real = 6 / 3; //TODO
    const CR2_real = 6 / 3;

    const v1 = findVanishingPointFrom4Points(A1, B1, C1, D1, CR1_real);
    const v2 = findVanishingPointFrom4Points(A2, B2, C2, D2, CR2_real);

    l_inf = math.cross(v1, v2);

    return { l_inf, v1, v2 };
}

export function getVanishingDataCross3(points) {
    const v1 = findVanishingPoint1D([points[0].x, points[0].y, 1], [points[1].x, points[1].y, 1], [points[2].x, points[2].y, 1]);
    const v2 = findVanishingPoint1D([points[3].x, points[3].y, 1], [points[4].x, points[4].y, 1], [points[5].x, points[5].y, 1]);

    if (!v1 || !v2) {
        alert("Não foi possível achar pontos de fuga. Os pontos escolhidos são realmente colineares?");
        throw error;
    }

    const l_inf = math.cross(v1, v2);

    return { l_inf, v1, v2 };
}

export function getMetricHomography(points) {
    const linesPairs = [];
    for (let i = 0; i < points.length-3; i += 4) {
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
    const X = worldPts.map(p => p[0]), x = imgPts.map(p => p[0]);
    const A = [
        [X[0], 1, -x[0] * X[0]], [X[1], 1, -x[1] * X[1]], [X[2], 1, -x[2] * X[2]],
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

function findVanishingPoint1D(A, B, C) {
    const worldPoints = [[0, 1], [1, 1], [2, 1]];
    const lineDir = [C[0] - A[0], C[1] - A[1]];
    const lineMagSq = lineDir[0] ** 2 + lineDir[1] ** 2;

    const proj1D = P => ((P[0] - A[0]) * lineDir[0] + (P[1] - A[1]) * lineDir[1]) / lineMagSq;

    const imgPoints = [[proj1D(A), 1], [proj1D(B), 1], [proj1D(C), 1]];

    const H1D = computeH1D(worldPoints, imgPoints);

    if (!H1D) return null;

    const v_img_scalar = H1D[0][0] / H1D[1][0];
    return [A[0] + v_img_scalar * lineDir[0], A[1] + v_img_scalar * lineDir[1], 1];
}

function findVanishingPointFrom4Points(A, B, C, D, CR_real = 1) {
    const lineStart = [A[0], A[1]];
    const lineEnd = [B[0], B[1]];

    const a = numerical.projectToLineScalar(A, lineStart, lineEnd);
    const b = numerical.projectToLineScalar(B, lineStart, lineEnd);
    const c = numerical.projectToLineScalar(C, lineStart, lineEnd);
    const d = numerical.projectToLineScalar(D, lineStart, lineEnd);

    const A_coef = CR_real * (b - c) - (a - c);
    const B_coef = - (a - c) * b + CR_real * a * (b - c);

    if (Math.abs(A_coef) < 1e-12) throw new Error("Divisao por zero findVanishingPointFrom4Points");

    const V = B_coef / A_coef;

    const vx = lineStart[0] + V * (lineEnd[0] - lineStart[0]);
    const vy = lineStart[1] + V * (lineEnd[1] - lineStart[1]);

    return [vx, vy, 1];
}
