<!--
Tu provincia. Cómo se escribe: textos/README.md.

Parte principal (la página):
  {ultimo_campo}   fecha de la última encuesta del modelo (p. ej. "13 nov 2026")
  {simulaciones}   número de simulaciones (4.000)
  {boe}            enlace al BOE de las candidaturas proclamadas
  [[selector]] [[detalle]] [[tabla_aire]]   selector de provincia, ficha de la provincia, tabla de escaños en el aire

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
# Tu provincia

[sub] Qué espera el modelo para el 29N en cada provincia, con cuánta seguridad, y todas las encuestas publicadas allí. Con encuestas hasta el {ultimo_campo}.

[[selector]]
[[detalle]]

<section>
<h2>Escaños en el aire</h2>

[nota] Los casos más igualados de toda España: partidos con una probabilidad cercana a la mitad de conseguir ese escaño. Un mismo escaño disputado aparece una vez por cada partido que lo pelea. Pulsa una provincia para verla.

[[tabla_aire]]
</section>

::: metodología #metodo
**De dónde sale.** Es el mismo modelo de la pestaña Encuestas, con {simulaciones} simulaciones: promedio nacional de encuestas, error común de la industria y, en cada simulación, voto provincial a partir del mapa de 2023 (Sumar, Podemos y SALF, a partir de las europeas de 2024) con ruido por comunidad y provincia y reparto D'Hondt. Las listas que no aparecen en las encuestas nacionales conservan sus votos de 2023.

**Partidos regionales.** ERC, Junts, Bildu y PNV son cerca del 1% de una muestra nacional, así que su error se mide aparte y el ruido de las encuestas se ajusta a su tamaño. Probado en las elecciones desde 1986, el 90% de sus resultados cae dentro del rango del 90%.

**Candidaturas.** Las proclamadas para el Congreso en el [BOE del 3 de noviembre]({boe}), con la corrección del 7. De cada lista se muestra solo su cabeza.

**Lo que no hace.** Las encuestas de la provincia se muestran, pero no mueven este cálculo. Al probarlas sobre las elecciones de 2015 a 2023 mejoraron poco, y solo cuando cambió mucho el mapa de partidos.

**Cómo leer las casillas.** Cada casilla es un escaño de ese partido: la primera, ganar al menos uno; la segunda, al menos dos. Cuanto más llena, más probable.

**Votos del último escaño.** Mediana, entre las simulaciones, de los votos que le faltan a la primera lista que se queda fuera para superar a la última que entra, a la escala de los votos de 2023.

**Muestra.** Propia: la encuesta entrevistó a una muestra de la provincia. Desglose: el dato sale de una muestra mayor. Las filas transcritas de prensa y aún no revisadas van marcadas como tales.
:::

=== detalle ===

<h2>{provincia}</h2>

Elige {escanos} {escanos_palabra}{cambio}. El reparto más probable es **{reparto}**, que sale en el {prob_reparto} de las simulaciones.{siguientes}

### Probabilidad de cada escaño

[[casillas]]

### Escaños y voto por partido

[[tabla_partidos]]

### El último escaño

::: si disputa
::: si margen
Lo más frecuente es que el último escaño sea de **{ultimo_de}** y que la primera lista fuera sea **{primera_fuera}** ({prob_ultimo} de las simulaciones). Les separan unos {margen} votos.
::: si no
Lo más frecuente es que el último escaño sea de **{ultimo_de}** y que la primera lista fuera sea **{primera_fuera}** ({prob_ultimo} de las simulaciones).
:::
::: si no
No hay disputa entre partidos por el último escaño.
:::

### Candidaturas proclamadas

::: si candidaturas
[[tabla_candidaturas]]
::: si no
[nota] Sin datos.
:::

### Encuestas publicadas aquí

::: si encuestas
[[tabla_encuestas]]
::: si no
[nota] Aún no conocemos ninguna encuesta publicada para esta provincia.
:::
