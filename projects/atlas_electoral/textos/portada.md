<!--
Portada (pestaña 29N). Cómo se escribe: textos/README.md.

Cifras disponibles:
  {dias}               días que faltan para el 29N
  {ultimo_campo}       fecha de la última encuesta del modelo (p. ej. "13 de noviembre")
  {ppvox_176}          de cada 100 simulaciones, en cuántas PP y Vox llegan a 176 (sin uso desde el 16-11-2026: la frase repetía las tarjetas, nota de Víctor)
  {pp_primero}         de cada 100, en cuántas el PP queda primero
  {simulaciones}       número de simulaciones del modelo elegido en el selector (4.200 en la media: 600 de cada
                       uno de los siete modelos; 4.000 en cada modelo por separado)
  {fecha_datos}        fecha de los datos (si no hay modelo)
  {elecciones}         elecciones generales del backtest (13); el backtest es el del modelo K0, no el de la media
  {desde}              año de la primera (1986)
  {acierto_voto}       % de resultados de voto dentro del rango del 90%, una semana antes (modelo K0)
  {acierto_escanos}    lo mismo en escaños (modelo K0)
  {error_x15}          probabilidad de 176 si el error de las encuestas fuera un 50% mayor (modelo K0)
  {error_x08}          probabilidad de 176 si fuera un 20% menor (modelo K0)
  {fuente_escanos}     de dónde salen los escaños por provincia de 2026
  {cambios_escanos}    provincias que cambian de escaños respecto a 2023

Condiciones: antes / hoy / despues (del día de la votación), modelo, provincias, validacion,
sensibilidad, movilizacion, cambios.
-->
# Elecciones generales en España · 29 de noviembre de 2026


::: si antes
[sub] Faltan **{dias} días** para las elecciones generales. Se eligen 350 diputados y 209 senadores.
:::
::: si hoy
[sub] **Hoy se vota.** Se eligen 350 diputados y 209 senadores.
:::
::: si despues
[sub] Se eligen 350 diputados y 209 senadores.
:::

[[índice]]

## Qué dice nuestro modelo <span class="tag-exp">modelo experimental</span> {#diputados | Qué dice el modelo}

::: si modelo
[nota] Últimos datos utilizados: encuestas hasta el {ultimo_campo}. Modelo actualizado el {ultimo_modelo}.

### Resumen {#resumen | Resumen}

[[resultados]]

::: metodología #metodo
**Las encuestas.** Todas las encuestas nacionales publicadas desde las generales de 2023, con su trabajo de campo y su muestra. Las encuestas que acumulan entrevistas día a día no cuentan varias veces las mismas: en SW Demoscopia, cada día nuevo entra como una encuesta pequeña con solo sus entrevistas nuevas; Sociométrica, que da más peso a lo reciente, entra con su última ola. Las encuestas encargadas por partidos y las reestimaciones del CIS hechas por terceros se muestran pero no entran. El CIS entra tal como lo publica, y los modelos que corrigen la tendencia de cada encuestadora descuentan su inclinación habitual, aunque este año el recuerdo de voto de sus entrevistados se aleja del resultado de 2023 más que en elecciones anteriores.

**Nuestra predicción: siete modelos, el mismo peso.** Lo que se ve por defecto combina siete modelos de familias distintas, uno por familia, cada uno con el mismo peso. No se promedian sus escaños: se juntan sus simulaciones completas, voto provincia a provincia incluido, y de ellas salen los escaños, el mapa y el Senado. Todos usan esas encuestas y asignan los escaños con las mismas reglas. Se diferencian en tres cosas: si corrigen la tendencia de cada encuestadora a inclinarse hacia unos partidos (tres lo hacen, a partir de lo que se desvió cada una en 2023; cuatro no), cuánto pesan las encuestas recientes frente a las antiguas, y si el paso a las provincias tiene en cuenta las autonómicas, municipales y europeas celebradas desde 2023 (solo uno). Uno de ellos, el estilo Demócrata, deja fuera el CIS. El selector de arriba muestra cada modelo por separado y el que publicábamos hasta ahora (K0).

**Por qué el mismo peso.** Probamos a dar a cada modelo un peso según lo que habría acertado en las 13 elecciones generales desde 1986. Con tan pocas elecciones, el peso se concentra en uno o dos modelos y no acierta de forma clara más que el mismo peso para todos: eso es elegir, no combinar.

**El error de las encuestas.** El día de la votación cada modelo añade un error común a todas las encuestas, calibrado con lo que se equivocó en cada elección general desde 1982 y correlacionado por bloques: cuando las encuestas se equivocan con un partido de la derecha, suelen equivocarse en el mismo sentido con los demás. ERC, Junts, Bildu y PNV tienen su propia escala de error.

