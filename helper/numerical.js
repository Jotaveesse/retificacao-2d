export const EPSILON = 1e-12;

export function intersectLines(line1, line2) {
    const [a1, b1, c1] = line1;
    const [a2, b2, c2] = line2;
    const det = a1 * b2 - a2 * b1;
    if (Math.abs(det) < EPSILON) return null; // paralelas
    const x = (b1 * c2 - b2 * c1) / det;
    const y = (c1 * a2 - c2 * a1) / det;
    return [x, y];
}

export function parallelThroughPoint(line, point) {
    const [a, b] = line;
    const dir = [-b, a];
    const q = [point[0] + dir[0], point[1] + dir[1], 1];
    return math.cross(point, q);
}

export function normalize(v) {
    const mag = Math.hypot(...v);
    if (mag < EPSILON) return v;
    return v.map(c => c / mag);
}

export function normalizeHomogPoint(point) {
    if (Math.abs(point[2]) < EPSILON) return null;
    return [point[0] / point[2], point[1] / point[2], 1];
}

export function projectToLineScalar(point, lineStart, lineEnd) {
    const vx = lineEnd[0] - lineStart[0];
    const vy = lineEnd[1] - lineStart[1];
    const lenSquared = vx * vx + vy * vy;
    const px = point[0] - lineStart[0];
    const py = point[1] - lineStart[1];
    return (px * vx + py * vy) / lenSquared;
}

export function crossRatio(a, b, c, d) {
    return ((a - c) * (b - d)) / ((a - d) * (b - c));
}

export function projSubtract(v, u) {
    const dp = math.dot(v, u);
    return v.map((x, i) => x - dp * u[i]);
}

export function transformPoint(point, H) {
    const v = math.multiply(H, point);
    if (Math.abs(v[2]) < EPSILON) return [Infinity, Infinity, 1];
    return [v[0] / v[2], v[1] / v[2], 1];
}

export function homographyFromVanishingLine(l_inf) {
    const [l1, l2, l3] = l_inf;
    if (Math.abs(l3) < EPSILON) {
        console.warn("Imagem já é afim, retornando matrix identidade");
        return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    }
    return [
        [1, 0, 0],
        [0, 1, 0],
        [l1 / l3, l2 / l3, 1]
    ];
}