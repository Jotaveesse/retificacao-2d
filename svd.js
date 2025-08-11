import * as numerical from './math.js';
export function svd(A) {
    let transposed = false;
    let M = A.length; 
    let N = A[0].length;
    let A_proc = A;

    if (M < N) {
        A_proc = math.transpose(A);
        transposed = true;
    }

    const svdResult = SVDJS.SVD(A_proc);

    if (!transposed) {
        return svdResult;
    } else {

        const U_t = math.transpose(svdResult.u);
        const V_t = math.transpose(svdResult.v);
        const U_t_full = completeOrthonormalBasis(U_t, 6); //preenche a linhas faltantes com base ortonormal

        return {
            u: V_t,          // V original se torna U
            q: svdResult.q,
            v: U_t_full        // U original se torna V
        };
    }
}

function completeOrthonormalBasis(partialBasis, dim) {
    const k = partialBasis.length;
    const basis = partialBasis.map(v => v.slice());

    // orthonormalizacao de Gram-Schmidt 
    for (let i = 0; i < k; i++) {
        for (let j = 0; j < i; j++) {
            basis[i] = numerical.projSubtract(basis[i], basis[j]);
        }
        basis[i] = numerical.normalize(basis[i]);
    }

    for (let i = k; i < dim; i++) {
        let v = new Array(dim).fill(0).map(() => Math.random());

        for (let j = 0; j < i; j++) {
            v = numerical.projSubtract(v, basis[j]);
        }
        v = numerical.normalize(v);
        basis.push(v);
    }
    return basis;
}
