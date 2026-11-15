<!--
Modelo estadístico (pestaña Modelo). Cómo se escribe: textos/README.md.

Huecos [[...]]: gráficos y tablas que dibuja el código. [[pred]] es el sitio del bloque de la predicción;
el histograma [[histograma]] usa los bloques de partida (los resultados principales están en la portada).

Partes con nombre (se pintan aparte):
  === prediccion ===     el bloque de la predicción, cuando hay prediccion.json
      {fecha} día de la actualización, {n_encuestas} encuestas usadas, {simulaciones} número de simulaciones,
      {pp_primero} probabilidad de que el PP quede primero, {b_escala} {s_ccaa} {s_prov} parámetros del modelo
  === sin_prediccion === lo que se ve si no hay predicción
  === backtest ===       el párrafo de "¿Acierta?"
      {generales} elecciones generales probadas, {desde} año de la primera, {voto_7} {escanos_7} % dentro
      del rango del 90% una semana antes (voto, escaños), {voto_30} {escanos_30} lo mismo un mes antes
  === glosario ===       el desplegable "Glosario" al final de la página (sin cifras); la versión técnica es docs/glosario.md
  === fotos ===          el desplegable "Fotos de los candidatos" (créditos); [[lista_fotos]] es la lista de cada foto con su
      autor y su licencia, sacada de data/lideres.json (pipeline/lideres.py)

No hay condiciones (::: si ...) en esta página.
-->
# Modelo estadístico

[[índice]]

## Predicción <span class="tag-exp">modelo experimental, en revisión</span> {#prediccion | Predicción}

[[pred]]

## Cuánto fiarse {#fiarse}

[[fiarse]]

## {#glosario | Glosario}

[[glosario]]

## {#fotos | Fotos}

[[fotos]]

=== prediccion ===

[sub] Predicción del modelo que publicábamos hasta ahora (K0; la portada muestra por defecto la media de siete modelos). Parte de las encuestas y añade lo que las encuestas no dicen: el error que la industria ha tenido en cada general desde 1982. Actualizada el {fecha} con {n_encuestas} encuestas.


### Voto y escaños por partido

[[tabla_partidos]]

### Escaños de cada grupo en las {simulaciones} simulaciones

[[histograma]]

[nota] Probabilidad de que el PP sea el partido con más escaños: **{pp_primero}**.

### Cómo ha cambiado

[nota] Cada semana, con solo las encuestas publicadas hasta entonces.

::: rejilla
<div>
#### Probabilidad de que PP, Vox y SALF lleguen a 176
[[serie_probabilidad]]
</div>
<div>
#### Escaños por partido (mediana)
[[serie_escanos]]
</div>
:::

### ¿Acierta?

[[pred-bt]]

::: metodología
**Qué hace.** Para cada partido (PP, PSOE, Vox, Frente Amplio, Podemos, SALF, ERC, Junts, Bildu y PNV) sigue día a día su apoyo con un filtro que combina todas las encuestas del ciclo, descontando a cada casa su desviación habitual (con lo que hizo en 2023 como punto de partida). Eso da el nivel de hoy y su incertidumbre.

**Lo que las encuestas no saben.** El día de la votación se añade el error común de la industria: lo que se equivocó este mismo filtro, con todas las encuestas, en cada general desde 1982, en una dirección que no se puede saber de antemano. Se simula con la escala y las correlaciones entre partidos medidas en esas elecciones (la derecha se mueve junta; derecha e izquierda, en sentidos opuestos).

**Escaños.** Cada simulación de voto nacional se lleva a las provincias como en el simulador, con un ruido extra por comunidad y por provincia calibrado con 1977-2023, y se reparten los escaños con D'Hondt. Las horquillas recogen el 90% de las simulaciones.

[nota] Modelo K0, el que publicábamos hasta ahora (especificación en docs/modelos/especificacion/K0.md): filtro de Kalman por partido, error común casi normal, {simulaciones} simulaciones. Se probó además una capa provincial a partir de los microdatos del CIS y 40dB y de las encuestas autonómicas: mejora el mapa de porcentajes pero no los escaños, así que no se usa. Parámetros: escala del error común {b_escala}·√(p(1−p)); ruido autonómico {s_ccaa}, provincial {s_prov}.
:::

=== sin_prediccion ===

[nota] La predicción del modelo aparecerá aquí.

=== backtest ===

[nota] Probado en las {generales} elecciones generales desde {desde}, rehaciendo el modelo con solo las encuestas que se conocían entonces. Una semana antes, el resultado cayó dentro del rango del 90% en el {voto_7} de los casos para el voto y en el {escanos_7} para los escaños (un mes antes: {voto_30} y {escanos_30}). Fallaron, sobre todo, 2004 (tres días después del 11-M) y Ciudadanos en 2015.

=== fiarse ===

Hemos rehecho el modelo que publicábamos hasta ahora (K0) para las {elecciones} elecciones generales desde {desde}, con solo las encuestas que se conocían entonces. Una semana antes, el resultado cayó dentro de su rango (el que recoge 9 de cada 10 simulaciones) en {acierto_voto} de cada 100 casos en voto y en {acierto_escanos} de cada 100 en escaños. La media de siete modelos que la portada muestra por defecto no se ha probado así como tal.

