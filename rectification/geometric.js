import * as canvas from '../canvas.js';
import * as numerical from '../helper/numerical.js';

export function getVanishingDataGeometric(points, ratio1, ratio2, state = null) {
    const v1 = findVanishingPointGeometric(points[0], points[1], points[2], ratio1, state.showExtraLines1 ? state.inputCtx : null);
    const v2 = findVanishingPointGeometric(points[3], points[4], points[5], ratio2, state.showExtraLines2 ? state.inputCtx : null);

    const lineInf = math.cross([v1[0], v1[1], 1], [v2[0], v2[1], 1]);

    if (state && state.showExtraLines1 && state.showExtraLines2)
        canvas.drawLineHomog(state.inputCtx, lineInf, 1, 'DarkOrange');

    return { lineInf, v1, v2 };
}

function findVanishingPointGeometric(pointA, pointB, pointC, ratio = 1, ctx = null) {
    // cria uma linha perpendicular à linha original
    const lambda = 0.5;
    const perpDir = [-lambda * (pointC[1] - pointA[1]), lambda * (pointC[0] - pointA[0]), 0];

    const pointOnPerp = [pointA[0] + perpDir[0], pointA[1] + perpDir[1], 1];

    const lineL = math.cross(pointA, pointOnPerp);


    // marca os pontos a=a', b, c na linha l
    const b = math.add(pointA, perpDir);    // ab = 1
    const c = math.add(b, math.multiply(ratio, perpDir));   // bc = ratio


    // liga bb' e cc' e acha a interseção O
    const linebb = math.cross(b, pointB);
    const linecc = math.cross(c, pointC);
    const intersectionO = numerical.normalizeHomogPoint(math.cross(linebb, linecc));

    // desenha uma linha paralela a L que passa por O
    const lineLparallel = numerical.parallelThroughPoint(lineL, intersectionO);

    const lineAC = math.cross(pointA, pointC);

    //intersecta a linha paralela com AC para achar o ponto de fuga
    const vPrime = numerical.normalizeHomogPoint(math.cross(lineLparallel, lineAC));

    if (ctx) {
        canvas.drawLineHomog(ctx, lineL, 1, 'MediumSeaGreen ');
        canvas.drawPoint(ctx, b[0], b[1], 5, 'MediumSeaGreen');
        canvas.drawPoint(ctx, c[0], c[1], 5, 'MediumSeaGreen');

        canvas.drawLine(ctx, b, intersectionO, 1, 'yellow');
        canvas.drawLine(ctx, c, intersectionO, 1, 'yellow');
        canvas.drawPoint(ctx, intersectionO[0], intersectionO[1], 5, 'yellow');

        canvas.drawLineHomog(ctx, lineLparallel, 1, 'pink ');
        canvas.drawLineHomog(ctx, lineAC, 2, 'pink ');

        canvas.drawPoint(ctx, vPrime[0], vPrime[1], 5, 'pink ');
    }

    return vPrime;
}