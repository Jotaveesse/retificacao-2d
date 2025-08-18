import { EPSILON } from '../helper/numerical.js';

export function getVanishingDataHomography1d(points, ratio1, ratio2) {
    const v1 = findVanishingPoint1d(points[0], points[1], points[2], ratio1);
    const v2 = findVanishingPoint1d(points[3], points[4], points[5], ratio2);

    const l_inf = math.cross(v1, v2);

    return { l_inf, v1, v2 };
}

function findVanishingPoint1d(pointA, pointB, pointC, ratio = 1) {
    const worldPoints = [[0, 1], [1, 1], [1 + ratio, 1]];

    const lineDir = [pointC[0] - pointA[0], pointC[1] - pointA[1]];
    const lineMagSq = lineDir[0] ** 2 + lineDir[1] ** 2;

    const proj1D = P => ((P[0] - pointA[0]) * lineDir[0] + (P[1] - pointA[1]) * lineDir[1]) / lineMagSq;

    const imgPoints = [[proj1D(pointA), 1], [proj1D(pointB), 1], [proj1D(pointC), 1]];

    const H1D = computeH1D(worldPoints, imgPoints);
    if (!H1D) return null;

    const v_img_scalar = H1D[0][0] / H1D[1][0];
    return [pointA[0] + v_img_scalar * lineDir[0], pointA[1] + v_img_scalar * lineDir[1], 1];
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
    if (Math.abs(detA) < EPSILON) {
        alert("Matriz nao inversível em computeH1D");
        return null;
    }

    const replaceColumn = (m, colIdx, vec) =>
        m.map((row, i) => row.map((val, j) => (j === colIdx ? vec[i] : val)));

    const h00 = math.det(replaceColumn(A, 0, b)) / detA;
    const h01 = math.det(replaceColumn(A, 1, b)) / detA;
    const h10 = math.det(replaceColumn(A, 2, b)) / detA;

    return [[h00, h01], [h10, 1]];
}
