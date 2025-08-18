export function getVanishingDataParallel(points) {
    const v1 = findVanishingPointParallel(points[0], points[1], points[2], points[3]);
    const v2 = findVanishingPointParallel(points[4], points[5], points[6], points[7]);
    
    const lineInf = math.cross(v1, v2);

    return { lineInf: lineInf, v1, v2 };
}

function findVanishingPointParallel(pointA, pointB, pointC, pointD) {
    const line1 = math.cross(pointA, pointB);
    const line2 = math.cross(pointC, pointD);
    
    const intersection = math.cross(line1, line2);
    return [intersection[0] / intersection[2], intersection[1] / intersection[2], 1];
}
