import * as svd from '../helper/svd.js';

export function getMetricHomography(points) {
    const linesPairs = [];
    for (let i = 0; i < points.length - 3; i += 4) {
        const l = math.cross(points[i], points[i + 1]);
        const m = math.cross(points[i + 2], points[i + 3]);
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