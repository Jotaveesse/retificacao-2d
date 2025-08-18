import * as svd from '../helper/svd.js';

export function getMetricHomography(points) {
    const linesPairs = [];
    for (let i = 0; i < points.length - 3; i += 4) {
        const lineL = math.cross(points[i], points[i + 1]);
        const lineM = math.cross(points[i + 2], points[i + 3]);

        linesPairs.push([lineL, lineM]);
    }

    let H = extractMetricHomography(linesPairs);
    return H;
}

function extractMetricHomography(linePairs) {
    // monta o sistema de equações lineares da restrição de ortogonalidade:
    const A = linePairs.map(([l, m]) => [
        l[0] * m[0],
        0.5 * (l[0] * m[1] + l[1] * m[0]),
        l[1] * m[1],
        0.5 * (l[0] * m[2] + l[2] * m[0]),
        0.5 * (l[1] * m[2] + l[2] * m[1]),
        l[2] * m[2]
    ]);

    //resolve via SVD
    const svdResult = svd.svd(A);
    const V = svdResult.v;
    const lastColIndex = V.length - 1;
    const sol = V[lastColIndex];

    //reconstrói a matriz simétrica da IAC
    let imDCCP = [
        [sol[0], sol[1] / 2, sol[3] / 2],
        [sol[1] / 2, sol[2], sol[4] / 2],
        [sol[3] / 2, sol[4] / 2, sol[5]]
    ];

    //força a simetria exata da matriz
    for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++) {
            const avg = (imDCCP[i][j] + imDCCP[j][i]) / 2;
            imDCCP[i][j] = avg;
            imDCCP[j][i] = avg;
        }
    }

    //decompõe a IAC por SVD para extrair a matriz de retificação
    const svd2 = svd.svd(imDCCP);
    const u = svd2.u; 
    const q = svd2.q;

    //fixa o último autovalor como 1
    q[2] = 1.0;

    //constrói matriz quadrada das raízes dos autovalores
    const sqrtS = math.diag(q.map(x => Math.sqrt(x)));
    //multiplica pelos autovetores
    const A_rect = math.multiply(u, sqrtS);

    return math.inv(A_rect);
}
