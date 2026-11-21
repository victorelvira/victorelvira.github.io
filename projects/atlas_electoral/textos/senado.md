<!--
Senado (pestaña Senado, #senado; #senado/2023 abre los resultados de 2023). Cómo se escribe: textos/README.md.

Parte principal (la página):
  [[cabecera]]       los botones "Congreso | Senado" y "Proyección 2026 | Resultados 2023" con el título de la sección
  [[panel]]          las tres columnas: hemiciclo y tabla, mapa de circunscripciones, lista por comunidades
  [[coaliciones]]    las listas conjuntas del 29N
  Cifras de la metodología:
  {simulaciones}     número de simulaciones (4.000); {fecha} día de la predicción
  {p_base}           de cada 100 simulaciones, en cuántas llega el PP solo a la mayoría (65)
  {p_2023}, {pp_2023}  lo mismo y la mediana de senadores del PP si el PP saca en el Senado lo de 2023 frente al Congreso
  {offset_pp}, {offset_2023}  cuánto más voto saca el PP en el Senado que en el Congreso, comparado con el PSOE (media de 2019-2023 y solo 2023), en %
  {p_lambda05}, {p_lambda1}   si las listas conjuntas conservan la mitad o todo el voto de los socios
  {lambda}           parte del voto de los socios que conservó la única lista conjunta de 2019-2023 (Eivissa-Formentera 2023)
  {p_omega0}, {p_omega05}     si ningún votante sin lista marca otra, o si lo hace la mitad
  {p_andalucia}      si el PP cede a Vox uno de sus designados de Andalucía
  {aciertos_2023}    senadores de 2023 cuyo partido acierta el reparto más probable (de 208), probado sin mirar 2023
  {camara}, {mayoria}, {electos_total}, {designados_total}

Parte "titulo_2026" y "titulo_2023": el título de la sección, junto al botón.

Parte "titular_2026" (encima del hemiciclo):
  {pp_total} senadores del PP (mediana), {pp_lo} y {pp_hi} su rango en 9 de cada 10 simulaciones,
  {pp_electos} electos y {pp_designados} designados, {camara}, {mayoria}, {p_pp} y {p_pp_vox} de cada 100
  simulaciones con mayoría del PP solo y con Vox, {simulaciones}
Parte "nota_2026" (debajo de la tabla): {sin_asignar} escaños que las medianas no reparten, {electos_total}, {designados_total}
  Condición: sin_asignar (las medianas no suman toda la cámara)
Parte "titular_2023": {pp_electos23}, {psoe_electos23}, {electos23}
Parte "nota_2023": {designados_no}, {participacion}, {blancos}, {nulos}
Partes "mapa_2026", "mapa_2023", "comunidades_2026", "comunidades_2023": rótulos y notas de la columna central y de la derecha
Parte "coaliciones_intro": la frase bajo el título de las coaliciones
-->
# El Senado

[sub] Cuántos senadores puede tener cada partido el 29N, provincia a provincia, y cómo quedó la cámara en 2023.

[[cabecera]]

[[panel]]

## Las listas conjuntas {#coaliciones | Coaliciones}

[[coaliciones]]

::: metodología #metodo
**Cómo se vota.** Cada provincia peninsular elige 4 senadores y cada votante marca hasta 3; las islas mayores eligen 3, Ceuta y Melilla 2 y las islas menores 1. Ganan los candidatos con más votos, sea cual sea su lista. Desde este año Ibiza y Formentera eligen uno cada una, así que se eligen {electos_total}. Los parlamentos autonómicos designan otros {designados_total}: la cámara tiene {camara} senadores y la mayoría absoluta está en {mayoria}.

**De dónde sale.** De las mismas {simulaciones} simulaciones del voto al Congreso del modelo (actualizado el {fecha}). En cada una, el voto de cada partido al Congreso se convierte en votos a sus candidatos al Senado con lo que pasó en 2019 y 2023, y ganan los más votados. Los designados se fijan con los parlamentos actuales: no dependen del 29N. Probado en 2023 con lo aprendido en 2019, el reparto más probable acierta el partido de {aciertos_2023} de los 208 senadores.

**Lo que más pesa.** Tres supuestos mueven la probabilidad de que el PP llegue solo a {mayoria}, que con todo como está sale en {p_base} de cada 100 simulaciones:

*Cuánto más saca el PP en el Senado que en el Congreso.* En las dos elecciones de 2019, con Ciudadanos, sus candidatos al Senado sacaron bastante más que su lista al Congreso; en 2023, casi lo mismo. Usamos la media de las tres elecciones (un {offset_pp} más, comparado con el PSOE). Si se repite lo de 2023 (un {offset_2023}), el PP se queda en {pp_2023} senadores y la mayoría baja a {p_2023} de cada 100.

*Cuánto voto de los socios conservan las listas conjuntas.* El PSOE va con IU y Movimiento Sumar (Senado de Progreso) en casi todas las provincias. Solo hubo una lista así en 2019-2023, la de Eivissa-Formentera, que conservó el {lambda} del voto de sus socios. Si conservaran la mitad, la mayoría del PP saldría en {p_lambda05} de cada 100; si lo conservaran todo, en {p_lambda1}.

*Votantes sin lista al Senado.* Vox no presenta lista al Senado en Valencia ni en Castellón y lleva un solo candidato en 16 provincias; SALF no presenta ninguna. Suponemos que entre ninguno y la mitad de esos votantes marca la lista más cercana. Si no lo hiciera ninguno, {p_omega0} de cada 100; si lo hiciera la mitad, {p_omega05}.

Si el PP cede a Vox uno de sus designados de Andalucía, como contó la prensa en julio, la mayoría del PP solo sale en {p_andalucia} de cada 100 simulaciones.

**Las islas.** Cada isla es su propia circunscripción y se dibuja con el contorno de sus municipios. Sin encuestas por isla, el voto de cada partido en cada isla parte de su peso en 2023, con ruido.
:::

=== titulo_2026 ===
El Senado del 29N, según el modelo

=== titulo_2023 ===
Punto de partida: así quedó el Senado en 2023

=== titular_2026 ===
<div class="sn-titular">El PP, {pp_total} de {camara} senadores</div>

[sub] Mediana de {simulaciones} simulaciones: {pp_electos} electos y {pp_designados} designados. En 9 de cada 10, entre {pp_lo} y {pp_hi}.

[línea] La mayoría absoluta está en **{mayoria}**. El PP la alcanza por sí solo en **{p_pp} de cada 100** simulaciones; con Vox, en **{p_pp_vox} de cada 100**.

=== nota_2026 ===
[nota] El hemiciclo pone la mediana de cada partido. Los designados por los parlamentos autonómicos van en color claro.
::: si sin_asignar
[nota] Las medianas no suman la cámara entera: {sin_asignar} escaños, en gris, caen de un lado u otro según la simulación.
:::

=== titular_2023 ===
<div class="sn-titular">El PP, {pp_electos23} de {electos23} senadores electos</div>

[sub] El PSOE sacó {psoe_electos23}. El PP tuvo mayoría absoluta en la cámara con los designados.

=== nota_2023 ===
[nota] Se eligieron 208 senadores; los parlamentos autonómicos designan otros {designados_no}, que no salen aquí. El voto de cada lista es el de su candidato más votado.

[nota] Participación {participacion}. Votos en blanco {blancos}; nulos {nulos}.

=== mapa_2026 ===
### Partido con más senadores en cada circunscripción

[nota] Reparto más probable. Más intenso, más seguro: pasa el ratón (o toca) para ver con qué frecuencia sale y las alternativas.

=== mapa_2023 ===
### Partido con más senadores en cada circunscripción

[nota] Resultado de julio de 2023. En 2023 Ibiza y Formentera elegían juntas un senador.

=== comunidades_2026 ===
### Por comunidad autónoma

[nota] Electos en el reparto más probable de cada circunscripción, más los designados por su parlamento.

=== comunidades_2023 ===
### Por comunidad autónoma

[nota] Senadores electos en 2023.

=== coaliciones_intro ===
[sub] Al Senado se presentan juntos partidos que al Congreso van por separado. Así las cuenta el modelo: cada lista conjunta suma el voto al Congreso de sus partidos, con el descuento de la metodología.
