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

[sub] La mejor opción de cada bloque en cada provincia, la segunda y cuántas veces más pesa un voto a la primera. Pulsa una cabecera para ordenar.

[[lista]]

::: metodología
Para cada provincia y cada simulación de «Nuestra predicción» (140.000), contamos cuántos votos más necesita cada lista para ganar un escaño más con la regla D'Hondt y el mínimo del 3%, y a quién se lo quitaría. Un escaño cuenta para el bloque solo si sale de otro bloque: si el PP se lo quita a Vox, la derecha no gana nada. Damos 1.000 votos nuevos a cada partido y contamos en qué parte de las simulaciones el bloque gana un escaño. Esa parte es proporcional a las posibilidades de que un solo voto a ese partido sume un diputado al bloque, y lo que publicamos es el cociente entre partidos: «un voto al PNV tiene 1,2 veces más posibilidades que uno al PSOE». Las posibilidades de un solo voto, en sí, son siempre muy pequeñas, de una entre cientos de miles o millones, y por eso no las damos: lo que sirve para decidir es la comparación dentro de tu provincia. Las cuentas son sobre todas las simulaciones. Debajo avisamos si la mejor opción cambia según cómo vaya la noche: partimos las simulaciones en tres tercios según la ventaja nacional en votos de la izquierda (PSOE, Frente Amplio, Podemos, ERC, Bildu, PNV) sobre la derecha (PP, Vox, SALF) y repetimos el cálculo en cada tercio. Con los datos de hoy, la derecha saca unos {mediana} puntos de ventaja a la izquierda en votos en la simulación mediana; el tercio bueno para la izquierda es el de las simulaciones en que esa ventaja baja de {corte_bajo} puntos, el del medio va de {corte_bajo} a {corte_alto}, y el bueno para la derecha, el de más de {corte_alto}. Supone que el resto vota como se prevé, y no es una recomendación de voto: describe la previsión, con su incertidumbre. Los bloques son los de partida de «Forma tu mayoría»; en Navarra, Geroa Bai cuenta con el PNV.
:::

=== respuesta ===
<!--
La frase de la provincia elegida (acortada el 18-11-2026: Víctor la veía "super verbosa"; debajo, el código pone una línea por
partido: "Frente Amplio: 2,3 veces", "Bildu: casi igual", "Podemos: casi nunca suma (por debajo del 3%)"). Cifras: {provincia};
{bloque} ("la derecha", "la izquierda"); {mejor} (con artículo: "el PSOE"). Condiciones: vacia (ningún partido del bloque tiene
opciones), solo (el bloque tiene un único partido en la provincia).
-->
::: si vacia
En **{provincia}**, ningún partido de {bloque} tiene opciones de sumar un diputado más.
::: si no
::: si solo
En **{provincia}**, para {bloque}: **{mejor}**, la única opción.
::: si no
En **{provincia}**, para {bloque}, mejor **{mejor}**. Cuántas veces más pesa un voto suyo que uno a:
:::
:::

=== depende ===
<!--
Debajo de las líneas: si la mejor opción cambia según cómo vaya la noche (tercios de las simulaciones por la ventaja nacional de
la izquierda). Cifras: {bloque}; {mejor_bien}, {mejor_normal}, {mejor_mal} (con artículo). Condición: igual (la misma en los tres).
-->
::: si igual
[nota] Vaya como vaya la noche, la mejor opción es la misma.
::: si no
[nota] **Según la noche:** si va bien para {bloque}, {mejor_bien}; si va como se espera, {mejor_normal}; si va mal, {mejor_mal}.
:::
