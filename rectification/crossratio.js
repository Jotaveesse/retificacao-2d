import * as canvas from '../canvas.js';
import * as numerical from '../helper/numerical.js';
import { EPSILON } from '../helper/numerical.js';

export function getVanishingDataCrossRatio(points, ratio1, ratio2, state) {
    const v1 = findVanishingPointCrossRatio(points[0], points[1], points[2], ratio1);
    const v2 = findVanishingPointCrossRatio(points[3], points[4], points[5], ratio2);

    const lineInf = math.cross(v1, v2);

    if (state && state.showExtraLines1 && state.showExtraLines2) {
        canvas.drawLineHomog(state.inputCtx, lineInf, 1, 'DarkOrange');
    }
    if(state && state.showExtraLines1) {
        canvas.drawPoint(state.inputCtx, v1[0], v1[1], 5, 'MediumSeaGreen');
    }
    if(state && state.showExtraLines2) {
        canvas.drawPoint(state.inputCtx, v2[0], v2[1], 5, 'MediumSeaGreen');
    }

    return { lineInf, v1, v2 };
}

function findVanishingPointCrossRatio(pointA, pointB, pointC, ratio = 1) {
    const lineStart = [pointA[0], pointA[1]];
    const lineEnd = [pointB[0], pointB[1]];

    //calcula a razão cruzada com base na razao fornecida
    const crossratio = (1 / ratio) + 1;

    //projeta os pontos A, B e C em coordenadas escalares ao longo da reta
    const a = numerical.projectToLineScalar(pointA, lineStart, lineEnd);
    const b = numerical.projectToLineScalar(pointB, lineStart, lineEnd);
    const c = numerical.projectToLineScalar(pointC, lineStart, lineEnd);

    //monta equações baseadas na razão cruzada
    const A_coef = crossratio * (b - c) - (a - c);
    const B_coef = -(a - c) * b + crossratio * a * (b - c);

    if (Math.abs(A_coef) < EPSILON) {
        throw new Error("Divisao por zero");
    }

    //escalar do ponto de fuga na reta
    const V = B_coef / A_coef;

    //reconstrói o ponto de fuga em coordenadas homogêneas
    const vx = lineStart[0] + V * (lineEnd[0] - lineStart[0]);
    const vy = lineStart[1] + V * (lineEnd[1] - lineStart[1]);

    return [vx, vy, 1];
}
