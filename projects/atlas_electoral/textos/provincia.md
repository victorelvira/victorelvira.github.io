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
  Ficha como página de resultados (añadido por Claude el 16-11-2026, código en src/provincia_ficha.js):
  [[cabecera]] ruta (Provincias › comunidad › provincia), [[cifras]] escaños, censo, participación, electores por escaño,
  [[vista]] botones "Proyección 2026 / Resultados 2023" (la dirección acaba en /2023 en la segunda),
  [[resultado]] parte resultado_2026 o resultado_2023, [[mapa_aqui]] sitio al que se mueve el mapa de España (parte mapa_ficha),
  [[resumen_2023]], [[vale]], [[aire]] (partes aire, aire_fila, dudoso_fila), [[ultimo_2023]], [[evolucion]],
  [[dhondt]] (solo en 2023), [[municipios]]. Condición nueva: proyeccion (vista 2026).
  Cifras de las partes nuevas: resumen_2023 {escanos23} {escanos23_palabra} {reparto23} {participacion};
  vale {electores} {media} {peso} {puesto} {min_n} {min} {max_n} {max}; ultimo_2023 {ultimo_de} {cociente} {votos_lista}
  {divisor} {siguiente} {cociente_sig} {falta} {perder} (condición rival); municipios {n} {provincia}; candidaturas_nota {boe}.
-->
# Provincias

[sub] Qué espera el modelo para el 29N en cada provincia, con cuánta seguridad, y todas las encuestas publicadas allí. Con encuestas hasta el {ultimo_campo}.

## Tu provincia {#tuya | Tu provincia}

[[selector]]
[[detalle]]

## Dónde se decide {#decide | Dónde se decide}

Hay **{en_juego} escaños en el aire**: escaños que ningún partido gana en al menos 9 de cada 10 simulaciones. Los otros {decididos} están prácticamente decididos. El mapa de abajo muestra cuántos hay en el aire en cada provincia; pulsa una para ver la suya.

[[mapa]]

### Escaños en el aire

[nota] Las provincias con más escaños en el aire. En cada una, además, la pugna más habitual por su último escaño: quién se lo suele llevar, quién se queda fuera y por cuántos votos. Que un partido gane unos pocos votos solo cambia ese último escaño; la incertidumbre del modelo, de varios puntos, puede mover varios a la vez, y por eso una provincia grande tiene varios en el aire.

[[pugnas]]

::: metodología #metodo
**De dónde sale.** Es «Nuestra predicción», la de la portada, con {simulaciones} simulaciones de siete modelos: promedio nacional de encuestas, error común de la industria y, en cada simulación, voto provincial a partir de elecciones anteriores, sobre todo el mapa de 2023 (Frente Amplio, Podemos y SALF, a partir de las europeas de 2024) con ruido por comunidad y provincia y reparto D'Hondt. Las listas que no aparecen en las encuestas nacionales conservan sus votos de 2023.

**Partidos regionales.** ERC, Junts, Bildu y PNV son cerca del 1% de una muestra nacional, así que su error se mide aparte y el ruido de las encuestas se ajusta a su tamaño. Probado en las elecciones desde 1986, unos 9 de cada 10 de sus resultados caen dentro del rango que recoge 9 de cada 10 simulaciones.

**Candidaturas.** Las proclamadas para el Congreso en el [BOE del 3 de noviembre]({boe}), con la corrección del 7. De cada lista se muestra solo su cabeza.

**Lo que no hace.** Las encuestas de la provincia se muestran, pero no mueven este cálculo. Al probarlas sobre las elecciones de 2015 a 2023 mejoraron poco, y solo cuando cambió mucho el mapa de partidos.

**Cómo leer las casillas.** Cada casilla es un escaño de ese partido: la primera, ganar al menos uno; la segunda, al menos dos. Cuanto más llena, más probable.

**Votos del último escaño.** Mediana, entre las simulaciones, de los votos que le faltan a la primera lista que se queda fuera para superar a la última que entra, a la escala de los votos de 2023.

**Tipo de encuesta.** Solo de esta provincia: todas las entrevistas son de la provincia (también las de una comunidad de una sola provincia, como Madrid o Cantabria). Nacional, con dato de la provincia: una encuesta de toda España de la que se saca el dato provincial; en cada provincia hay pocas entrevistas, así que es una cifra muy incierta, y las entrevistas que se indican son las de toda España. Regional, con dato de la provincia: igual, para una encuesta de una comunidad autónoma. No consta: la fuente no lo dice. Las filas transcritas de prensa y aún no revisadas van marcadas como tales.

