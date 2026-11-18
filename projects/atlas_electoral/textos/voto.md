<!--
Tu voto (pestaña Tu voto, #voto; #voto/<provincia>/<bloque>/<noche> abre una provincia, un bloque y, si se quiere, un escenario: bien, normal, mal). Cómo se escribe: textos/README.md.
Añadida por Claude el 17-11-2026, a petición de Víctor ("lo de dónde votar mejor, como pestaña propia"). Datos: peso_voto.json
(pipeline/peso_voto.py), siempre «Nuestra predicción». Los bloques son los de partida de «Forma tu mayoría» (en Navarra, Geroa Bai
con el PNV).

Cifras de la metodología: {mediana}, {corte_bajo}, {corte_alto}, la ventaja nacional de la derecha sobre la izquierda en puntos
(mediana y cortes entre tercios; peso_voto.json "escenarios").

Huecos [[...]]: [[controles]] (la provincia y el bloque), [[respuesta]] (la frase y la tabla de la provincia elegida), [[lista]]
(todas las provincias).

Parte "respuesta" (la frase de la provincia elegida). Cifras: {provincia}; {bloque} ("la derecha", "la izquierda"); {mejor} (el
partido con el que más pesa el voto); {frecuencia} (con qué frecuencia 1.000 votos más a ese partido dan un escaño más al bloque:
"18 de cada 1.000"); {segundo}, {frecuencia_2} (lo mismo para el segundo). Condiciones: vacia (ningún partido del bloque tiene
opciones), parejas (el segundo pesa casi lo mismo), segundo (hay segundo).
-->
# Tu voto

## Dónde pesa tu voto {#peso | Dónde pesa}

[sub] Si quieres que un bloque saque más escaños, ¿con qué partido de ese bloque pesa más tu voto en tu provincia? Elige dónde votas y qué bloque prefieres.

[[controles]]

[[respuesta]]

## Todas las provincias {#todas | Todas}

[sub] La mejor opción de cada bloque en cada provincia, y la posibilidad de que un voto a ese partido decida un escaño del bloque (1 entre…). Pulsa una cabecera para ordenar.

[[lista]]

::: metodología
Para cada provincia y cada simulación de «Nuestra predicción» (140.000), contamos cuántos votos más necesita cada lista para ganar un escaño más con la regla D'Hondt y el mínimo del 3%, y a quién se lo quitaría. Un escaño cuenta para el bloque solo si sale de otro bloque: si el PP se lo quita a Vox, la derecha no gana nada. Con 1.000 votos nuevos a un partido medimos cuántas veces el bloque gana un escaño; dividido entre 1.000, es la posibilidad de que un solo voto lo decida, «1 entre…». Lo útil es comparar los partidos dentro de tu provincia; entre provincias, las pequeñas salen más altas porque allí 1.000 votos son una parte mayor del total. Los escenarios de la noche parten las simulaciones en tres tercios según la ventaja nacional en votos de la izquierda (PSOE, Frente Amplio, Podemos, ERC, Bildu, PNV) sobre la derecha (PP, Vox, SALF): «va bien» es el tercio más favorable al bloque elegido y «va mal», el menos; en cada uno se repite el mismo cálculo. Con los datos de hoy, la derecha saca unos {mediana} puntos de ventaja a la izquierda en votos en la simulación mediana; el tercio bueno para la izquierda es el de las simulaciones en que esa ventaja baja de {corte_bajo} puntos, el del medio va de {corte_bajo} a {corte_alto}, y el bueno para la derecha, el de más de {corte_alto}. Supone que el resto vota como se prevé, y no es una recomendación de voto: describe la previsión, con su incertidumbre. Los bloques son los de partida de «Forma tu mayoría»; en Navarra, Geroa Bai cuenta con el PNV.
:::

=== respuesta ===
<!--
La frase de la provincia elegida (reescrita el 17-11-2026: Víctor encontraba poco claro "1.000 votos más... en 18 de cada 1.000
simulaciones"). Cifras: {provincia}; {bloque} ("la derecha", "la izquierda"); {mejor} (el partido con el que más pesa el voto, con
artículo: "el PSOE"); {n} ("55.000": un voto decide un escaño del bloque 1 vez entre {n}); {segundo}; {veces} (cuántas veces más
pesa el mejor que el segundo: "3"); {a_mejor}, {a_segundo} ("al PSOE", "a Frente Amplio"). Condiciones: vacia, segundo (hay segundo con alguna opción), parejas (pesan casi lo mismo).
-->
::: si vacia
En **{provincia}**, ningún partido de {bloque} tiene opciones reales de ganar un escaño más: aquí un voto casi nunca cambia el reparto.
::: si no
En **{provincia}**, si quieres más escaños para {bloque}, tu voto pesa más con **{mejor}**: la posibilidad de que un voto suyo decida un escaño es de **1 entre {n}**.
::: si segundo
::: si parejas
[nota] Es poco, como pasa siempre con un solo voto; lo que cuenta es la comparación, y aquí {segundo} pesa casi lo mismo.
::: si no
[nota] Es poco, como pasa siempre con un solo voto; lo que cuenta es la comparación: aquí un voto {a_mejor} pesa {veces} veces más que uno {a_segundo}.
:::
:::
:::

=== partido ===
<!--
Una línea por cada otro partido del bloque, debajo de la frase. Cifras: {partido}; {n} ("1 entre {n}"); {a_dentro} ("al PP o a Vox": los socios
del mismo bloque a los que suele quitar el escaño); {bloque}. Condiciones: umbral (por debajo del 3%, mediana), lejos (por encima del 3% pero
casi nunca gana un escaño más: menos de 1 entre 2 millones), roba (al menos la mitad de los escaños que gana son de su propio
bloque), normal.
-->
::: si umbral
**{partido}**: un voto suyo casi nunca suma un escaño aquí. Se queda por debajo del 3% de los votos, el mínimo para entrar en el reparto.
:::
::: si lejos
**{partido}**: un voto suyo casi nunca suma un escaño aquí; está lejos de conseguirlo.
:::
::: si roba
**{partido}**: 1 entre {n}. Cuando gana un escaño, a menudo se lo quita {a_dentro}, del mismo bloque, y entonces {bloque} no gana nada.
:::
::: si normal
**{partido}**: 1 entre {n}.
:::

=== contexto ===
<!--
Encima de la frase, cuando el lector elige cómo irá la noche (Claude, 17-11-2026, idea de Víctor: votar "al ataque" o "a la
defensiva"). Cada escenario es un tercio de las simulaciones, según la ventaja nacional en votos de la izquierda sobre la
derecha (bloques de partida). Cifra: {bloque}. Condiciones: ataque, normal, defensa.
-->
::: si ataque
[nota] **Si la noche va bien para {bloque}**, el tercio de simulaciones en que más ventaja saca: voto al ataque, para arañar un escaño más.
:::
::: si normal
[nota] **Si la noche va como se espera**, el tercio de simulaciones del medio.
:::
::: si defensa
[nota] **Si la noche va mal para {bloque}**, el tercio de simulaciones en que peor le va: voto a la defensiva, para no perder un escaño.
:::

=== depende ===
<!--
Debajo de las líneas por partido, sin escenario elegido: si la mejor opción cambia según cómo vaya la noche. Cifras: {bloque};
{mejor_bien}, {mejor_normal}, {mejor_mal} (con artículo). Condiciones: igual (la misma en los tres), bn (la misma si va bien
o como se espera), nm (la misma si va como se espera o mal).
-->
::: si igual
[nota] **Aquí da igual cómo vaya la noche**: en los tres casos, el voto pesa más con {mejor_bien}.
::: si no
::: si bn
[nota] **Aquí depende de cómo vaya la noche**: si va bien para {bloque} o como se espera, el voto pesa más con {mejor_bien}; si va mal, con {mejor_mal}. Elígelo arriba para ver el detalle.
:::
::: si nm
[nota] **Aquí depende de cómo vaya la noche**: si va bien para {bloque}, el voto pesa más con {mejor_bien}; si va como se espera o mal, con {mejor_normal}. Elígelo arriba para ver el detalle.
:::
::: si no_bn_nm
[nota] **Aquí depende de cómo vaya la noche**: si va bien para {bloque}, el voto pesa más con {mejor_bien}; si va como se espera, con {mejor_normal}; si va mal, con {mejor_mal}. Elígelo arriba para ver el detalle.
:::
:::

=== riesgo ===
<!--
Con la noche mala elegida: los escaños del bloque que en esta provincia están en el aire (los gana en 50 a 75 de cada 100
simulaciones; escanos_350.json). Cifras: {bloque}; {lista} ("el 2.º del PSOE (lo gana en 85 de cada 100 simulaciones)").
Condición: hay.
-->
::: si hay
[nota] Escaños de {bloque} en el aire aquí, los que un voto a la defensiva ayuda a sujetar: {lista}.
::: si no
[nota] Aquí {bloque} no tiene escaños en el aire: los que gana, los gana en 75 de cada 100 simulaciones o más.
:::