**De votos a escaños.** En cada simulación, el voto nacional se lleva a cada provincia con el mapa de 2023 (Frente Amplio, Podemos y SALF, con el de las europeas de 2024), más una variación aleatoria por comunidad y por provincia (uno de los siete corrige antes ese mapa con las elecciones celebradas desde 2023). Las listas que no se presentan en una provincia ceden sus votos a la lista conjunta que las incluye o los reparten entre las demás. Los escaños se asignan con D'Hondt y la barrera del 3%.

**Cuánto fiarse.** El modelo que publicábamos hasta ahora (K0) se rehízo para las elecciones generales desde 1986 con solo las encuestas de cada momento: una semana antes, unos 9 de cada 10 resultados cayeron dentro de su rango, el que recoge 9 de cada 10 simulaciones. La combinación de los siete no se ha probado así como tal. Ver [Cuánto fiarse](#modelo/fiarse).

**Lo que no hace.** No usa las encuestas provinciales ni modela la participación por separado.
:::
::: si no
[sub] Reparto de las encuestas a día {fecha_datos}.

::: tarjeta
[[proj]]
[[bloques]]

[nota] Arrastra un partido a otro grupo. La mayoría son 176 diputados. Reparto del promedio de encuestas provincia a provincia con D'Hondt, sin márgenes de error. [Prueba otros porcentajes →](#simulador)
:::
:::

## El modelo explicado {#voto}

[Todo el modelo, en la pestaña Modelo →](#modelo)

Lo que se ve por defecto es nuestra predicción: siete modelos de familias distintas, con el mismo peso cada uno. Todos parten de las encuestas publicadas; unos corrigen la tendencia de cada encuestadora a sobrestimar o subestimar a cada partido y otros no. Cada uno añade el error que han tenido las encuestas en las elecciones generales desde 1982, simula miles de resultados posibles ({simulaciones} en lo que estás viendo) y reparte los escaños provincia a provincia. Las cifras de arriba resumen esas simulaciones. [Metodología](#inicio/metodo) · [El modelo estadístico, en detalle →](#modelo)

Usamos todas las encuestas disponibles hasta el {ultimo_campo}, con los modelos actualizados el {ultimo_modelo}.

El promedio de las encuestas. Todas, una a una y por encuestadora, en [Encuestas](#encuestas).

[[promedio]]
[[chart-area]]

[nota] [Elegir encuestadoras, en Encuestas 29N →](#encuestas) · [Las elecciones pasadas, en Encuestas históricas →](#historico)

::: si provincias
## Dónde se decide {#aire}

[sub] El reparto se juega provincia a provincia. Estas son las provincias con más escaños en el aire: escaños que ningún partido gana en al menos 9 de cada 10 simulaciones.

[[pugnas]]

[[pugnas_todas]]

### Los 350 escaños, uno a uno {#escanos350 | 350 escaños}

[sub] Cada punto es un escaño concreto: el primero del PSOE en Soria, el segundo del PP en Navarra. Relleno, el que su partido gana en 99 de cada 100 simulaciones o más; más claro, en 75 de cada 100 o más; hueco, el que está en juego. Al tocar un punto sale de qué provincia es y por cuántos votos se gana o se pierde.

[[parlamento]]

[nota] Con las simulaciones de «Nuestra predicción», sea cual sea el modelo elegido arriba. En cada provincia, los escaños que más veces gana algún partido, tantos como reparte. Los votos de margen son los de la simulación mediana, en votos de 2023.

### Opciones de escaño por partido {#opciones | Opciones}

[sub] En el hemiciclo, cada escaño va a su partido más probable. Aquí se cuenta cada escaño que un partido gana en al menos 1 de cada 4 simulaciones, aunque lo pierda más veces de las que lo gana. Un escaño disputado aparece una vez por cada partido que puede ganarlo, así que la suma pasa de 350.

[[opciones]]

[nota] Casi seguros: los gana en 99 de cada 100 simulaciones o más; probables, en 75 de cada 100 o más; en juego, entre 25 y 75 de cada 100. Toca una barra para ver en qué provincias están.

### Provincia a provincia {#mosaico | Provincias}

[sub] Las mismas opciones, en su provincia: cada cuadradito es un escaño que un partido gana en al menos 1 de cada 4 simulaciones. Filtra por partido o por seguridad, y toca una provincia para ver sus opciones, sus escaños y su voto.

[[mosaico]]

[nota] Cada casilla es una provincia, más o menos en su sitio. Macizo, casi seguro; claro, probable; rayado, en juego (los mismos umbrales que arriba). En la ficha, cada barra se oscurece donde más simulaciones caen; la raya negra es la mediana y la caja recoge 9 de cada 10 simulaciones. Entre paréntesis, la diferencia con 2023.

### Juega a simular la noche {#simula | Simula}

[sub] Una probabilidad se entiende mejor contando noches. Aquí hay tres escaños de verdad: uno casi seguro, uno probable y uno en juego. En cada noche simulada, cada escaño se gana o se pierde con la frecuencia que le da el modelo. Simula una noche, diez o cien, y cuenta cuántas veces se pierde cada uno.

[[simula]]

[nota] Cada escaño se sortea por separado. En el modelo, en cambio, los escaños se mueven juntos: una mala noche para un partido le quita escaños en muchas provincias a la vez.

[[mapa_portada]]
:::

## Calendario {#calendario}

[[calendario]]

::: si cambios
[nota] Escaños por provincia en 2026 {fuente_escanos}: {cambios_escanos}.
:::

::: mosaico
<a class="tile" href="#generales"><b>Generales 1977-2023</b><span>El Congreso elección a elección, voto, participación, el mapa municipal</span></a>
<a class="tile" href="#simulador/encuestas"><b>Simulador</b><span>Mueve los porcentajes y mira los escaños, mayorías y último escaño por provincia</span></a>
<a class="tile" href="#encuestas"><b>Encuestas 29N</b><span>Todas las encuestas hacia el 29N, su promedio, las encuestadoras y la cocina</span></a>
<a class="tile" href="#historico"><b>Encuestas históricas</b><span>Las encuestas de cada elección desde 1982 y quién acierta</span></a>
:::

=== pugna ===

::: si margen
**{provincia}**: {en_juego} de sus {escanos} escaños en el aire. La pugna más habitual por el último es entre **{ultimo_de}**, que se lo lleva, y **{primera_fuera}**, que se queda fuera a unos {margen} votos (en {frecuencia} simulaciones).
::: si no
**{provincia}**: {en_juego} de sus {escanos} escaños en el aire. La pugna más habitual por el último es entre **{ultimo_de}**, que se lo lleva, y **{primera_fuera}**, que se queda fuera (en {frecuencia} simulaciones).
:::

=== noche ===

[antetítulo] {titulo_noche}

<h2 style="margin-top:4px">Escrutado el {escrutado}% · {hora}</h2>

[[live-seats]]
[[tabla_noche]]

[nota] Participación {participacion}% · datos provisionales del Ministerio del Interior; se actualiza cada minuto. Los escaños definitivos los proclaman las juntas electorales.

=== mapa ===
<!--
El mapa de la portada, dentro de "Dónde se decide" (donde está [[mapa_portada]]; lo añadió Claude el 16-11-2026). [[mapa_masvotado]]
es el mapa con su botón Proyección 2026 / Resultados 2023, su leyenda y su nota (la nota y el globo son los del modo "Más votado"
de la pestaña Provincias: partes nota_mas_votado y tooltip_mas_votado de provincia.md). Cifra: {modelo}, el nombre del modelo
elegido en el selector. Condición: otro_modelo (el modelo elegido no tiene mapa propio; desde el 16-11-2026 cada modelo del selector tiene el suyo,
data/provincias/<modelo>.json, así que solo sale si falta ese archivo).
-->
### Quién gana en cada provincia {#mapa-provincias | Mapa}

[sub] Cada provincia, en el color del partido más votado; las etiquetas dan la provincia y el porcentaje del primero. Pulsa o toca una provincia para ver su reparto; desde ahí se abre su ficha.

::: si otro_modelo
[nota] Este mapa es el de «Nuestra predicción»: «{modelo}», elegido arriba, no tiene resultados por provincia.
:::

[[mapa_masvotado]]


=== cambio_casas ===
<!-- Below the poll chart of "El modelo explicado" (inicio.js; Claude, 2026-11-15). Figures from data/cambio_casas.json
(pipeline/cambio_casas.py, every morning). {frase_cambio}: the parties that move most clearly, e.g. "Podemos baja en 13 de
14"; {n_casas}: how many pollsters. [[tabla_cambio]]: the table per pollster, folded. -->
[nota] **Cada encuestadora comparada consigo misma.** Entre su última encuesta y la que publicó de 3 a 8 semanas antes: {frase_cambio} ({n_casas} encuestadoras). Así no cuenta que unas casas den siempre más a un partido que otras. Describe los datos: el modelo ya incluye estas encuestas y no prolonga la tendencia hasta el 29N.

[[tabla_cambio]]

=== aviso_veda ===
<!--
Aviso de la veda (LOREG art. 69.7; docs/protocolo_29N.md, sección 8): arriba del todo en Resumen, Modelo, Senado, Encuestas 29N
y Provincias, del 24 de noviembre a las 00:00 al 29 a las 20:00, hora de Madrid. Lo decide el navegador por la fecha, sin despliegue
(src/textos.js, VEDA); ?veda=1 en la dirección lo enseña antes, para probarlo. Cualquier texto puede usar "::: si veda".
-->
**Previsión congelada el 23 de noviembre.** La ley electoral prohíbe publicar encuestas en los cinco días anteriores a la votación. Esta previsión usa las encuestas conocidas hasta el lunes 23 y no cambiará hasta el cierre de los colegios. Los resultados, en esta misma página la noche del 29.

=== tooltip_350 ===
<!--
"Los 350 escaños, uno a uno" (Claude, 16-11-2026, a petición de Víctor). Cifras: {provincia}; {escano} ("2.º"); {partido};
{frecuencia} ("97 de cada 100", "más de 999 de cada 1.000"); {votos} (margen en la simulación mediana, sin signo); {quien}
("PSOE (6 de cada 10), Vox (3 de cada 10)": quién se lo lleva cuando lo pierde). Condiciones: sobran (margen positivo), faltan,
quien.
-->
**{provincia}**, {escano} escaño de **{partido}**: lo gana en {frecuencia} simulaciones.
::: si sobran
[nota] En la simulación mediana le sobran unos {votos} votos.
:::
::: si faltan
[nota] En la simulación mediana le faltan unos {votos} votos.
:::
::: si quien
[nota] Cuando lo pierde, se lo lleva: {quien}.
:::

=== opciones_resumen ===
<!--
"Opciones de escaño por partido" (Claude, 17-11-2026, a petición de Víctor). Cifras: {seguros}, {probables}, {juego} (opciones de
cada clase), {total} (su suma), {provincias} ("Madrid (10), Barcelona (9)": las de más opciones en juego).
-->
Hay **{seguros}** opciones casi seguras, **{probables}** probables y **{juego}** en juego: {total} en total, más que los 350 escaños porque varios partidos pueden ganar el mismo. Más opciones en juego: {provincias}.

=== tooltip_opciones ===
<!--
Al tocar una barra de "Opciones de escaño por partido". Cifras: {partido}, {clase} ("en juego"), {n}, {lista} (provincias y
escaños, o provincias y cuántos). Condición: lista.
-->
**{partido}**, {clase}: {n}.
::: si lista
[nota] {lista}
:::

=== dia_titulo ===
<!--
Título del bloque "Evolución día a día" (hasta el 18-11-2026, "Cómo vamos, día a día"; nota 9 de Víctor) (src/dia.js, lo añadió Claude el 18-11-2026), debajo de "¿Quién llega a 176?".
-->
#### Evolución día a día

=== dia_frase ===
<!--
Frase encima del gráfico; cambia con el periodo elegido. Cifras: {desde} (primer día del periodo), {antes} y {hoy} ("92 de cada
100": en cuántas simulaciones llegan PP y Vox a 176), {esc_antes} y {esc_hoy} (escaños esperados de PP y Vox), {inv_antes} y {inv_hoy} (lo mismo para el bloque de la investidura de 2023). Condición: igual
(la frecuencia redondeada no cambia).
-->
::: si igual
Desde el {desde}, PP y Vox llegan a 176 en {hoy} simulaciones, igual que entonces ({esc_antes} escaños esperados entonces, {esc_hoy} hoy). El bloque de la investidura de 2023, en {inv_hoy}.
::: si no
El {desde}, PP y Vox llegaban a 176 en {antes} simulaciones; hoy, en {hoy} ({esc_antes} escaños esperados entonces, {esc_hoy} hoy). El bloque de la investidura de 2023, en {inv_antes} entonces y {inv_hoy} hoy.
:::

=== dia_nota ===
<!--
Nota bajo el gráfico. Cifras: {diario_desde} (desde cuándo hay un punto por día). Condición: semanal (el periodo incluye días
anteriores a {diario_desde}, con un punto por semana).
-->
::: si semanal
[nota] Cada día, «Nuestra predicción» rehecha con las encuestas que se conocían ese día y el modelo de hoy: si la línea se mueve, se movieron las encuestas, no el modelo. En «Bloques», cada banda recoge 9 de cada 10 simulaciones y la raya marca la mayoría de 176; el bloque de la investidura es el de las tarjetas de arriba. Antes del {diario_desde}, un punto por semana.
::: si no
[nota] Cada día, «Nuestra predicción» rehecha con las encuestas que se conocían ese día y el modelo de hoy: si la línea se mueve, se movieron las encuestas, no el modelo. En «Bloques», cada banda recoge 9 de cada 10 simulaciones y la raya marca la mayoría de 176; el bloque de la investidura es el de las tarjetas de arriba.
:::

=== tooltip_mosaico ===
<!--
Al pasar por una casilla de "Provincia a provincia" (src/mosaico.js). Cifras: {provincia}, {escanos}, {seguros}, {probables},
{juego} (opciones de escaño de cada clase en la provincia).
-->
**{provincia}**, {escanos} escaños: {seguros} opciones casi seguras, {probables} probables y {juego} en juego.