**Escaños en el aire.** En cada provincia, el escaño de un partido cuenta como decidido cuando lo gana en al menos 9 de cada 10 simulaciones (el primero, si gana al menos uno; el segundo, si gana al menos dos). Los escaños en el aire son los que quedan: los que ningún partido tiene decididos así.
:::

=== detalle ===

[[cabecera]]

<h3 class="pv-nombre">{provincia}</h3>

[[cifras]]

[[vista]]

::: si proyeccion
Elige {escanos} {escanos_palabra}{cambio}. El reparto más probable es **{reparto}**, que sale en {prob_reparto} simulaciones.{siguientes}
::: si no
[[resumen_2023]]
:::

[[resultado]]

[[mapa_aqui]]

::: si proyeccion
#### Probabilidad de cada escaño

[[casillas]]

#### Escaños y voto por partido

[[tabla_partidos]]
:::

[[vale]]

#### El último escaño

::: si proyeccion
::: si disputa
::: si margen
Lo más frecuente es que el último escaño sea de **{ultimo_de}** y que la primera lista fuera sea **{primera_fuera}** (en {prob_ultimo} simulaciones). Les separan unos {margen} votos.
::: si no
Lo más frecuente es que el último escaño sea de **{ultimo_de}** y que la primera lista fuera sea **{primera_fuera}** (en {prob_ultimo} simulaciones).
:::
::: si no
No hay disputa entre partidos por el último escaño.
:::
[[aire]]
::: si no
[[ultimo_2023]]
:::

#### Candidaturas proclamadas

::: si candidaturas
[[tabla_candidaturas]]
::: si no
[nota] Sin datos.
:::

[[evolucion]]

[[dhondt]]

::: si proyeccion
#### Encuestas publicadas aquí

::: si encuestas
[[tabla_encuestas]]
::: si no
[nota] Aún no conocemos ninguna encuesta publicada para esta provincia.
:::
:::

[[municipios]]

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

=== tooltip_voto ===

::: si presenta
**{provincia}**: {partido}, {voto} de los votos (mediana de las simulaciones). En 9 de cada 10 simulaciones, entre {voto_lo} y {voto_hi}.
::: si no
**{provincia}**: {partido} no presenta lista aquí.
:::

=== nota_voto ===

[nota] Voto que el modelo espera para {partido} en cada provincia: la mediana de sus {simulaciones} simulaciones. En gris rayado, las provincias donde no presenta lista.

=== tooltip_voto_2023 ===

::: si presenta
**{provincia}**: {partido}, {voto} de los votos en las generales de 2023.
::: si no
**{provincia}**: {partido} no presentó lista aquí en 2023.
:::

=== nota_voto_2023 ===

[nota] Voto de {partido} en cada provincia en las generales de julio de 2023 (Ministerio del Interior). En gris rayado, las provincias donde no presentó lista.

=== tooltip_mas_votado ===

::: si proyeccion
**{provincia}**: lo más probable es que gane **{partido}**, primero en {frecuencia} simulaciones, con un {voto} de los votos (mediana) y unos {ventaja} puntos de ventaja sobre el segundo.
::: si no
**{provincia}**: ganó **{partido}** en 2023, con un {voto} de los votos y {ventaja} puntos de ventaja sobre el segundo.
:::

=== nota_mas_votado ===

::: si proyeccion
[nota] Cada provincia, en el color del partido que queda primero en más simulaciones de las {simulaciones}; cuanto más oscuro, más ventaja le saca al segundo (mediana de la diferencia, en las simulaciones en que gana).
::: si no
[nota] Cada provincia, en el color del partido más votado en las generales de julio de 2023; cuanto más oscuro, más ventaja le sacó al segundo.
:::

=== resumen_2023 ===

En las generales de julio de 2023 eligió {escanos23} {escanos23_palabra}: **{reparto23}**. Votó el {participacion} del censo.

=== resultado_2026 ===

#### Resultado por partido

[nota] Voto previsto: el punto es la mediana de las {simulaciones} simulaciones y la franja recoge 9 de cada 10, como en la portada. A la derecha, los escaños del reparto más probable y, entre paréntesis, entre cuántos se mueve en 9 de cada 10 simulaciones.

[[barras]]

=== resultado_2023 ===

#### Resultado por partido

[nota] Generales del 23 de julio de 2023 (Ministerio del Interior). Porcentaje sobre el voto válido, que incluye el voto en blanco. Las listas por debajo del 3% no entran en el reparto.

[[barras]]

=== mapa_ficha ===

[nota] {provincia}, recuadrada en el mapa de España. Pulsa otra provincia para ver su ficha.

