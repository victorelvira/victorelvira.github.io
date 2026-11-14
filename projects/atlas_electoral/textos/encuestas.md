<!--
Encuestas (pestaña Encuestas). Cómo se escribe: mira textos/portada.md y src/textos.js.

Cifras disponibles en la parte principal:
  {encuestas}          encuestas del ciclo que entran en el promedio (sin reestimaciones ni encuestas de partido)
  {ultima}             fecha de la última encuesta (p. ej. "13 de noviembre")
  {chips}              las cifras del último promedio, partido a partido (se calcula en el código)
  {elecciones}         elecciones con encuestas en la tabla de aciertos (desde 1977)

Huecos [[...]]: gráficos, tablas y controles que dibuja el código. Un [[nombre]] sin nada detrás en el
código deja un <div id="nombre"> vacío que el código rellena después.

Partes con nombre (se pintan aparte, a veces al cambiar un selector):
  === prediccion ===     el bloque de la predicción, cuando hay prediccion.json
      {fecha} día de la actualización, {n_encuestas} encuestas usadas, {simulaciones} número de simulaciones,
      {pp_primero} probabilidad de que el PP quede primero, {b_escala} {s_ccaa} {s_prov} parámetros del modelo
  === sin_prediccion === lo que se ve si no hay predicción
  === backtest ===       el párrafo de "¿Acierta?"
      {generales} elecciones generales probadas, {desde} año de la primera, {voto_7} {escanos_7} % dentro
      del rango del 90% una semana antes (voto, escaños), {voto_30} {escanos_30} lo mismo un mes antes
  === paso_a_paso ===    el texto bajo el gráfico "Paso a paso", cambia con la encuesta elegida
      {casa} encuestadora, {fecha} fin del trabajo de campo, {entrevistas} tamaño de la muestra,
      {partidos} partidos del gráfico, {cambio_R} {cambio_RI} {cambio_RIT} {cambio_pub} "Cambio: ..."
      de cada paso respecto al anterior
  === eleccion ===       la nota bajo "Elección a elección", cambia con la elección elegida
      {encuestadoras} casas con encuesta final, {error_media} error medio de la media de encuestas,
      {error_cis} la frase del error de la intención directa del CIS (vacía si no hay dato)
  === salto ===          la nota bajo los gráficos de "El salto final"
  === nota_ciclo ===     la frase junto al selector de elección pasada
      {ciclo} fecha de la elección, {encuestas} encuestas del ciclo, {desde} fecha de la primera
  === ultimas ===        el título y la nota de la tabla de últimas encuestas

No hay condiciones (::: si ...) en esta página.
-->
# Encuestas

[sub] Las encuestas hacia el 29N, la predicción propia, cómo se cocinan las encuestas y lo que pasó en las elecciones anteriores.

[[índice]]

## Encuestas hacia el 29N {#29n | Hacia el 29N}

[sub] Promedio corregido de {encuestas} encuestas publicadas desde julio de 2023; la última, del {ultima}.

### Promedio y encuestas {#promedio | Promedio}

[línea] {chips}

[[chart-area]]

### Todas las encuestas {#tabla | Tabla}

[nota] Una fila por cada nivel al que se publicó una encuesta. Las filas del mismo color son la misma encuesta. **Híbrido**: una sola muestra publicada a más de un nivel. **Desglose**: el dato de esa zona sale de una muestra mayor, así que no es una encuesta independiente de la zona.

[[controles_tabla]]
[[tabla_encuestas]]

### Sesgo de cada encuestadora {#casas | Encuestadoras}

[nota] Cuánto da cada casa a cada partido por encima (+) o por debajo (−) del resto, en puntos, en este ciclo. Casas con 8 o más encuestas.

[[house]]

### Quién irá a votar {#dentro | Dentro de las encuestas}

[nota] Seguros de ir a votar (10 sobre 10) según lo que votaron en julio de 2023, en las respuestas de cada encuestado de 40dB y del CIS. Compara cada casa consigo misma: preguntan distinto.

[[controles_movilizacion]]
[[movilizacion]]

### Adónde va cada voto

[nota] Lo que votaron en julio de 2023 (filas) y lo que dicen que votarán ahora (columnas), en porcentaje de cada fila.

[[controles_matriz]]
[[matriz]]

## Predicción <span class="tag-exp">modelo experimental, en revisión</span> {#prediccion | Predicción}

[[pred]]

## Cómo se cocinan las encuestas {#cocina | La cocina}

[sub] Ninguna casa publica lo que contesta la gente, sino una estimación: pondera por el recuerdo de voto, reparte a los indecisos y tiene en cuenta quién irá a votar. Aquí se ve qué hace cada paso y cuánto mueve cada casa.