::: si sensibilidad
La probabilidad de mayoría no se conoce con tanta precisión como parece. En K0, si el error conjunto de las encuestas fuera un 50% mayor que el histórico, PP y Vox llegarían a 176 en {error_x15} de cada 100 simulaciones; si fuera un 20% menor, en {error_x08}. Y en esas {elecciones} elecciones el modelo solo dio más del 50% a que la derecha sumara 176 dos veces, así que una cifra tan alta apenas se ha podido poner a prueba.
:::

=== glosario ===

::: plegable "Glosario"
**Cocina.** Lo que publica una encuestadora no es lo que contestan sus entrevistados: la casa pondera las respuestas, reparte a los indecisos y estima quién irá a votar. El resultado es la estimación «cocinada», la única cifra que usan nuestros modelos.

**Intención directa.** Lo que responden los entrevistados, sin cocinar: el partido que nombran sobre el total de la muestra, con indecisos y abstención.

**Tracking acumulado.** Una encuesta que publica cada pocos días con la misma fecha de inicio y una muestra que crece. Para no contar dos veces a las mismas personas, el modelo usa solo las entrevistas nuevas de cada entrega, o solo la última.

**Error de muestreo.** Lo que una encuesta se desvía por haber preguntado a unas pocas personas al azar y no a todas. Es mayor cuanto más pequeña es la muestra y se compensa al juntar muchas encuestas.

**Efecto de casa.** La tendencia de una encuestadora a dar a un partido más o menos que el resto de las encuestadoras, encuesta tras encuesta. Se mide comparando con las demás casas, no con el resultado, y el modelo publicado lo descuenta.

**Error de la industria.** Lo que se equivocan todas las encuestas a la vez, el mismo día y en la misma dirección. Las encuestas de esa elección no pueden verlo, así que el modelo lo añade a ciegas, con el tamaño que ha tenido en las generales desde 1982.

**Promedio de encuestas.** El modelo publicado sigue día a día el apoyo de cada partido con un filtro que da más peso a las encuestas recientes y con más muestra. Las encuestas antiguas pesan menos, pero no desaparecen de golpe.

**Simulación.** Una de las 4.000 elecciones posibles que el modelo imagina: un resultado nacional, su reparto por provincias y los escaños que salen. Todas las probabilidades de la web cuentan simulaciones.

**«9 de cada 10».** Contamos la incertidumbre como frecuencias: «en 9 de cada 10 simulaciones» quiere decir que ese resultado sale en 9 de cada 10 de esas elecciones imaginadas.

**Rango.** La franja (o horquilla) que recoge 9 de cada 10 simulaciones: deja fuera la que sale más baja de cada 20 y la más alta de cada 20.

**Mayoría absoluta.** 176 de los 350 diputados. La probabilidad de que un grupo la alcance es cuántas simulaciones de cada 100 llegan a 176.

**Partidos que se mueven juntos.** En las simulaciones el error no es independiente para cada partido: lo que gana PP suele ir con lo que gana Vox, y lo que gana la derecha lo pierde la izquierda, como ha pasado en las elecciones anteriores.

**Del voto nacional a las provincias.** Cada partido parte de su voto en 2023 en cada provincia (los nuevos, de las europeas de 2024) y sube o baja en la misma proporción que en toda España, con un margen extra por comunidad y por provincia.

**D'Hondt y el 3%.** La regla de reparto de escaños en cada provincia. Las candidaturas con menos del 3% de los votos válidos de la provincia no entran en el reparto.

**Escaño en el aire.** Un escaño que ningún partido gana en al menos 9 de cada 10 simulaciones. El resto se dan por decididos.

**Familia de modelos.** Modelos con la misma idea de fondo: los filtros que descuentan el efecto de casa (K), la calidad de las casas (C), las elecciones autonómicas, europeas y municipales en el reparto por provincias (R), la media simple (M), las reglas de El País (L), las de POLITICO (P) y las de otros agregadores (E).

**Media de modelos.** Lo que muestra la portada por defecto: siete modelos, uno por familia, con el mismo peso. No elegimos uno solo porque 13 elecciones generales no bastan para saber cuál acierta más.

**Rehacer el pasado.** Para saber cuánto fiarse, el modelo se vuelve a correr en cada general desde 1986 con solo las encuestas que se conocían entonces, y se compara con lo que salió.
:::

=== fotos ===

::: plegable "Fotos de los candidatos"
Junto a cada partido sale la foto de quien encabeza su candidatura al Congreso el 29N, según las listas proclamadas en el BOE: en los partidos que se presentan en toda España, la cabeza de lista por Madrid (en el Frente Amplio, su candidata a la presidencia, Ada Colau, que encabeza la lista por Barcelona); en los demás, la de su provincia principal. Las fotos vienen de Wikimedia Commons, con licencias libres; estos son sus autores y licencias. Donde no hay una foto libre, salen las iniciales.

[[lista_fotos]]
:::
