import * as numerical from './helper/numerical.js';
import {EPSILON} from './helper/numerical.js';

export function redraw(ctx, { img, imgLoaded, points, method, showLabels }) {
    const { canvas } = ctx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (imgLoaded) {
        const minScale = Math.min(canvas.width / img.width, canvas.height / img.height);

        const newW = img.width * minScale;
        const newH = img.height * minScale;

        // center offsets
        const offsetX = (canvas.width - newW) / 2;
        const offsetY = (canvas.height - newH) / 2;

        ctx.drawImage(img, offsetX, offsetY, newW, newH);
    }

    // desenha linhas
    switch (method) {
        case 'parallel':
            for (let i = 0; i + 1 < points.length; i += 2) {
                const a = points[i], b = points[i + 1];
                drawLine(ctx, a, b, 5, 'rgb(0, 0, 0)');
                drawLine(ctx, a, b, 2, 'rgb(255, 255, 255)');
            }
            break;
        case 'crossratio':
        case 'geometric':
        case 'homography1d':
            for (let i = 0; i + 1 < points.length; i += 1) {
                if (i % 3 === 2) continue;
                const a = points[i], b = points[i + 1];
                drawLine(ctx, a, b, 5, 'rgb(0, 0, 0)');
                drawLine(ctx, a, b, 2, 'rgb(255, 255, 255)');
            }
            break;
        case 'metric':
            for (let i = 0; i + 1 < points.length; i += 1) {
                if (i % 2 === 1) continue;
                const a = points[i], b = points[i + 1];
                drawLine(ctx, a, b, 5, 'rgb(0, 0, 0)');
                drawLine(ctx, a, b, 2, 'rgb(255, 255, 255)');
            }
            break;
        default:
            console.warn('Método de desenho não reconhecido:', method);
            break;
    }

    // desenha pontos
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        drawPoint(ctx, p[0], p[1], 5, 'rgb(0, 0, 0)');
        drawPoint(ctx, p[0], p[1], 3, 'rgb(255, 255, 255)');
        if (showLabels) {
            ctx.miterLimit = 2;
            ctx.font = '16px monospace';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 4;
            ctx.strokeText(String(i), p[0] + 8, p[1] - 8);
            ctx.fillStyle = 'white';
            ctx.fillText(String(i), p[0] + 8, p[1] - 8);
        }
    }
}

export function drawLine(ctx, start, end, lineWidth = 5, color = 'black') {
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.lineTo(end[0], end[1]);
    ctx.strokeStyle = color;
    ctx.stroke();
}

export function drawPoint(ctx, x, y, size = 2, color = 'black') {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
}