### Paso a paso, en una encuesta real

[nota] Con las respuestas de cada encuestado de 40dB y del CIS, rehacemos los cuatro ajustes de manual y los comparamos con lo que publicó la casa.

[[controles_paso]]
[[paso]]
[[cp-text]]

### Respuesta tal cual frente a estimación, por casa

[[controles_cocina]]
[[cocina]]
[[tabla_cocina]]

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
**Qué encuestas entran.** Encuestas de ámbito nacional para el Congreso recopiladas en las tablas de Wikipedia, cotejadas con los informes originales cuando existen (PDF de cada casa, marginales del CIS, informes de 40dB). De cada encuesta, su escenario principal. No entran en el promedio las reestimaciones de datos del CIS hechas por otras empresas (misma muestra, otra cocina) ni las encuestas encargadas por un partido; se muestran como círculos huecos.

**El promedio.** Para cada día, media ponderada de las encuestas de los 120 días anteriores. El peso de cada encuesta decae con su antigüedad (exponencial, vida media de unos 7 días), crece con la raíz de su muestra (tope en el equivalente a 4.000 entrevistas) y se divide por el número de encuestas de la misma casa en los 30 días previos, para que un tracking diario no ahogue a las casas mensuales. La banda es ±1,28 desviaciones ponderadas de las encuestas alrededor del promedio (un 80%): mide cuánto discrepan las casas, no la incertidumbre del resultado.

**El gráfico.** Cada punto es una encuesta tal como se publicó; al pasar por encima se ve quién la hizo, cuándo y qué daba a cada partido, y se resaltan las demás de la misma casa (un clic la deja fija). La línea es el promedio; la banda, la dispersión habitual entre encuestas (±1,28 desviaciones, un 80%). La tira de abajo muestra todo el ciclo: arrastra la ventana para moverte. Las reestimaciones del CIS y las encuestas de partido, si se muestran, son círculos huecos.

**La corrección de casa.** Para cada casa y partido, su desviación media respecto al promedio de todas, encogida hacia cero (como si tuviera cinco encuestas más que dieran cero), recalculada tres veces y centrada para que la media de la industria sea cero. Esa cantidad, la de la tabla "Sesgo de cada encuestadora", se resta a cada encuesta antes de promediar. Supone que la industria en conjunto no se equivoca; lo que vimos en "¿Hay salto al final?" dice que sí se equivoca, pero en una dirección que no se puede saber de antemano.

**La cocina.** Intención directa: quienes nombran un partido, recalculada sobre ese total. Estimación: la cifra publicada. Para 40dB y el CIS ambas salen de sus propios informes; para las demás casas, de las tablas de intención directa de Wikipedia. "Así se cocina una encuesta" y "Dentro de las encuestas" usan los microdatos de 40dB (publicados por El País) y del CIS, armonizados encuestado a encuestado; en la web solo hay agregados.

**Quién irá a votar y adónde va cada voto.** Con los microdatos de 40dB y del CIS: porcentaje que se da un 10 sobre 10 en probabilidad de votar, según el voto recordado de julio de 2023 (la línea discontinua, menores de 35). La matriz cruza voto recordado e intención directa; «Otros» incluye otros partidos, blanco y nulo; «Indecisos», no sabe o no contesta; entre paréntesis, cambios de 3 puntos o más frente a la encuesta anterior de la misma casa. Grupos con menos de 50 encuestados se dejan en blanco.

**Intención directa.** Respuesta a «¿a qué partido votarías?», recalculada sobre quienes nombran un partido. Para 40dB y el CIS sale de sus informes; para las demás casas, de las tablas de Wikipedia, comparando solo los partidos que aparecen en las dos. Izquierda: Sumar, Podemos, Más País e IU (Unidas Podemos en 2016-2019).

**Aciertos.** Para cada elección, la última encuesta de cada casa publicada entre 1 y 35 días antes; error = media de las diferencias absolutas con el resultado en los partidos con un 3% o más. "Frente al resto" compara a cada casa con las demás en las mismas elecciones y descuenta la antelación. El salto final se mide con la media de las encuestas de las dos últimas semanas.

[nota] Todo se calcula con código abierto en Python y se reconstruye cada mañana; los datos de partida son públicos. Fuentes: Wikipedia; informes de las casas; CIS (origen de los datos: Centro de Investigaciones Sociológicas, reutilizados según sus condiciones generales); 40dB. para EL PAÍS y la Cadena SER (bases de datos de acceso libre publicadas por El País).
:::

=== prediccion ===

[sub] Predicción propia para el 29N a partir de las encuestas, con un modelo que añade lo que las encuestas no dicen: el error que la industria ha tenido en cada general desde 1982. Actualizada el {fecha} con {n_encuestas} encuestas.

