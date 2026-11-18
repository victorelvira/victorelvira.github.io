<!--
Tu voto (pestaña Tu voto, #voto; #voto/<provincia>/<bloque> abre una provincia y un bloque). Cómo se escribe: textos/README.md.
Añadida por Claude el 17-11-2026, a petición de Víctor ("lo de dónde votar mejor, como pestaña propia"). Datos: peso_voto.json
(pipeline/peso_voto.py), siempre «Nuestra predicción». Los bloques son los de partida de «Forma tu mayoría» (en Navarra, Geroa Bai
con el PNV). El 18-11-2026, a petición de Víctor, sin selector de cómo irá la noche y sin «1 entre N»: se compara cuántas veces
más posibilidades tiene un voto a un partido que a otro de sumar un diputado al bloque.

Cifras de la metodología: {mediana}, {corte_bajo}, {corte_alto}, la ventaja nacional de la derecha sobre la izquierda en puntos
(mediana y cortes entre tercios; peso_voto.json "escenarios").

Huecos [[...]]: [[controles]] (la provincia y el bloque), [[respuesta]] (la frase y las líneas de la provincia elegida), [[lista]]
(todas las provincias).
-->
# Tu voto

## Dónde pesa tu voto {#peso | Dónde pesa}

[sub] Si quieres que un bloque saque más escaños, ¿con qué partido de ese bloque pesa más tu voto en tu provincia? Elige dónde votas y qué bloque prefieres.

[[controles]]

[[respuesta]]

## Todas las provincias {#todas | Todas}

[sub] La mejor opción de cada bloque en cada provincia, la segunda y cuántas veces más posibilidades tiene un voto a la primera de sumar un diputado al bloque. Pulsa una cabecera para ordenar.

[[lista]]

::: metodología
Para cada provincia y cada simulación de «Nuestra predicción» (140.000), contamos cuántos votos más necesita cada lista para ganar un escaño más con la regla D'Hondt y el mínimo del 3%, y a quién se lo quitaría. Un escaño cuenta para el bloque solo si sale de otro bloque: si el PP se lo quita a Vox, la derecha no gana nada. Damos 1.000 votos nuevos a cada partido y contamos en qué parte de las simulaciones el bloque gana un escaño. Esa parte es proporcional a las posibilidades de que un solo voto a ese partido sume un diputado al bloque, y lo que publicamos es el cociente entre partidos: «un voto al PNV tiene 1,2 veces más posibilidades que uno al PSOE». Las posibilidades de un solo voto, en sí, son siempre muy pequeñas, de una entre cientos de miles o millones, y por eso no las damos: lo que sirve para decidir es la comparación dentro de tu provincia. Las cuentas son sobre todas las simulaciones. Debajo avisamos si la mejor opción cambia según cómo vaya la noche: partimos las simulaciones en tres tercios según la ventaja nacional en votos de la izquierda (PSOE, Frente Amplio, Podemos, ERC, Bildu, PNV) sobre la derecha (PP, Vox, SALF) y repetimos el cálculo en cada tercio. Con los datos de hoy, la derecha saca unos {mediana} puntos de ventaja a la izquierda en votos en la simulación mediana; el tercio bueno para la izquierda es el de las simulaciones en que esa ventaja baja de {corte_bajo} puntos, el del medio va de {corte_bajo} a {corte_alto}, y el bueno para la derecha, el de más de {corte_alto}. Supone que el resto vota como se prevé, y no es una recomendación de voto: describe la previsión, con su incertidumbre. Los bloques son los de partida de «Forma tu mayoría»; en Navarra, Geroa Bai cuenta con el PNV.
:::

=== respuesta ===
<!--
La frase de la provincia elegida. Cifras: {provincia}; {bloque} ("la derecha", "la izquierda"); {mejor} (el partido con el que
más pesa el voto, con artículo: "el PSOE"). Condición: vacia (ningún partido del bloque tiene opciones).
-->
::: si vacia
En **{provincia}**, ningún partido de {bloque} tiene opciones reales de ganar un escaño más: aquí un voto casi nunca cambia el reparto.
::: si no
En **{provincia}**, si quieres más escaños para {bloque}, tu voto tiene más posibilidades de sumar un diputado con **{mejor}**. Frente a los demás:
:::

=== partido ===
<!--
Una línea por cada otro partido del bloque, debajo de la frase. Cifras: {partido}; {mejor} (con artículo); {veces} (cuántas veces
más posibilidades tiene un voto al mejor: "1,4", "3", "más de 100"); {a_mejor}, {a_partido} ("al PSOE", "a Podemos"); {bloque}.
Condiciones: umbral (por debajo del 3%, mediana), lejos (por encima del 3% pero casi nunca gana un escaño más: menos de 1 entre 2
millones), parejas (menos de 1,25 veces), normal.
-->
::: si umbral
**{partido}**: un voto suyo casi nunca suma un diputado aquí. Se queda por debajo del 3% de los votos, el mínimo para entrar en el reparto.
:::
::: si lejos
**{partido}**: un voto suyo casi nunca suma un diputado aquí; está lejos de conseguirlo.
:::
::: si parejas
**{partido}**: casi las mismas posibilidades que {mejor}.
:::
::: si normal
**{partido}**: un voto {a_mejor} tiene **{veces} veces** más posibilidades de sumar un diputado a {bloque} que uno {a_partido}.
:::

=== roba ===
<!--
Se añade a la línea de un partido cuando al menos la mitad de los escaños que gana son de su propio bloque. Cifras: {a_dentro}
("al PP o a Vox"); {bloque}.
-->
Cuando gana un escaño, a menudo se lo quita {a_dentro}, del mismo bloque, y entonces {bloque} no gana nada.

=== depende ===
<!--
Debajo de las líneas por partido: si la mejor opción cambia según cómo vaya la noche (tercios de las simulaciones). Cifras:
{bloque}; {mejor_bien}, {mejor_normal}, {mejor_mal} (con artículo). Condiciones: igual (la misma en los tres), bn (la misma si va
bien o como se espera), nm (la misma si va como se espera o mal), no_bn_nm (las tres distintas).
-->
::: si igual
[nota] **Aquí da igual cómo vaya la noche**: vaya bien, como se espera o mal para {bloque}, el voto pesa más con {mejor_bien}.
::: si no
::: si bn
[nota] **Aquí depende de cómo vaya la noche**: si va bien para {bloque} o como se espera, el voto pesa más con {mejor_bien}; si va mal, con {mejor_mal}.
:::
::: si nm
[nota] **Aquí depende de cómo vaya la noche**: si va bien para {bloque}, el voto pesa más con {mejor_bien}; si va como se espera o mal, con {mejor_normal}.
:::
::: si no_bn_nm
[nota] **Aquí depende de cómo vaya la noche**: si va bien para {bloque}, el voto pesa más con {mejor_bien}; si va como se espera, con {mejor_normal}; si va mal, con {mejor_mal}.
:::
:::

=== pequeno ===
<!--
Al final de la respuesta, siempre que algún partido tenga opciones. Sin cifras.
-->
[nota] Que pese más no quiere decir que pese mucho: un solo voto decide un diputado muy pocas veces. Lo que cuenta es la comparación entre partidos.
