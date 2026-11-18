<!--
Tu voto (pestaña Tu voto, #voto; #voto/<provincia>/<bloque>/<bien|mal> abre una provincia, un bloque y, si se quiere, una noche). Cómo se escribe: textos/README.md.
Añadida por Claude el 17-11-2026, a petición de Víctor ("lo de dónde votar mejor, como pestaña propia"). Datos: peso_voto.json
(pipeline/peso_voto.py), siempre «Nuestra predicción». Los bloques son los de partida de «Forma tu mayoría» (en Navarra, Geroa Bai
con el PNV). El 18-11-2026, a petición de Víctor, sin «1 entre N»: se compara cuántas veces más posibilidades tiene un voto a un partido que
a otro de sumar un diputado al bloque; la noche (bien, como se espera, mal) se elige con tres botones, por defecto la del medio.

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
Para cada provincia y cada simulación de «Nuestra predicción» (140.000), contamos cuántos votos más necesita cada lista para ganar un escaño más con la regla D'Hondt y el mínimo del 3%, y a quién se lo quitaría. Un escaño cuenta para el bloque solo si sale de otro bloque: si el PP se lo quita a Vox, la derecha no gana nada. Damos 1.000 votos nuevos a cada partido y contamos en qué parte de las simulaciones el bloque gana un escaño. Esa parte es proporcional a las posibilidades de que un solo voto a ese partido sume un diputado al bloque, y lo que publicamos es el cociente entre partidos: «un voto al PNV tiene 1,2 veces más posibilidades que uno al PSOE». Las posibilidades de un solo voto, en sí, son siempre muy pequeñas, de una entre cientos de miles o millones, y por eso no las damos: lo que sirve para decidir es la comparación dentro de tu provincia. Los botones de la noche parten las simulaciones en tres tercios según la ventaja nacional en votos de la izquierda (PSOE, Frente Amplio, Podemos, ERC, Bildu, PNV) sobre la derecha (PP, Vox, SALF), y el cálculo se repite en cada tercio: «va bien» es el tercio más favorable al bloque elegido; «como se espera», el del medio, que es el que sale al abrir la página; «va mal», el menos favorable. Con los datos de hoy, la derecha saca unos {mediana} puntos de ventaja a la izquierda en votos en la simulación mediana; el tercio bueno para la izquierda es el de las simulaciones en que esa ventaja baja de {corte_bajo} puntos, el del medio va de {corte_bajo} a {corte_alto}, y el bueno para la derecha, el de más de {corte_alto}. Supone que el resto vota como se prevé, y no es una recomendación de voto: describe la previsión, con su incertidumbre. Los bloques son los de partida de «Forma tu mayoría»; en Navarra, Geroa Bai cuenta con el PNV.
:::

=== respuesta ===
<!--
La frase de la provincia elegida (acortada el 18-11-2026: Víctor la veía "super verbosa"; debajo, el código pone una línea por
partido: "Frente Amplio: 2,3 veces", "Bildu: casi igual", "Podemos: casi nunca suma (por debajo del 3%)"). Cifras: {provincia};
{bloque} ("la derecha", "la izquierda"); {mejor} (con artículo: "el PSOE"); {noche} ("bien", "como se espera", "mal", para el bloque
elegido). {escanos} (el siguiente escaño de las dos mejores opciones en la noche elegida: "el 3.º del PNV o el 3.º del PSOE"). Condiciones: vacia (ningún partido
del bloque tiene opciones), solo (un único partido del bloque), poco (ni la mejor opción da al bloque un escaño en 5 de cada 1.000
simulaciones con 1.000 votos más: Víctor, 18-11-2026, "da igual lo que votes un poco... pero relativamente, mejor X"), mucho (lo contrario).
-->
::: si vacia
En **{provincia}**, si la noche va {noche}, ningún partido de {bloque} tiene opciones de sumar un diputado más.
::: si no
::: si solo
En **{provincia}**, para {bloque}: **{mejor}**, la única opción.
::: si no
::: si poco
En **{provincia}**, para {bloque}, si la noche va {noche}, tu voto pesa poco vote lo que vote: es difícil que {bloque} sume un diputado más, sea {escanos}. Aun así, en comparación, mejor **{mejor}**. Cuántas veces más pesa un voto suyo que uno a:
:::
::: si mucho
En **{provincia}**, para {bloque}, si la noche va {noche}, mejor **{mejor}**. Cuántas veces más pesa un voto suyo que uno a:
:::
:::
:::

=== compara ===
<!--
Debajo de las líneas, la noche elegida frente a las otras (Víctor, 18-11-2026: "si va un poco bien, ya se ha asegurado uno el
partido X, y ahora hay que ir por otro que el Y tiene más cerca"): desde la noche del medio, la mejor y la peor; desde un extremo,
la del medio. Cada noche es un tercio de las simulaciones, por la ventaja nacional de la izquierda sobre la derecha. Cifras:
{bloque}; {mejor_bien}, {mejor_normal}, {mejor_mal} (con artículo; "también el PNV" si es el mismo que arriba). Condiciones: medio
(elegida la del medio), igual (desde el medio, la misma en las tres), extremo (elegida bien o mal), cambia (desde un extremo, distinta
de la del medio).
-->
::: si medio
::: si igual
[nota] Si la noche va mejor o peor para {bloque}, la mejor opción sigue siendo la misma.
::: si no
[nota] **Si va mejor** para {bloque}: {mejor_bien}. **Si va peor**: {mejor_mal}. Cambia porque con otra noche el escaño en el aire es otro.
:::
:::
::: si extremo
::: si cambia
[nota] **Si va como se espera**: {mejor_normal}. Cambia porque con otra noche el escaño en el aire es otro.
::: si no
[nota] Si va como se espera, {mejor_normal}.
:::
:::
