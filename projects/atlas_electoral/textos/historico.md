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

::: metodología #metodo
**Aciertos.** Para cada elección, la última encuesta de cada casa publicada entre 1 y 35 días antes; error = media de las diferencias absolutas con el resultado en los partidos con un 3% o más. "Frente al resto" compara a cada casa con las demás en las mismas elecciones y descuenta la antelación. El salto final se mide con la media de las encuestas de las dos últimas semanas.
:::

=== eleccion ===

[nota] {encuestadoras} encuestadoras · error medio de la media de encuestas: **{error_media} puntos**{error_cis}

=== salto ===

[nota] Junto a cada raya: resultado menos encuestas, en puntos (+ = las encuestas se quedaron cortas). Partidos con un 3% o más; escala común (0-50%).

=== nota_ciclo ===

Generales del {ciclo}: {encuestas} encuestas desde {desde}; el resultado, marcado al final.