=== vale ===

#### Lo que vale tu voto: electores por escaño

En {provincia} hay **{electores} electores por cada escaño**; la media de España es de {media}. Un voto aquí pesa {peso} lo que un voto medio. Es la {puesto} de 52, contando desde la que tiene menos electores por escaño: {min_n} ({min}). La que más tiene es {max_n} ({max}).

[[vale_tira]]

[nota] Electores del censo de las generales de 2023, con los residentes en el extranjero, divididos entre los escaños de 2026 (Real Decreto de convocatoria). El INE aún no ha publicado el censo de 2026.

=== aire ===

::: si pugnas
Cómo acaba el último escaño en las simulaciones:

[[pugnas_lista]]
:::

::: si dudosos
Los escaños más dudosos (hasta ocho), con la frecuencia con que los gana cada partido:

[[dudosos_lista]]
:::

=== ultimo_2023 ===

::: si rival
El último escaño fue para **{ultimo_de}**, con un cociente de {cociente} votos ({votos_lista} votos entre {divisor}). La siguiente en la cola era **{siguiente}**, con {cociente_sig}: le faltaron {falta} votos. {ultimo_de} podría haber perdido {perder} votos y conservarlo.
::: si no
El único escaño fue para **{ultimo_de}**: ninguna otra lista pasó del 3%.
:::

=== candidaturas_nota ===

[nota] De cada lista, solo su cabeza. [Lista completa en el BOE]({boe}).

=== evolucion ===

#### 2019 frente a 2023

[nota] Voto de cada partido en las generales de noviembre de 2019 y de julio de 2023, y sus escaños. La flecha dice si subió o bajó. Sumar, en 2019, es Unidas Podemos.

[[evolucion_tabla]]

=== dhondt ===

#### Reparto D'Hondt

[nota] Los votos de cada lista divididos entre 1, 2, 3... Los {escanos23} cocientes más altos se llevan los escaños (en color). Recuadrado, el último escaño; con raya discontinua, el siguiente de la cola. Solo entran las listas con al menos el 3% del voto válido.

[[dhondt_tabla]]

=== municipios ===

#### Municipios

[nota] Los {n} municipios de {provincia}, de más a menos votantes en las generales de 2023, con la lista más votada en cada uno. Pulsa uno para ver su historia.

[[municipios_lista]]

=== aire_fila ===

**{lleva}** se lo lleva y **{fuera}** se queda fuera: en {frecuencia} simulaciones.

=== dudoso_fila ===

El {k}.º escaño de **{partido}**: en {frecuencia} simulaciones.

=== tooltip_bloques ===
<!--
Mapa de la portada, vista "Bloques" (añadido por Claude el 16-11-2026): el globo de cada provincia. Cifras: {provincia}, {bloque}
(el bloque más votado), {ventaja} (puntos sobre el segundo), {izquierda}, {otros}, {derecha} (voto de cada bloque), {resto}
(candidaturas fuera de los tres bloques). Condiciones: proyeccion (2026; si no, 2023), resto (el resto llega al 0,5%).
Los bloques son los del recuadro "Forma tu mayoría", como los haya agrupado el lector.
-->
::: si proyeccion
**{provincia}**: el bloque con más voto sería **{bloque}**, con {ventaja} puntos de ventaja sobre el segundo.
::: si no
**{provincia}**: en 2023 el bloque con más voto fue **{bloque}**, con {ventaja} puntos de ventaja sobre el segundo.
:::
Izquierda {izquierda} · Otros {otros} · Derecha {derecha}
::: si resto
[nota] Otras candidaturas: {resto}.
:::

=== nota_bloques ===
<!--
Nota bajo el mapa en la vista "Bloques". Cifra: {fuera}, los partidos sin escaños en el escenario central (no están en el
recuadro) con el bloque en el que cuentan. Condiciones: proyeccion, fuera.
-->
::: si proyeccion
[nota] Cada provincia, en el color del bloque con más voto, con los grupos de "Forma tu mayoría": si mueves un partido de grupo, el mapa cambia. El voto de un bloque es la suma de las medianas de sus partidos; cuanto más oscuro, más ventaja le saca al segundo bloque.
::: si no
[nota] Cada provincia, en el color del bloque con más voto en las generales de julio de 2023, con los grupos de "Forma tu mayoría": si mueves un partido de grupo, el mapa cambia. Cuanto más oscuro, más ventaja le sacó al segundo bloque.
:::
::: si fuera
[nota] Sin escaños en el escenario central, y por eso fuera del recuadro, cuentan en su bloque de partida: {fuera}.
:::

