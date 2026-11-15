<!--
Provincias. Cómo se escribe: textos/README.md.

Parte principal (la página):
  {ultimo_campo}   fecha de la última encuesta del modelo (p. ej. "13 nov 2026")
  {simulaciones}   número de simulaciones (4.000)
  {boe}            enlace al BOE de las candidaturas proclamadas
  {en_juego}       escaños en el aire (ningún partido los gana en 9 de cada 10 simulaciones), toda España (p. ej. 71)
  {decididos}      los demás escaños
  {total}          escaños del Congreso (350)
  [[mapa]]         mapa de provincias coloreado por escaños en juego (pulsar una abre su ficha)
  [[selector]] [[detalle]] [[pugnas]]   selector de provincia, ficha de la provincia, tabla de escaños en el aire

Parte "tooltip" (lo que sale al pasar el ratón por una provincia del mapa):
  {provincia}, {escanos}, {escanos_palabra}, {en_juego} (escaños en juego en esa provincia),
  {ultimo_de}, {primera_fuera}, {frecuencia} (la pugna más habitual por el último escaño). Condición: disputa.

Parte "detalle" (la ficha de la provincia elegida, se rehace al cambiar de provincia):
  {provincia}        nombre
  {escanos}          escaños que elige; {escanos_palabra} "escaño" o "escaños"
  {cambio}           frase entre paréntesis si cambia respecto a 2023, p. ej. " (uno más que en 2023)"; vacía si no
  {reparto}          reparto más probable, p. ej. "PP 4, PSOE 3, Vox 2"
  {prob_reparto}     % de simulaciones con ese reparto
  {siguientes}       frase con el segundo y el tercer reparto más probables (calculada)
  {ultimo_de}        partido que suele llevarse el último escaño
  {primera_fuera}    primera lista que se queda fuera
  {prob_ultimo}      % de simulaciones con esa pareja
  {margen}           votos que los separan
  Condiciones: disputa (hay pugna por el último escaño), margen (se conoce la diferencia de votos),
  candidaturas, encuestas.
-->
# Provincias

[sub] Qué espera el modelo para el 29N en cada provincia, con cuánta seguridad, y todas las encuestas publicadas allí. Con encuestas hasta el {ultimo_campo}.

## Dónde se decide {#decide | Dónde se decide}

Hay **{en_juego} escaños en el aire**: escaños que ningún partido gana en al menos 9 de cada 10 simulaciones. Los otros {decididos} están prácticamente decididos. El mapa muestra cuántos hay en el aire en cada provincia; pulsa una para ver su ficha.

[[mapa]]

### Escaños en el aire

[nota] Las provincias con más escaños en el aire. En cada una, además, la pugna más habitual por su último escaño: quién se lo suele llevar, quién se queda fuera y por cuántos votos. Que un partido gane unos pocos votos solo cambia ese último escaño; la incertidumbre del modelo, de varios puntos, puede mover varios a la vez, y por eso una provincia grande tiene varios en el aire.

[[pugnas]]

## Tu provincia {#tuya | Tu provincia}

[[selector]]
[[detalle]]

::: metodología #metodo
**De dónde sale.** Es el mismo modelo de la pestaña Encuestas, con {simulaciones} simulaciones: promedio nacional de encuestas, error común de la industria y, en cada simulación, voto provincial a partir del mapa de 2023 (Frente Amplio, Podemos y SALF, a partir de las europeas de 2024) con ruido por comunidad y provincia y reparto D'Hondt. Las listas que no aparecen en las encuestas nacionales conservan sus votos de 2023.

**Partidos regionales.** ERC, Junts, Bildu y PNV son cerca del 1% de una muestra nacional, así que su error se mide aparte y el ruido de las encuestas se ajusta a su tamaño. Probado en las elecciones desde 1986, el 90% de sus resultados cae dentro del rango del 90%.

**Candidaturas.** Las proclamadas para el Congreso en el [BOE del 3 de noviembre]({boe}), con la corrección del 7. De cada lista se muestra solo su cabeza.

**Lo que no hace.** Las encuestas de la provincia se muestran, pero no mueven este cálculo. Al probarlas sobre las elecciones de 2015 a 2023 mejoraron poco, y solo cuando cambió mucho el mapa de partidos.

**Cómo leer las casillas.** Cada casilla es un escaño de ese partido: la primera, ganar al menos uno; la segunda, al menos dos. Cuanto más llena, más probable.

**Votos del último escaño.** Mediana, entre las simulaciones, de los votos que le faltan a la primera lista que se queda fuera para superar a la última que entra, a la escala de los votos de 2023.

**Tipo de encuesta.** Solo de esta provincia: todas las entrevistas son de la provincia (también las de una comunidad de una sola provincia, como Madrid o Cantabria). Nacional, con dato de la provincia: una encuesta de toda España de la que se saca el dato provincial; en cada provincia hay pocas entrevistas, así que es una cifra muy incierta, y las entrevistas que se indican son las de toda España. Regional, con dato de la provincia: igual, para una encuesta de una comunidad autónoma. No consta: la fuente no lo dice. Las filas transcritas de prensa y aún no revisadas van marcadas como tales.

**Escaños en el aire.** En cada provincia, el escaño de un partido cuenta como decidido cuando lo gana en al menos 9 de cada 10 simulaciones (el primero, si gana al menos uno; el segundo, si gana al menos dos). Los escaños en el aire son los que quedan: los que ningún partido tiene decididos así.
:::

=== detalle ===

<h3 class="pv-nombre">{provincia}</h3>

Elige {escanos} {escanos_palabra}{cambio}. El reparto más probable es **{reparto}**, que sale en el {prob_reparto} de las simulaciones.{siguientes}

#### Probabilidad de cada escaño

[[casillas]]

#### Escaños y voto por partido

[[tabla_partidos]]

#### El último escaño

::: si disputa
::: si margen
Lo más frecuente es que el último escaño sea de **{ultimo_de}** y que la primera lista fuera sea **{primera_fuera}** ({prob_ultimo} de las simulaciones). Les separan unos {margen} votos.
::: si no
Lo más frecuente es que el último escaño sea de **{ultimo_de}** y que la primera lista fuera sea **{primera_fuera}** ({prob_ultimo} de las simulaciones).
:::
::: si no
No hay disputa entre partidos por el último escaño.
:::

#### Candidaturas proclamadas

::: si candidaturas
[[tabla_candidaturas]]
::: si no
[nota] Sin datos.
:::

#### Encuestas publicadas aquí

::: si encuestas
[[tabla_encuestas]]
::: si no
[nota] Aún no conocemos ninguna encuesta publicada para esta provincia.
:::

=== pugna ===

::: si margen
**{provincia}**: {en_juego} de sus {escanos} escaños en el aire. La pugna más habitual por el último es entre **{ultimo_de}**, que se lo lleva, y **{primera_fuera}**, que se queda fuera a unos {margen} votos (en {frecuencia} simulaciones).
::: si no
**{provincia}**: {en_juego} de sus {escanos} escaños en el aire. La pugna más habitual por el último es entre **{ultimo_de}**, que se lo lleva, y **{primera_fuera}**, que se queda fuera (en {frecuencia} simulaciones).
:::

=== tooltip ===

**{provincia}**: {escanos} {escanos_palabra}, {en_juego} en el aire.

::: si disputa
Último escaño: lo más habitual es que se lo lleve **{ultimo_de}** y se quede fuera **{primera_fuera}** ({frecuencia} simulaciones).
:::
