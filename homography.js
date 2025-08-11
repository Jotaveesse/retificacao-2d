import { fitCanvas } from './ui.js';

export function buildAffineHFromVanishingLine(l_inf) {
    const [l1, l2, l3] = l_inf;
    if (Math.abs(l3) < 1e-9) {
        console.warn("Imagem já é afim, retornando matrix identidade");
        return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    }
    return [
        [1, 0, 0],
        [0, 1, 0],
        [l1 / l3, l2 / l3, 1]
    ];
}

function getTransformedPoint(i, j, H) {
    const v = math.multiply(H, [i, j, 1]);
    if (Math.abs(v[2]) < 1e-9) return { x: Infinity, y: Infinity };
    return { x: v[0] / v[2], y: v[1] / v[2] };
}

function getTransformedBounds(width, height, H) {
    const corners = [
        getTransformedPoint(0, 0, H),
        getTransformedPoint(width - 1, 0, H),
        getTransformedPoint(0, height - 1, H),
        getTransformedPoint(width - 1, height - 1, H)
    ].filter(p => isFinite(p.x) && isFinite(p.y));

    if (corners.length === 0) return { x: 0, y: 0, width: width, height: height };

    const minX = Math.min(...corners.map(p => p.x));
    const maxX = Math.max(...corners.map(p => p.x));
    const minY = Math.min(...corners.map(p => p.y));
    const maxY = Math.max(...corners.map(p => p.y));

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function applyHomography(sourceCtx, targetCtx, image, H) {
    const w = sourceCtx.canvas.width;
    const h = sourceCtx.canvas.height;
    // const srcData = sourceCtx.getImageData(0, 0, w, h);
    const srcData = image;

    const bounds = getTransformedBounds(w, h, H);

    const T = [[1, 0, -bounds.x], [0, 1, -bounds.y], [0, 0, 1]];
    const H_final = [
        [H[0][0] - bounds.x * H[2][0], H[0][1] - bounds.x * H[2][1], H[0][2] - bounds.x * H[2][2]],
        [H[1][0] - bounds.y * H[2][0], H[1][1] - bounds.y * H[2][1], H[1][2] - bounds.y * H[2][2]],
        [H[2][0], H[2][1], H[2][2]]
    ];

    fitCanvas(targetCtx.canvas, bounds.width, bounds.height);

    const outW = targetCtx.canvas.width;
    const outH = targetCtx.canvas.height;
    const scaleX = bounds.width / outW;
    const scaleY = bounds.height / outH;

    const dstData = targetCtx.createImageData(outW, outH);
    const invH = math.inv(H_final);

    const m00 = invH[0][0], m01 = invH[0][1], m02 = invH[0][2];
    const m10 = invH[1][0], m11 = invH[1][1], m12 = invH[1][2];
    const m20 = invH[2][0], m21 = invH[2][1], m22 = invH[2][2];

    const src = srcData.data;
    const dst = dstData.data;

    for (let j = 0; j < outH; j++) {
        const wy = j * scaleY;

        let X = m01 * wy + m02;
        let Y = m11 * wy + m12;
        let Z = m21 * wy + m22;

        const dX = m00 * scaleX;
        const dY = m10 * scaleX;
        const dZ = m20 * scaleX;

        for (let i = 0; i < outW; i++) {
            const sx = X / Z;
            const sy = Y / Z;

            const sx_i = (sx + 0.5) | 0;    //arrendonda de modo rapido
            const sy_i = (sy + 0.5) | 0;

            const di = (j * outW + i) * 4;

            if (sx_i >= 0 && sx_i < w && sy_i >= 0 && sy_i < h) {
                const si = (sy_i * w + sx_i) * 4;
                dst[di] = src[si];
                dst[di + 1] = src[si + 1];
                dst[di + 2] = src[si + 2];
                dst[di + 3] = src[si + 3];
            } else {
                dst[di] = dst[di + 1] = dst[di + 2] = 255;
                dst[di + 3] = 255;
            }

            // incrementa pra proximo pixel
            X += dX;
            Y += dY;
            Z += dZ;
        }
    }
    targetCtx.putImageData(dstData, 0, 0);
}