=== pie_ficha ===
<!--
Pie de la ficha que se abre al pulsar una provincia en el mapa de la portada. Cifra: {participacion} (participación de 2023,
votantes entre censo, Interior); {frecuencia_reparto} (con qué frecuencia sale el reparto de escaños mostrado, el más frecuente:
"7 de cada 10"). Condiciones: proyeccion (2026), participacion, reparto. Nota de escaños reescrita por Claude el 17-11-2026.
Con el mapa en "Bloques" o "Cambios desde 2023" la ficha va por bloques (Claude, 16-11-2026, a petición de Víctor): {composicion}
dice quién forma cada bloque en esta provincia ("Izquierda, PSOE, Frente Amplio y ERC; Derecha, PP y Vox"; en 2026 los
partidos con un 1% o más); condiciones bloques (ficha por bloques) y bloques_proyeccion (2026, con {frecuencia_reparto} del
reparto entre bloques más frecuente).
-->
::: si participacion
Participación en 2023: {participacion}.
:::
::: si reparto
[nota] Escaños: el reparto más frecuente, que sale en {frecuencia_reparto} simulaciones (pasa el ratón o toca la cifra para ver el rango de cada partido). Votos estimados con los votos válidos de 2023. Variación en puntos sobre 2023.
:::
::: si bloques
[nota] Quién forma cada bloque aquí: {composicion}. Son los grupos de «Forma tu mayoría»: si mueves un partido de grupo, la ficha cambia.
:::
::: si bloques_proyeccion
[nota] Escaños: el reparto entre bloques más frecuente, que sale en {frecuencia_reparto} simulaciones (pasa el ratón o toca la cifra para ver el rango). El porcentaje de un bloque es la suma de los de sus partidos. Variación en puntos sobre 2023.
:::

=== tooltip_escanos ===
<!--
Mapa de la portada, vistas "por diputados" (añadido por Claude el 16-11-2026). Cifras: {provincia}; {lider} (el partido o bloque
con más escaños, o los empatados, "PP y PSOE"); {escanos} (sus escaños, con la palabra: "3 escaños"); {ventaja} y {ventaja_palabra} (escaños sobre el segundo);
{reparto} ("PP 3, PSOE 2, Vox 1", o por bloques); {prob_reparto} (con qué frecuencia sale ese reparto, 2026);
{frecuencias} ("PP, 6 de cada 10; PSOE, 3 de cada 10; empate, 1 de cada 10": quién tiene más escaños en las simulaciones, 2026).
Condiciones: proyeccion (2026), empate, bloques.
-->
::: si proyeccion
::: si empate
**{provincia}**: en el reparto más probable ({reparto}; sale en {prob_reparto} simulaciones) empatan **{lider}**, con {escanos} cada uno.
::: si no
**{provincia}**: en el reparto más probable ({reparto}; sale en {prob_reparto} simulaciones) el que más escaños tiene es **{lider}**, con {escanos}, {ventaja} {ventaja_palabra} más que el segundo.
:::
[nota] Con más escaños en las simulaciones: {frecuencias}.
::: si no
::: si empate
**{provincia}**: en 2023 empataron **{lider}**, con {escanos} cada uno ({reparto}).
::: si no
**{provincia}**: en 2023 el que más escaños sacó fue **{lider}**, con {escanos}, {ventaja} {ventaja_palabra} más que el segundo ({reparto}).
:::
:::

=== nota_escanos ===
<!--
Nota bajo el mapa en las vistas "por diputados". Cifra: {simulaciones}. Condiciones: proyeccion, bloques.
-->
::: si proyeccion
[nota] Cada provincia, en el color del que tiene más escaños en el reparto más probable de las {simulaciones} simulaciones; cuanto más oscuro, más escaños le saca al segundo. A rayas, los empates, frecuentes en las provincias pequeñas. Las etiquetas dan sus escaños (2=2 es un empate).
::: si no
[nota] Cada provincia, en el color del que más escaños sacó en las generales de julio de 2023; cuanto más oscuro, más escaños le sacó al segundo. A rayas, los empates. Las etiquetas dan sus escaños (2=2 es un empate).
:::
::: si bloques
[nota] Los bloques son los de "Forma tu mayoría": si mueves un partido de grupo, el mapa cambia.
:::

