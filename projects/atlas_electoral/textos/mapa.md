<!--
Mapa municipal (pestaña Mapa y el bloque "Municipio a municipio" de Generales). Cómo se escribe: textos/README.md.

Parte principal:
  Sin cifras.
  Condiciones:
    embed        el mapa va dentro de otra página (Generales): sin título y con buscador de municipio
  Bloques que pone el código: [[msearch]] (buscador), [[controles]] (tipo de elección, modo y partido),
  [[linea_tiempo]] (botón ▶ y deslizador), [[mapa]], [[leg]] (leyenda, rehecha en cada elección),
  [[nat]] (barra del total).
  La nota final se repite entera en las dos ramas porque una frase no se puede partir con una condición.

Parte "sin_avances": se muestra en lugar de la leyenda cuando no hay avances de participación por municipio.

Parte "fuentes_autonomicas" (bajo la leyenda en el mapa de autonómicas):
  {fuentes}    la elección usada en cada comunidad, p. ej. "Andalucía 2022 · Aragón 2023 · ..."

Parte "titulo_total" (el título sobre la barra del total, se rehace en cada elección):
  {año}        año del mapa de autonómicas
  {eleccion}   nombre de la elección, p. ej. "Generales 2023"
  Condiciones:
    autonomicas  el mapa es el compuesto de autonómicas

Parte "nota_total": la nota bajo la barra del total.
-->
::: si embed
[[msearch]]
::: si no
# ¿Qué votó cada municipio?

[sub] Generales y municipales desde 1977, Senado desde 1986, europeas desde 1987 y autonómicas desde 1982, municipio a municipio. Pasa el ratón (o toca) para ver el detalle y pulsa para abrir la ficha del pueblo.
:::

[[controles]]
[[linea_tiempo]]
[[mapa]]
[[leg]]

<h2 id="nat-h"></h2>

[[nat]]

::: si embed
[nota] Gris: sin datos (municipio inexistente en esa fecha o no incluido en la fuente).
::: si no
[nota] Gris: sin datos (municipio inexistente en esa fecha o no incluido en la fuente). En municipales, los pueblos de hasta 250 habitantes votan con listas abiertas: el voto de cada lista se aproxima por el de su candidato más votado y no hay dato de participación.
:::

=== sin_avances ===

[nota] Interior no publica avances por municipio para esta elección.

=== fuentes_autonomicas ===

[nota] Elección autonómica usada en cada comunidad: {fuentes}. Hasta 2012, Ministerio del Interior; desde 2012, portales oficiales de cada comunidad. Sin datos municipales de Cataluña y País Vasco 1980 ni de Galicia 1981 y 1985.

=== titulo_total ===

::: si autonomicas
Suma de las últimas autonómicas · {año}
::: si no
Total España · {eleccion}
:::

=== nota_total ===

[nota] Sobre votos a candidaturas en municipios (sin voto exterior).