export function drawEllipse(ctx, cx, cy, a, b, angle, lineWidth = 2, color = 'black') {
    ctx.beginPath();
    ctx.ellipse(cx, cy, a, b, angle, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

export function drawVanishingVisuals(ctx, v1, v2, l) {
    const [a, b, c] = l;
    const { width, height } = ctx.canvas;
    const pts = [];
    if (Math.abs(b) > EPSILON) { pts.push([0, (-c) / b]); pts.push([width, (-c - a * width) / b]); }
    if (Math.abs(a) > EPSILON) { pts.push([(-c) / a, 0]); pts.push([(-c - b * height) / a, height]); }

    const uniquePts = [];

    for (const p of pts) {
        if (p[0] >= -EPSILON && p[0] <= width + EPSILON && p[1] >= -EPSILON && p[1] <= height + EPSILON) {
            if (!uniquePts.some(up => Math.hypot(p[0] - up[0], p[1] - up[1]) < EPSILON)) {
                uniquePts.push(p);
            }
        }
    }

    if (uniquePts.length >= 2) {
        drawLine(ctx, uniquePts[0], uniquePts[1], 5, 'rgb(0, 0, 0)');
        drawLine(ctx, uniquePts[0], uniquePts[1], 2, 'rgb(255, 255, 255)');
        ctx.beginPath();
        ctx.moveTo(uniquePts[0][0], uniquePts[0][1]);
        ctx.lineTo(uniquePts[1][0], uniquePts[1][1]);
        ctx.strokeStyle = 'rgba(200,120,0,0.95)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

export function applyHomography(sourceCtx, targetCtx, image, H, stretchToFit = false) {
    //largura e altura da imagem original
    const w = sourceCtx.canvas.width;
    const h = sourceCtx.canvas.height;
    const srcData = image;

    // calcula os cantos da imagem transformada usando a homografia H
    const bounds = getTransformedBounds(w, h, H);

    //ajusta a homografia pra que a imagem transformada caiba nos limites calculados
    const H_final = [
        [H[0][0] - bounds.x * H[2][0], H[0][1] - bounds.x * H[2][1], H[0][2] - bounds.x * H[2][2]],
        [H[1][0] - bounds.y * H[2][0], H[1][1] - bounds.y * H[2][1], H[1][2] - bounds.y * H[2][2]],
        [H[2][0], H[2][1], H[2][2]]
    ];

    //tamanho da imagem de saída
    const outW = 900;
    const outH = 600;

    //escalas para mapear os limites da homografia ao tamanho de saída
    var scaleX = bounds.width / outW;
    var scaleY = bounds.height / outH;
    const maxScale = Math.max(scaleX, scaleY);

    if (!stretchToFit) {
        scaleX = maxScale;
        scaleY = maxScale;
    }

    //buffer de saida
    const dstData = targetCtx.createImageData(outW, outH);

    //inverte a homografia para mapear da imagem de saída para a original
    const invH = math.inv(H_final);

    // desestrutura  os elementos da matriz inversa pra otimizar os cálculos dentro do loop
    const m00 = invH[0][0], m01 = invH[0][1], m02 = invH[0][2];
    const m10 = invH[1][0], m11 = invH[1][1], m12 = invH[1][2];
    const m20 = invH[2][0], m21 = invH[2][1], m22 = invH[2][2];

    const source = srcData.data;
    const dest = dstData.data;

    for (let j = 0; j < outH; j++) {
        //coordenada y no espaço da homografia
        const wy = j * scaleY;

        //inicializa as coordenadas transformadas para o início da linha
        let X = m01 * wy + m02;
        let Y = m11 * wy + m12;
        let Z = m21 * wy + m22;

        //incremento que sera aplicado ao mover no eixo x
        const dX = m00 * scaleX;
        const dY = m10 * scaleX;
        const dZ = m20 * scaleX;

        for (let i = 0; i < outW; i++) {
            //normaliza
            const sourceX = X / Z;
            const sourceY = Y / Z;

            // arredonda as coordenadas de forma otimizada
            const sourceXRound = (sourceX + 0.5) | 0;
            const sourceYRound = (sourceY + 0.5) | 0;

            //indice no buffer
            const destIndex = (j * outW + i) * 4;

            //checa se ponto caiu dentro da imagem original
            if (sourceXRound >= 0 && sourceXRound < w && sourceYRound >= 0 && sourceYRound < h) {
                const sourceIndex = (sourceYRound * w + sourceXRound) * 4;

                //copia valores da origem pra destino
                dest[destIndex] = source[sourceIndex];
                dest[destIndex + 1] = source[sourceIndex + 1];
                dest[destIndex + 2] = source[sourceIndex + 2];
                dest[destIndex + 3] = source[sourceIndex + 3];
            } else {    //se cair fora pinta de branco
                dest[destIndex] = dest[destIndex + 1] = dest[destIndex + 2] = 255;
                dest[destIndex + 3] = 255;
            }

            //avança as coordenadas homogeneas para o próximo pixel em x
            X += dX;
            Y += dY;
            Z += dZ;
        }
    }

    targetCtx.putImageData(dstData, 0, 0);
}

function getTransformedBounds(width, height, H) {
    const corners = [
        numerical.transformPoint([0, 0, 1], H),
        numerical.transformPoint([width - 1, 0,1], H),
        numerical.transformPoint([0, height - 1,1], H),
        numerical.transformPoint([width - 1, height - 1,1], H)
    ].filter(p => isFinite(p[0]) && isFinite(p[1]));

    if (corners.length === 0) return { x: 0, y: 0, width: width, height: height };

    const minX = Math.min(...corners.map(p => p[0]));
    const maxX = Math.max(...corners.map(p => p[0]));
    const minY = Math.min(...corners.map(p => p[1]));
    const maxY = Math.max(...corners.map(p => p[1]));

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}