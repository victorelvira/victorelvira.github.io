<!--
Encuestas históricas (pestaña Encuestas históricas). Cómo se escribe: textos/README.md.

Cifras disponibles en la parte principal:
  {elecciones}         elecciones con encuestas en la tabla de aciertos (desde 1977)

Huecos [[...]]: gráficos, tablas y controles que dibuja el código.

Partes con nombre (se pintan aparte, a veces al cambiar un selector):
  === eleccion ===       la nota bajo "Elección a elección", cambia con la elección elegida
      {encuestadoras} casas con encuesta final, {error_media} error medio de la media de encuestas,
      {error_cis} la frase del error de la intención directa del CIS (vacía si no hay dato)
  === salto ===          la nota bajo los gráficos de "El salto final"
  === nota_ciclo ===     la frase junto al selector de elección pasada
      {ciclo} fecha de la elección, {encuestas} encuestas del ciclo, {desde} fecha de la primera
  === errores_intro ===      la frase bajo "Error por casa", encima de los gráficos
  === errores_industria ===  el rótulo del gráfico del error de la industria por partido
  === errores_casas ===      el rótulo del gráfico del error medio de cada casa
  === errores_patron ===     el rótulo de los gráficos pequeños (cada casa con un partido)
  === errores_nota ===       la línea de advertencias al final
      En las cinco: {tipo} tipo de elección elegido (generales, autonómicas, europeas), {n_elecciones} elecciones
      de ese tipo, {min} elecciones mínimas para entrar en la lista, {casas} casas en la lista,
      {total_casas} casas con alguna encuesta final

No hay condiciones (::: si ...) en esta página.
-->
# Encuestas históricas

[[índice]]

## Las encuestas en el pasado {#pasado | Las encuestas en el pasado}

### Cualquier elección general desde 1982 {#ciclos | Desde 1982}

[[chart-hist]]

### Elección a elección {#eleccion | Elección a elección}

[nota] La última encuesta de cada casa en el mes anterior, frente al resultado. Barra: de la más baja a la más alta; punto: su media; rombo: intención directa del CIS, sin cocinar; raya negra: resultado.

[[eleccion]]

### El salto final {#salto | El salto final}

[nota] Los últimos cuatro meses del promedio en cada general y, al final, el resultado (rayas); al lado, cuánto se equivocaron las encuestas. Las líneas llegan planas: el error no está en la tendencia sino en el nivel.

[[salto]]

### Quién acierta {#aciertos | Quién acierta}

[nota] Error de la última encuesta de cada casa en {elecciones} elecciones desde 1977 (generales, autonómicas y europeas), y cuánto mejor (−) o peor (+) que las demás casas en las mismas elecciones. Casas con 10 o más elecciones.

[[aciertos]]

### ¿Han mejorado?

[nota] Error de la media de las encuestas finales en cada elección, en puntos por partido.

[[errhist]]

### Error por casa {#errores | Error por casa}

[[errores]]

::: metodología #metodo
**Aciertos.** Para cada elección, la última encuesta de cada casa publicada entre 1 y 35 días antes; error = media de las diferencias absolutas con el resultado en los partidos con un 3% o más. "Frente al resto" compara a cada casa con las demás en las mismas elecciones y descuenta la antelación. El salto final se mide con la media de las encuestas de las dos últimas semanas.

**Error por casa.** Para cada elección (generales desde 1986; autonómicas y europeas desde 2018), la última encuesta de cada casa terminada entre 1 y 21 días antes, con su estimación publicada (cocinada). Fuera quedan las reestimaciones de datos del CIS hechas por terceros y las encuestas encargadas por partidos: no son muestras independientes. El CIS cuenta como dos casas, antes y después de su cambio de método de 2018, igual que en "Quién acierta". Error = encuesta menos resultado, en puntos, en cada partido con un 3% o más del voto que la encuesta publica. El error de la industria es la media de las casas en cada elección y partido; lo que una casa se aparta de esa media, siempre hacia el mismo lado, es su efecto de casa. El error medio de una casa es la media, sobre sus elecciones, del error absoluto medio de sus partidos.
:::

=== eleccion ===

[nota] {encuestadoras} encuestadoras · error medio de la media de encuestas: **{error_media} puntos**{error_cis}

=== salto ===

[nota] Junto a cada raya: resultado menos encuestas, en puntos (+ = las encuestas se quedaron cortas). Partidos con un 3% o más; escala común (0-50%).

=== nota_ciclo ===

Generales del {ciclo}: {encuestas} encuestas desde {desde}; el resultado, marcado al final.

=== errores_intro ===

[nota] La última encuesta de cada casa en las tres semanas anteriores a cada elección ({tipo}: {n_elecciones}), frente al resultado: encuesta menos resultado, en puntos. Por encima de 0, la casa sobreestimó al partido; por debajo, lo subestimó.

=== errores_industria ===

**Error de la industria, partido a partido.** Media de todas las casas en cada elección. Cuando el error se aleja del 0, se equivocaron casi todas hacia el mismo lado: es un error que las encuestas de esa elección no podían ver.

=== errores_casas ===

**Error medio de cada casa.** Puntos por partido, de media, en las {casas} casas con {min} o más elecciones de este tipo (entre paréntesis, cuántas). Toca una barra, o elígela arriba, para seguirla en los tres gráficos.

=== errores_patron ===

**Cada casa con un partido.** Puntos de color: su error en cada elección; línea gris: el error de la industria. Lo que comparte con la línea gris es error de la industria; lo que se aparta de ella, siempre hacia el mismo lado, es su efecto de casa.

=== errores_nota ===

[nota] El CIS entra en pocas elecciones con encuesta en esas tres semanas, y las casas que solo aparecen en elecciones recientes se ordenan con pocos casos.
