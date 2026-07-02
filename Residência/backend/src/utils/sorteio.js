export function sortearAleatorio(
  jogadores,
  numTimes,
  jogadoresPorTime
) {
  const embaralhados = [...jogadores].sort(
    () => Math.random() - 0.5
  );

  const times = Array.from(
    { length: numTimes },
    () => []
  );

  for (let i = 0; i < embaralhados.length; i++) {
    const timeIndex = i % numTimes;

    if (
      times[timeIndex].length <
      jogadoresPorTime
    ) {
      times[timeIndex].push(
        embaralhados[i]
      );
    }
  }

  return times;
}

export function sortearBalanceado(
  jogadores,
  numTimes,
  jogadoresPorTime
) {
  const ordenados = [...jogadores].sort(
    (a, b) =>
      b.nivel_estrelas - a.nivel_estrelas
  );

  const times = Array.from(
    { length: numTimes },
    () => ({
      jogadores: [],
      soma: 0
    })
  );

  for (const jogador of ordenados) {
    const time = times
      .filter(
        t =>
          t.jogadores.length <
          jogadoresPorTime
      )
      .sort((a, b) => a.soma - b.soma)[0];

    if (!time) break;

    time.jogadores.push(jogador);

    time.soma +=
      jogador.nivel_estrelas;
  }

  return times;
}