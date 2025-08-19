import * as canvas from '../canvas.js';
import * as numerical from '../helper/numerical.js';

export function getVanishingDataParallel(points, state = null) {
    const v1 = findVanishingPointParallel(points[0], points[1], points[2], points[3], state.showExtraLines1 ? state.inputCtx : null);
    const v2 = findVanishingPointParallel(points[4], points[5], points[6], points[7], state.showExtraLines2 ? state.inputCtx : null);
    
    const lineInf = math.cross(v1, v2);

    if (state && state.showExtraLines1 && state.showExtraLines2) {
        canvas.drawLineHomog(state.inputCtx, lineInf, 1, 'DarkOrange');
    }

    return { lineInf: lineInf, v1, v2 };
}

function findVanishingPointParallel(pointA, pointB, pointC, pointD, ctx = null) {
    const line1 = math.cross(pointA, pointB);
    const line2 = math.cross(pointC, pointD);

    const intersection = numerical.normalizeHomogPoint(math.cross(line1, line2));

    if (ctx) {
        canvas.drawLineHomog(ctx, line1, 1, 'MediumSeaGreen ');
        canvas.drawLineHomog(ctx, line2, 1, 'MediumSeaGreen ');
        canvas.drawPoint(ctx, intersection[0], intersection[1], 5, 'MediumSeaGreen');
    }

    return intersection;
}