=== tooltip_cambios ===
<!--
Mapa de la portada, vista "Cambios desde 2023" (añadido por Claude el 16-11-2026). Cifras: {provincia}, {antes} (bloque con más
votos, o diputados, en 2023), {ahora} (el de la proyección de 2026), {frecuencia} (en cuántas simulaciones el primero no es el de
2023, "7 de cada 10"). Condiciones: cambia, escanos (por diputados; si no, por votos).
-->
::: si cambia
**{provincia}**: cambia de bloque. En 2023, **{antes}**; en la proyección de 2026, **{ahora}**.
::: si no
**{provincia}**: sin cambio, **{ahora}** en 2023 y en la proyección de 2026.
:::
::: si escanos
[nota] El primero en diputados deja de ser el de 2023 en {frecuencia} simulaciones.
::: si no
[nota] El primero en votos deja de ser el de 2023 en {frecuencia} simulaciones.
:::

=== nota_cambios ===
<!--
Nota bajo el mapa en la vista "Cambios desde 2023". Cifras: {cambian} (provincias que cambian de bloque), {simulaciones}
(simulaciones usadas: 4.000 por diputados, las 500 primeras por votos). Condición: escanos.
-->
::: si escanos
[nota] {cambian} provincias cambian de bloque con más diputados respecto a 2023, en el reparto más probable de la proyección. En color fuerte y con borde, las que cambian; apagadas, las que no. Los bloques son los de "Forma tu mayoría": si mueves un partido de grupo, el mapa cambia. La frecuencia del cambio sale de {simulaciones} simulaciones.
::: si no
[nota] {cambian} provincias cambian de bloque con más votos respecto a 2023: el bloque que queda primero en más simulaciones no es el de 2023. En color fuerte y con borde, las que cambian; apagadas, las que no. Los bloques son los de "Forma tu mayoría": si mueves un partido de grupo, el mapa cambia. La frecuencia del cambio sale de {simulaciones} simulaciones.
:::

=== tooltip_peso ===
<!--
Mapa de la portada, vista "Dónde pesa tu voto" (Claude, 16-11-2026, a petición de Víctor). Cifras: {provincia}; {bloque}
("la derecha" o "la izquierda", el bloque elegido con los grupos de "Forma tu mayoría"); {votos} (el paquete de votos, 1.000);
{lista} ("PP, 18 de cada 1.000; Vox, 12 de cada 1.000": con qué frecuencia esos votos a cada partido del bloque le dan un
escaño más al bloque, de mejor a peor). Condición: parejas (las dos primeras opciones pesan casi lo mismo: la segunda da al
menos 4 de cada 5 de lo que da la primera).
-->
**{provincia}**: {votos} votos más dan a {bloque} un escaño más en estas simulaciones, según a qué partido vayan: {lista}.
::: si parejas
[nota] Las primeras opciones pesan casi lo mismo.
:::

=== nota_peso ===
<!--
Nota bajo el mapa en la vista "Dónde pesa tu voto". Cifras: {bloque}, {votos}. Condición: otro_modelo (el selector de arriba
tiene otro modelo; esta vista usa siempre "Nuestra predicción").
-->
[nota] **Qué es.** Para quien quiere que {bloque} saque más escaños: en cada provincia, con qué frecuencia {votos} votos más a cada partido de ese bloque le dan un escaño más, en las simulaciones de «Nuestra predicción». La etiqueta dice el partido con el que más pesa el voto; si el segundo pesa casi lo mismo, los dos, y si son tres o más, «varios, parecido». Un escaño que un partido le quita a otro del mismo bloque no suma. Los bloques son los grupos de «Forma tu mayoría»: si mueves un partido de grupo, el mapa cambia.

[nota] **Cómo leerlo.** Lo útil es comparar los partidos dentro de tu provincia. Entre provincias, las pequeñas salen más oscuras porque allí {votos} votos son una parte mayor del total. No es una recomendación de voto: describe la previsión, con su incertidumbre, y supone que el resto vota como se prevé.
::: si otro_modelo
[nota] Esta vista usa siempre «Nuestra predicción», aunque arriba hayas elegido otro modelo.
:::

=== pie_peso ===
<!--
Pie de la ficha de una provincia en la vista "Dónde pesa tu voto". Cifras: {bloque}, {votos}. Condiciones: vacia (ningún
partido del bloque tiene opciones de escaño en la provincia), parejas (como en tooltip_peso).
-->
::: si vacia
[nota] Aquí ningún partido de {bloque} tiene opciones de escaño.
:::
::: si no
[nota] De cada 1.000 simulaciones: cuántas veces {votos} votos más a ese partido dan un escaño más a {bloque} (primera columna) y cuántas se lo dan al partido, aunque sea quitándoselo a otro del mismo bloque (segunda).
:::
::: si parejas
[nota] Las primeras opciones pesan casi lo mismo.
:::
