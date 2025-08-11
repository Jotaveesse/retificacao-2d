export function lineFromPoints(p1, p2) {
    return [p1.y - p2.y, p2.x - p1.x, p1.x * p2.y - p2.x * p1.y];
    
}

export function normalize(v) {
    const mag = Math.hypot(...v);
    if (mag < 1e-9) return v;
    return v.map(c => c / mag);
}

export function normalizeHomogPoint(pt) {
    if (Math.abs(pt[2]) < 1e-9) return null;
    return [pt[0] / pt[2], pt[1] / pt[2], 1];
}

export function multiplyMatVec(M, v) {
    return [
        M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
        M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
        M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]
    ];
}

export function projectToLineScalar(p, lineStart, lineEnd) {
    const vx = lineEnd[0] - lineStart[0];
    const vy = lineEnd[1] - lineStart[1];
    const lenSquared = vx*vx + vy*vy;
    const px = p[0] - lineStart[0];
    const py = p[1] - lineStart[1];
    return (px * vx + py * vy) / lenSquared;
}

export function crossRatio(a, b, c, d) {
    return ((a - c) * (b - d)) / ((a - d) * (b - c));
}

export function projSubtract(v, u) {
        const dp = math.dot(v, u);
        return v.map((x, i) => x - dp * u[i]);
    }