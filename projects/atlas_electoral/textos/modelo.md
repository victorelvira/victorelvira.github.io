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

No hay condiciones (::: si ...) en esta página.
-->
# Modelo estadístico

[[índice]]

## Predicción <span class="tag-exp">modelo experimental, en revisión</span> {#prediccion | Predicción}

[[pred]]

## Cuánto fiarse {#fiarse}

[[fiarse]]

=== prediccion ===

[sub] Predicción propia para el 29N a partir de las encuestas, con un modelo que añade lo que las encuestas no dicen: el error que la industria ha tenido en cada general desde 1982. Actualizada el {fecha} con {n_encuestas} encuestas.


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

[nota] Modelo A+ del borrador de modelos (docs/modelos): filtro de Kalman por partido, error común casi normal, {simulaciones} simulaciones. Se probó además una capa provincial a partir de los microdatos del CIS y 40dB y de las encuestas autonómicas: mejora el mapa de porcentajes pero no los escaños, así que no se usa. Parámetros: escala del error común {b_escala}·√(p(1−p)); ruido autonómico {s_ccaa}, provincial {s_prov}.
:::

=== sin_prediccion ===

[nota] La predicción del modelo aparecerá aquí.

=== backtest ===

[nota] Probado en las {generales} elecciones generales desde {desde}, rehaciendo el modelo con solo las encuestas que se conocían entonces. Una semana antes, el resultado cayó dentro del rango del 90% en el {voto_7} de los casos para el voto y en el {escanos_7} para los escaños (un mes antes: {voto_30} y {escanos_30}). Fallaron, sobre todo, 2004 (tres días después del 11-M) y Ciudadanos en 2015.

=== fiarse ===

Hemos rehecho el modelo para las {elecciones} elecciones generales desde {desde}, con solo las encuestas que se conocían entonces. Una semana antes, el resultado cayó dentro del rango del 90% en el {acierto_voto}% de los casos en voto y en el {acierto_escanos}% en escaños.

::: si sensibilidad
Esa probabilidad no se conoce con tanta precisión como parece. Si el error conjunto de las encuestas fuera un 50% mayor que el histórico, PP y Vox llegarían a 176 en {error_x15} de cada 100 simulaciones; si fuera un 20% menor, en {error_x08}. Y en esas {elecciones} elecciones el modelo solo dio más del 50% a que la derecha sumara 176 dos veces, así que una cifra tan alta apenas se ha podido poner a prueba.
:::
