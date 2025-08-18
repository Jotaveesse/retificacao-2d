import * as canvas from '../canvas.js';
import * as numerical from '../helper/numerical.js';

export function getVanishingDataGeometric(points, ratio1, ratio2) {
    const v1 = findVanishingPointGeometric(points[0], points[1], points[2], ratio1);
    const v2 = findVanishingPointGeometric(points[3], points[4], points[5], ratio2);

    const lineInf = math.cross([v1[0], v1[1], 1], [v2[0], v2[1], 1]);

    return { lineInf, v1, v2 };
}

function findVanishingPointGeometric(pointA, pointB, pointC, ratio = 1) {
    // cria uma linha perpendicular à linha original
    const lambda = 1;
    const perpDir = [-lambda * (pointC[1] - pointA[1]), lambda * (pointC[0] - pointA[0]), 0];

    const pointOnPerp = [pointA[0] + perpDir[0], pointA[1] + perpDir[1], 1];

    const lineL = math.cross(pointA, pointOnPerp);

    const ctx = document.getElementById('canvas').getContext('2d');

    canvas.drawVanishingVisuals(ctx, null, null, lineL);
    // marca os pontos a=a', b, c na linha l
    const b = math.add(pointA, perpDir);    // ab = 1
    const c = math.add(b, math.multiply(ratio, perpDir));   // bc = ratio

    canvas.drawPoint(ctx, b[0], b[1], 8, 'white');
    canvas.drawPoint(ctx, c[0], c[1], 8, 'white');

    // liga bb' e cc' e acha a interseção O
    const linebb = math.cross(b, pointB);
    const linecc = math.cross(c, pointC);
    const intersectionO = numerical.normalizeHomogPoint(math.cross(linebb, linecc));

    canvas.drawLine(ctx, b, intersectionO, 3, 'white');
    canvas.drawLine(ctx, c, intersectionO, 3, 'white');
    canvas.drawPoint(ctx, intersectionO[0], intersectionO[1], 8, 'white');

    // desenha a linha l
    // desenha uma linha paralela a L que passa por O
    const lineLparallel = numerical.parallelThroughPoint(lineL, intersectionO);

    //intersecta a linha paralela com AC para achar o ponto de fuga
    const lineAC = math.cross(pointA, pointC);
    const vPrime = numerical.normalizeHomogPoint(math.cross(lineLparallel, lineAC));

    return vPrime;
}