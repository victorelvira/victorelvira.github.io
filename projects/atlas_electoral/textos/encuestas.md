<!--
Encuestas (pestaña Encuestas). Cómo se escribe: mira textos/portada.md y src/textos.js.

Cifras disponibles en la parte principal:
  {encuestas}          encuestas del ciclo que entran en el promedio (sin reestimaciones ni encuestas de partido)
  {ultima}             fecha de la última encuesta (p. ej. "13 de noviembre")
  {chips}              las cifras del último promedio, partido a partido (se calcula en el código)

Huecos [[...]]: gráficos, tablas y controles que dibuja el código. Un [[nombre]] sin nada detrás en el
código deja un <div id="nombre"> vacío que el código rellena después.

Partes con nombre (se pintan aparte, a veces al cambiar un selector):
  === paso_a_paso ===    el texto bajo el gráfico "Paso a paso", cambia con la encuesta elegida
      {casa} encuestadora, {fecha} fin del trabajo de campo, {entrevistas} tamaño de la muestra,
      {partidos} partidos del gráfico, {cambio_R} {cambio_RI} {cambio_RIT} {cambio_pub} "Cambio: ..."
      de cada paso respecto al anterior
  === ultimas ===        el título y la nota de la tabla de últimas encuestas

No hay condiciones (::: si ...) en esta página.
-->
# Encuestas

[sub] Todas las encuestas hacia el 29N y su promedio, cuánto se desvía cada encuestadora, quién dice que irá a votar y cómo se cocina una estimación.

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

[nota] Lo que votaron en julio de 2023 (filas) y lo que dicen que votarán ahora (columnas), en porcentaje de cada fila. Entre paréntesis, cuánto ha cambiado desde la encuesta anterior de la misma casa, cuando son 3 puntos o más.

[[controles_matriz]]
[[matriz]]

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

::: metodología #metodo
**Qué encuestas entran.** Encuestas de ámbito nacional para el Congreso recopiladas en las tablas de Wikipedia, cotejadas con los informes originales cuando existen (PDF de cada casa, marginales del CIS, informes de 40dB). De cada encuesta, su escenario principal. No entran en el promedio las reestimaciones de datos del CIS hechas por otras empresas (misma muestra, otra cocina) ni las encuestas encargadas por un partido; se muestran como círculos huecos.

**El promedio.** Para cada día, media ponderada de las encuestas de los 120 días anteriores. El peso de cada encuesta decae con su antigüedad (exponencial, vida media de unos 7 días), crece con la raíz de su muestra (tope en el equivalente a 4.000 entrevistas) y se divide por el número de encuestas de la misma casa en los 30 días previos, para que un tracking diario no ahogue a las casas mensuales. La banda es ±1,28 desviaciones ponderadas de las encuestas alrededor del promedio (un 80%): mide cuánto discrepan las casas, no la incertidumbre del resultado.

**El gráfico.** Cada punto es una encuesta tal como se publicó; al pasar por encima se ve quién la hizo, cuándo y qué daba a cada partido, y se resaltan las demás de la misma casa (un clic la deja fija). La línea es el promedio; la banda, la dispersión habitual entre encuestas (±1,28 desviaciones, un 80%). La tira de abajo muestra todo el ciclo: arrastra la ventana para moverte. Las reestimaciones del CIS y las encuestas de partido, si se muestran, son círculos huecos.

**La corrección de casa.** Para cada casa y partido, su desviación media respecto al promedio de todas, encogida hacia cero (como si tuviera cinco encuestas más que dieran cero), recalculada tres veces y centrada para que la media de la industria sea cero. Esa cantidad, la de la tabla "Sesgo de cada encuestadora", se resta a cada encuesta antes de promediar. Supone que la industria en conjunto no se equivoca; lo que vimos en "¿Hay salto al final?" dice que sí se equivoca, pero en una dirección que no se puede saber de antemano.

**La cocina.** Intención directa: quienes nombran un partido, recalculada sobre ese total. Estimación: la cifra publicada. Para 40dB y el CIS ambas salen de sus propios informes; para las demás casas, de las tablas de intención directa de Wikipedia. "Así se cocina una encuesta" y "Dentro de las encuestas" usan los microdatos de 40dB (publicados por El País) y del CIS, armonizados encuestado a encuestado; en la web solo hay agregados.

**Quién irá a votar y adónde va cada voto.** Con los microdatos de 40dB y del CIS: porcentaje que se da un 10 sobre 10 en probabilidad de votar, según el voto recordado de julio de 2023 (la línea discontinua, menores de 35). La matriz cruza voto recordado e intención directa; «Otros» incluye otros partidos, blanco y nulo; «Indecisos», no sabe o no contesta; entre paréntesis, cambios de 3 puntos o más frente a la encuesta anterior de la misma casa. Grupos con menos de 50 encuestados se dejan en blanco.

**Intención directa.** Respuesta a «¿a qué partido votarías?», recalculada sobre quienes nombran un partido. Para 40dB y el CIS sale de sus informes; para las demás casas, de las tablas de Wikipedia, comparando solo los partidos que aparecen en las dos. Izquierda: Sumar, Podemos, Más País e IU (Unidas Podemos en 2016-2019).

[nota] Todo se calcula con código abierto en Python y se reconstruye cada mañana; los datos de partida son públicos. Fuentes: Wikipedia; informes de las casas; CIS (origen de los datos: Centro de Investigaciones Sociológicas, reutilizados según sus condiciones generales); 40dB. para EL PAÍS y la Cadena SER (bases de datos de acceso libre publicadas por El País).
:::

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

=== ultimas ===

### Últimas encuestas

[nota] Las doce más recientes, tal como se publicaron; entre paréntesis, la diferencia con el promedio.

[[last]]
