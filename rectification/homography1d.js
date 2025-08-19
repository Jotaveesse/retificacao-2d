
import * as canvas from '../canvas.js';
import * as numerical from '../helper/numerical.js';
import { EPSILON } from '../helper/numerical.js';

export function getVanishingDataHomography1d(points, ratio1, ratio2, state) {
    const v1 = findVanishingPoint1d(points[0], points[1], points[2], ratio1);
    const v2 = findVanishingPoint1d(points[3], points[4], points[5], ratio2);

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

function findVanishingPoint1d(pointA, pointB, pointC, ratio = 1) {
    // a:b = 1 e b:c = ratio
    const worldPoints = [[0, 1], [1, 1], [1 + ratio, 1]];

    //vetor diretor da reta
    const lineDir = [pointC[0] - pointA[0], pointC[1] - pointA[1]];

    const imgPoints = [
        [numerical.projectToLineScalar(pointA, pointA, pointC), 1],
        [numerical.projectToLineScalar(pointB, pointA, pointC), 1],
        [numerical.projectToLineScalar(pointC, pointA, pointC), 1]
    ];

    //estima a homografia 1D entre pontos do mundo e da imagem
    const H1D = computeH1D(worldPoints, imgPoints);
    if (!H1D) return null;

    //o ponto de fuga é obtido projetando para o infinito via H1D
    const vImgScalar = H1D[0][0] / H1D[1][0];

    return [
        pointA[0] + vImgScalar * lineDir[0],
        pointA[1] + vImgScalar * lineDir[1],
        1
    ];
}

function computeH1D(worldPts, imgPts) {
    //extrai as coordenadas x do mundo e da imagem
    const X = worldPts.map(p => p[0]);
    const x = imgPts.map(p => p[0]);

    //monta o sistema linear A·h = b
    const A = [
        [X[0], 1, -x[0] * X[0]],
        [X[1], 1, -x[1] * X[1]],
        [X[2], 1, -x[2] * X[2]],
    ];
    const b = [x[0], x[1], x[2]];

    //checa se A é inversíve
    const detA = math.det(A);
    if (Math.abs(detA) < EPSILON) {
        alert("Matriz nao inversível em computeH1D");
        return null;
    }

    //troca coluna de uma matriz por um vetor
    const replaceColumn = (m, colIdx, vec) =>
        m.map((row, i) =>
            row.map((val, j) => (j === colIdx ? vec[i] : val))
        );

    // resolve os coeficientes da homografia por regra de Cramer
    const h00 = math.det(replaceColumn(A, 0, b)) / detA;
    const h01 = math.det(replaceColumn(A, 1, b)) / detA;
    const h10 = math.det(replaceColumn(A, 2, b)) / detA;

    //retorna matriz 2x2 representando homografia 1D
    return [[h00, h01], [h10, 1]];
}