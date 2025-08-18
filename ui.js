export function updatePointsList(listElement, points) {
    if (points.length === 0) {
        listElement.textContent = 'Pontos: (nenhum)';
        return;
    }
    listElement.innerHTML = points
        .map((p, i) => `${i}: (${Math.round(p[0])}, ${Math.round(p[1])})`)
        .join(' | ');
}

export function setInstructions(instructionsElement, method) {
    const instructions = {
        parallel: '<strong>Linhas Paralelas:</strong><div>Selecione 2 pares de linhas paralelas no mundo real em direções diferentes. (8 pontos)</div>',
        homography1d: '<strong>Homografia 1D:</strong><div>Selecione 2 trios de pontos colineares, e informe a razão de BC/AB. (6 pontos)</div>',
        crossratio: '<strong>Razão Cruzada:</strong><div>Selecione 2 trios de pontos colineares, e informe a razão de BC/AB. (6 pontos).</div>',
        geometric: '<strong>Geométrica:</strong><div>Selecione 2 trios de pontos colineares, e informe a razão de BC/AB. (6 pontos)</div>',
        metric: '<strong>Métrica:</strong><div>Seleciones 5 pares de retas ortogonais entre si no mundo real. (10 pontos)</div>'
    };
    instructionsElement.innerHTML = instructions[method] || '';
}