### Diputados (estimación)

[[pred-bar]]
[[pred-bloques]]

[nota] Arrastra un partido a otro grupo: el rango y la probabilidad se recalculan sobre las {simulaciones} simulaciones.

[nota] Probabilidad de que el PP sea el partido con más escaños: **{pp_primero}**.

### Voto y escaños por partido

[[tabla_partidos]]

### Escaños de cada grupo en las {simulaciones} simulaciones

[[histograma]]

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
**Qué hace.** Para cada partido (PP, PSOE, Vox, Sumar, Podemos, SALF, ERC, Junts, Bildu y PNV) sigue día a día su apoyo con un filtro que combina todas las encuestas del ciclo, descontando a cada casa su desviación habitual (con lo que hizo en 2023 como punto de partida). Eso da el nivel de hoy y su incertidumbre.

**Lo que las encuestas no saben.** El día de la votación se añade el error común de la industria: lo que se equivocó este mismo filtro, con todas las encuestas, en cada general desde 1982, en una dirección que no se puede saber de antemano. Se simula con la escala y las correlaciones entre partidos medidas en esas elecciones (la derecha se mueve junta; derecha e izquierda, en sentidos opuestos).

**Escaños.** Cada simulación de voto nacional se lleva a las provincias como en el simulador, con un ruido extra por comunidad y por provincia calibrado con 1977-2023, y se reparten los escaños con D'Hondt. Las horquillas recogen el 90% de las simulaciones.

[nota] Modelo A+ del borrador de modelos (docs/modelos): filtro de Kalman por partido, error común casi normal, {simulaciones} simulaciones. Se probó además una capa provincial a partir de los microdatos del CIS y 40dB y de las encuestas autonómicas: mejora el mapa de porcentajes pero no los escaños, así que no se usa. Parámetros: escala del error común {b_escala}·√(p(1−p)); ruido autonómico {s_ccaa}, provincial {s_prov}.
:::

=== sin_prediccion ===

[nota] La predicción del modelo aparecerá aquí.

=== backtest ===

[nota] Probado en las {generales} elecciones generales desde {desde}, rehaciendo el modelo con solo las encuestas que se conocían entonces. Una semana antes, el resultado cayó dentro del rango del 90% en el {voto_7} de los casos para el voto y en el {escanos_7} para los escaños (un mes antes: {voto_30} y {escanos_30}). Fallaron, sobre todo, 2004 (tres días después del 11-M) y Ciudadanos en 2015.

=== paso_a_paso ===

[nota] {casa}, trabajo de campo hasta el {fecha}, {entrevistas} entrevistas. Porcentajes dentro de {partidos}, recalculados para sumar 100 en cada paso.

<ol class="steps">
<li><b>Respuesta tal cual.</b> Intención directa: quienes nombran un partido, sin indecisos ni abstención.</li>
<li><b>+ recuerdo de voto.</b> Se repondera a cada encuestado para que el recuerdo de voto de la muestra coincida con el resultado de las generales anteriores. Las muestras traen de más votantes del ganador y de menos abstencionistas; esto lo corrige, pero arrastra la memoria de la elección pasada.{cambio_R}</li>
<li><b>+ indecisos.</b> Quien no sabe o no contesta se asigna al partido por el que siente simpatía o, si no, al que recuerda haber votado.{cambio_RI}</li>
<li><b>+ probabilidad de votar.</b> Cada encuestado pesa según la probabilidad que se da de ir a votar (0 a 10).{cambio_RIT}</li>
<li><b>Lo que publicó la casa.</b> La estimación oficial de la encuesta. La diferencia con el paso anterior es la parte de la cocina que no es de manual: modelos propios, series históricas, criterio.{cambio_pub}</li>
</ol>

[nota] Fuentes: microdatos de 40dB para El País y la SER y del CIS (origen de los datos: Centro de Investigaciones Sociológicas); elaboración propia. Los cuatro pasos son los de manual; cada casa aplica los suyos, con otros detalles, y el último tramo recoge todo lo demás.

=== eleccion ===

[nota] {encuestadoras} encuestadoras · error medio de la media de encuestas: **{error_media} puntos**{error_cis}

=== salto ===

[nota] Junto a cada raya: resultado menos encuestas, en puntos (+ = las encuestas se quedaron cortas). Partidos con un 3% o más; escala común (0-50%).

=== nota_ciclo ===

Generales del {ciclo}: {encuestas} encuestas desde {desde}; el resultado, marcado al final.

=== ultimas ===

### Últimas encuestas

[nota] Las doce más recientes, tal como se publicaron; entre paréntesis, la diferencia con el promedio.

[[last]]
