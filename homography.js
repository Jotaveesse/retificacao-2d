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

export function applyHomography(sourceCtx, targetCtx, H) {
    const w = sourceCtx.canvas.width;
    const h = sourceCtx.canvas.height;
    const srcData = sourceCtx.getImageData(0, 0, w, h);

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

    for (let j = 0; j < outH; j++) {
        for (let i = 0; i < outW; i++) {
            const warpedX = i * scaleX;
            const warpedY = j * scaleY;
            const v = math.multiply(invH, [warpedX, warpedY, 1]);
            const sx = v[0] / v[2];
            const sy = v[1] / v[2];
            const sx_i = Math.round(sx);
            const sy_i = Math.round(sy);
            const di = (j * outW + i) * 4;

            if (sx_i >= 0 && sx_i < w && sy_i >= 0 && sy_i < h) {
                const si = (sy_i * w + sx_i) * 4;
                dstData.data[di] = srcData.data[si];
                dstData.data[di + 1] = srcData.data[si + 1];
                dstData.data[di + 2] = srcData.data[si + 2];
                dstData.data[di + 3] = srcData.data[si + 3];
            } else {
                dstData.data.fill(255, di, di + 4);
                dstData.data[di + 3] = 255;
            }
        }
    }
    targetCtx.putImageData(dstData, 0, 0);
}
