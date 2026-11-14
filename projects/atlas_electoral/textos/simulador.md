<!--
Pestaña Simulador de escaños. Cómo se escribe: textos/README.md.

Condiciones:
  embed                el simulador va metido dentro de otra página: sin título, sin índice y sin metodología

Bloques del código:
  [[controles]]        botón "Partir de las encuestas" y selector de elección
  [[equilibrio]]       casilla "Mantener el total" (y, fuera de embed, el botón de copiar enlace)
  [[tbl]] [[pactos]] [[prov]] [[ultimo]]   tablas de escaños, sumas, cambios por provincia y último escaño

Partes que el código vuelve a pintar al mover los controles:
  encuestas            nota de partida desde las encuestas; {fecha}: fecha de la última actualización
  resultado            nota de partida desde un resultado; {eleccion}: "las generales de ..."
  sin_cambios          lo que sale en "Lo que más cambia" cuando nada cambia
-->
::: si no embed
# Simulador de escaños
:::

[sub] Mueve el porcentaje de cada partido y mira cómo cambia el Congreso, provincia a provincia. Parte de las encuestas de hoy o del resultado de cualquier elección general desde 1977.

[[índice]]

## Escenario {#escenario}

[[controles]]
<p class="note" id="pollnote"></p>
<div class="sliders" id="sl"></div>
[[equilibrio]]

## Congreso resultante <span id="sum" class="note"></span> {#resultado | Congreso resultante}

<div class="seats" id="bar"><span class="majority" title="Mayoría absoluta: 176"></span></div>
<div class="legend" id="leg"></div>

::: rejilla
<div>
### Escaños por partido
[[tbl]]
</div>
<div>
### Sumas
[[pactos]]

[nota] Arrastra un partido a otro grupo. La mayoría son 176.

</div>
:::

## Provincia a provincia {#provincias}

::: rejilla
<div>
### Lo que más cambia
[[prov]]
</div>
<div>
### Dónde baila el último escaño

[nota] Provincias donde el último escaño se decide por menos votos: quién se lo lleva, quién se queda a las puertas y cuánto le falta, en porcentaje de los votos válidos de la provincia.

[[ultimo]]
</div>
:::

::: si no embed
::: metodología #metodo
**El reparto.** En cada provincia, regla D'Hondt con la barrera del 3% de los votos válidos (candidaturas más voto en blanco), como en la LOREG. Los escaños por provincia son los de cada convocatoria; para 2026, los del Real Decreto 806/2026 (BOE de 6 de octubre): Madrid 38, Cádiz 8.

**Mover un partido.** El porcentaje nacional de cada partido se aplica de forma proporcional en todas las provincias: si pasa del 20% al 25%, sus votos se multiplican por 1,25 en cada una. Es la aproximación habitual (*swing* proporcional); con las 15 generales desde 1977 acierta tanto como el *swing* uniforme, y aun con un porcentaje nacional exacto falla una mediana de 11 escaños, porque cada provincia se desvía del movimiento nacional (más por comunidades que por provincias). Con "Repartir", lo que sube un partido sale de los demás en proporción a su tamaño; sin ella, el resto (regionales, otros, blanco) absorbe la diferencia.

**Sumar, Podemos y SALF.** No tuvieron lista propia en 2023 (Sumar y Podemos fueron juntos; SALF no existía). Su reparto por provincias sigue el de las europeas de junio de 2024, la única elección en que concurrieron por separado, escalado al porcentaje nacional elegido.

**El último escaño.** Para cada provincia se guarda el último cociente que obtiene escaño y el mejor que se queda fuera; "le falta" es lo que necesitaría ese segundo para adelantar al primero, en porcentaje de los votos válidos.

[nota] El simulador no tiene incertidumbre: muestra el reparto exacto de un escenario. La estimación con probabilidades llegará con el modelo.
:::
:::

=== encuestas ===

Partiendo de las encuestas del {fecha}.

=== resultado ===

Partiendo del resultado de {eleccion}.

=== sin_cambios ===

[nota] Mueve algún control para ver qué escaños cambian de manos.
