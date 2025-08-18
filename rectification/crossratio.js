import * as numerical from '../helper/numerical.js';
import { EPSILON } from '../helper/numerical.js';

export function getVanishingDataCrossRatio(points, ratio1, ratio2) {
    const v1 = findVanishingPointCrossRatio(points[0], points[1], points[2], ratio1);
    const v2 = findVanishingPointCrossRatio(points[3], points[4], points[5], ratio2);

    const l_inf = math.cross(v1, v2);

    return { l_inf, v1, v2 };
}

function findVanishingPointCrossRatio(pointA, pointB, pointC, ratio = 1) {
    const lineStart = [pointA[0], pointA[1]];
    const lineEnd = [pointB[0], pointB[1]];

    const crossratio = (1 / ratio) + 1;

    const a = numerical.projectToLineScalar(pointA, lineStart, lineEnd);
    const b = numerical.projectToLineScalar(pointB, lineStart, lineEnd);
    const c = numerical.projectToLineScalar(pointC, lineStart, lineEnd);

    const A_coef = crossratio * (b - c) - (a - c);
    const B_coef = - (a - c) * b + crossratio * a * (b - c);

    if (Math.abs(A_coef) < EPSILON) {
        throw new Error("Divisao por zero");
    }

    const V = B_coef / A_coef;

    const vx = lineStart[0] + V * (lineEnd[0] - lineStart[0]);
    const vy = lineStart[1] + V * (lineEnd[1] - lineStart[1]);

    return [vx, vy, 1];
}
