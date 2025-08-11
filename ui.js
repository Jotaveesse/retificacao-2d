import { normalizeHomogPoint } from './math.js';

export function fitCanvas(canvas, warpedWidth, warpedHeight, maxWidth = 900, maxHeight = 600) {
    const ratio = Math.min(maxWidth / warpedWidth, maxHeight / warpedHeight);
    canvas.width = Math.round(warpedWidth * ratio);
    canvas.height = Math.round(warpedHeight * ratio);
}

export function updatePointsList(listElement, points) {
    if (points.length === 0) {
        listElement.textContent = 'Pontos: (nenhum)';
        return;
    }
    listElement.innerHTML = points.map((p, i) => `${i}: (${Math.round(p.x)}, ${Math.round(p.y)})`).join(' | ');
}

export function setInstructions(instructionsElement, method) {
    const instructions = {
        horizon: '<strong>Linha do horizonte:</strong><div>Selecione a linha do horizonte. (2 pontos)</div>',
        parallel: '<strong>Linhas Paralelas:</strong><div>Selecione 2 pares de linhas paralelas no mundo real em direções diferentes. (8 pontos)</div>',
        crossratio3: '<strong>Razão Cruzada Equidistante:</strong><div>Selecione 2 trios de pontos colineares, com distâncias iguais entre si no mundo real. (6 pontos)</div>',
        crossratio4: '<strong>Razão Cruzada:</strong><div>Selecione 2 quartetos de pontos colineares e digite a razão cruzada de cada quarteto no mundo real. (8 pontos).</div>',
        metric: '<strong>Dual Conic (Ellipse):</strong><div>Seleciones 5 pares de retas ortogonais entre si no mundo real. (10 pontos)</div>'
    };
    instructionsElement.innerHTML = instructions[method] || '';
}

function drawLine(ctx, start, end, lineWidth = 5, color = 'black') {
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = color;
    ctx.stroke();
}

export function redraw(ctx, { img, imgLoaded, points, method, showLabels }) {
    const { canvas } = ctx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (imgLoaded) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    // desenha linhas
    if (method === 'parallel') {
        for (let i = 0; i + 1 < points.length; i += 2) {
            const a = points[i], b = points[i + 1];

            drawLine(ctx, a, b, 5, 'rgb(0, 0, 0)');
            drawLine(ctx, a, b, 2, 'rgb(255, 255, 255)');
        }
    } else if (method === 'horizon' && points.length >= 2) {
        const [a, b] = points;
        drawLine(ctx, a, b, 5, 'rgb(0, 0, 0)');
        drawLine(ctx, a, b, 2, 'rgb(255, 255, 255)');

    } else if (method === 'crossratio3') {
        for (let i = 0; i + 1 < points.length; i += 1) {
            if (i % 3 === 2) continue;
            const a = points[i], b = points[i + 1];

            drawLine(ctx, a, b, 5, 'rgb(0, 0, 0)');
            drawLine(ctx, a, b, 2, 'rgb(255, 255, 255)');
        }

    } else if (method === 'crossratio4') {
        for (let i = 0; i + 1 < points.length; i += 1) {
            if (i % 4 === 3) continue;
            const a = points[i], b = points[i + 1];

            drawLine(ctx, a, b, 5, 'rgb(0, 0, 0)');
            drawLine(ctx, a, b, 2, 'rgb(255, 255, 255)');
        }
    } else if (method === 'metric') {
        for (let i = 0; i + 1 < points.length; i += 1) {
            if (i % 2 === 1) continue;
            const a = points[i], b = points[i + 1];

            drawLine(ctx, a, b, 5, 'rgb(0, 0, 0)');
            drawLine(ctx, a, b, 2, 'rgb(255, 255, 255)');
        }
    }

    // desenha pontos
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fill();
        if (showLabels) {
            ctx.miterLimit = 2;
            ctx.font = '16px monospace';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 4;
            ctx.strokeText(String(i), p.x + 8, p.y - 8);
            ctx.fillStyle = 'white';
            ctx.fillText(String(i), p.x + 8, p.y - 8);
        }
    }

}

export function drawVanishingVisuals(ctx, v1, v2, l) {
    if (v1 && Math.abs(v1[2]) > 1e-9) {
        const p = normalizeHomogPoint(v1);
        ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, Math.PI * 2); ctx.fill();
    }
    if (v2 && Math.abs(v2[2]) > 1e-9) {
        const p = normalizeHomogPoint(v2);
        ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, Math.PI * 2); ctx.fill();
    }

    const [a, b, c] = l;
    const { width, height } = ctx.canvas;
    const pts = [];
    if (Math.abs(b) > 1e-6) { pts.push([0, (-c) / b]); pts.push([width, (-c - a * width) / b]); }
    if (Math.abs(a) > 1e-6) { pts.push([(-c) / a, 0]); pts.push([(-c - b * height) / a, height]); }

    const uniquePts = [];
    const epsilon = 1e-3;
    for (const p of pts) {
        if (p[0] >= -epsilon && p[0] <= width + epsilon && p[1] >= -epsilon && p[1] <= height + epsilon) {
            if (!uniquePts.some(up => Math.hypot(p[0] - up[0], p[1] - up[1]) < epsilon)) {
                uniquePts.push(p);
            }
        }
    }

    if (uniquePts.length >= 2) {

        drawLine(ctx, { x: uniquePts[0][0], y: uniquePts[0][1] }, { x: uniquePts[1][0], y: uniquePts[1][1] }, 5, 'rgb(0, 0, 0)');
        drawLine(ctx, { x: uniquePts[0][0], y: uniquePts[0][1] }, { x: uniquePts[1][0], y: uniquePts[1][1] }, 2, 'rgb(255, 255, 255)');
        ctx.beginPath();
        ctx.moveTo(uniquePts[0][0], uniquePts[0][1]);
        ctx.lineTo(uniquePts[1][0], uniquePts[1][1]);
        ctx.strokeStyle = 'rgba(200,120,0,0.95)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}