<!--
Portada (pestaña 29N). Cómo se escribe: textos/README.md.

Cifras disponibles:
  {dias}               días que faltan para el 29N
  {ultimo_campo}       fecha de la última encuesta del modelo (p. ej. "13 de noviembre")
  {ppvox_176}          de cada 100 simulaciones, en cuántas PP y Vox llegan a 176
  {pp_primero}         de cada 100, en cuántas el PP queda primero
  {simulaciones}       número de simulaciones del modelo (4.000)
  {fecha_datos}        fecha de los datos (si no hay modelo)
  {elecciones}         elecciones generales del backtest (13)
  {desde}              año de la primera (1986)
  {acierto_voto}       % de resultados de voto dentro del rango del 90%, una semana antes
  {acierto_escanos}    lo mismo en escaños
  {error_x15}          probabilidad de 176 si el error de las encuestas fuera un 50% mayor
  {error_x08}          probabilidad de 176 si fuera un 20% menor
  {fuente_escanos}     de dónde salen los escaños por provincia de 2026
  {cambios_escanos}    provincias que cambian de escaños respecto a 2023

Condiciones: antes / hoy / despues (del día de la votación), modelo, provincias, validacion,
sensibilidad, movilizacion, cambios.
-->
[antetítulo] Elecciones generales en España

# 29 de noviembre de 2026

::: si antes
[sub] Faltan **{dias} días** para las elecciones generales. Se eligen 350 diputados y 208 senadores.
:::
::: si hoy
[sub] **Hoy se vota.** Se eligen 350 diputados y 208 senadores.
:::
::: si despues
[sub] Se eligen 350 diputados y 208 senadores.
:::

[[índice]]

## Qué dice el modelo <span class="tag-exp">modelo experimental</span> {#diputados | Qué dice el modelo}

::: si modelo
[línea] Con las encuestas hasta el {ultimo_campo}, PP y Vox suman los 176 escaños en unas {ppvox_176} de cada 100 simulaciones, y el PP queda primero en unas {pp_primero} de cada 100.
::: si no
[sub] Reparto de las encuestas a día {fecha_datos}.
:::

::: tarjeta
[[proj]]
[[bloques]]

[nota] Arrastra un partido a otro grupo. La mayoría son 176 diputados.

::: metodología corta
::: si modelo
[nota] Estimación del modelo propio: las encuestas, más el error que han tenido en cada general desde 1982, llevadas provincia a provincia y repartidas con D'Hondt en {simulaciones} simulaciones. La barra y las cifras son la estimación central; bajo cada grupo, el rango que recoge 9 de cada 10 simulaciones y la probabilidad de que el grupo llegue a 176. [Más detalle](#encuestas/metodo) · [Prueba otros porcentajes →](#simulador)
::: si no
[nota] Reparto del promedio de encuestas provincia a provincia con D'Hondt, sin márgenes de error. [Más detalle](#encuestas/metodo) · [Prueba otros porcentajes →](#simulador)
:::
:::
:::

## De dónde sale {#voto}

[sub] El promedio de las encuestas. Todas, una a una y por encuestadora, en [Encuestas](#encuestas).

[[promedio]]
[[chart-area]]

::: si provincias
## Dónde se decide {#aire}

[sub] El reparto se juega provincia a provincia. Estos son los escaños más igualados; cada escaño disputado sale una vez por cada partido que lo pelea.

[[selector_provincia]]
[[tabla_aire]]
:::

::: si validacion
## Cuánto fiarse {#fiarse}

Hemos rehecho el modelo para las {elecciones} elecciones generales desde {desde}, con solo las encuestas que se conocían entonces. Una semana antes, el resultado cayó dentro del rango del 90% en el {acierto_voto}% de los casos en voto y en el {acierto_escanos}% en escaños.

::: si sensibilidad
Esa probabilidad no se conoce con tanta precisión como parece. Si el error conjunto de las encuestas fuera un 50% mayor que el histórico, PP y Vox llegarían a 176 en {error_x15} de cada 100 simulaciones; si fuera un 20% menor, en {error_x08}. Y en esas {elecciones} elecciones el modelo solo dio más del 50% a que la derecha sumara 176 dos veces, así que una cifra tan alta apenas se ha podido poner a prueba.
:::

[nota] [La validación completa, en Encuestas →](#encuestas)
:::

::: si movilizacion
## Movilización {#movilizacion}

[nota] Porcentaje seguro de ir a votar (10 sobre 10) según lo que votó en julio de 2023, en las encuestas con microdatos de cada casa. Las dos preguntan de forma distinta y el CIS da niveles más altos: compara cada casa consigo misma. [Adónde va cada voto, en Encuestas →](#encuestas)

[[mov]]
:::

## Calendario {#calendario}

[[calendario]]

::: si cambios
[nota] Escaños por provincia en 2026 {fuente_escanos}: {cambios_escanos}.
:::

::: mosaico
<a class="tile" href="#generales"><b>Generales 1977-2023</b><span>El Congreso elección a elección, voto, participación, el mapa municipal</span></a>
<a class="tile" href="#simulador/encuestas"><b>Simulador</b><span>Mueve los porcentajes y mira los escaños, mayorías y último escaño por provincia</span></a>
<a class="tile" href="#encuestas"><b>Encuestas</b><span>Todas las encuestas desde 1982, la cocina y quién acierta</span></a>
:::

=== noche ===

[antetítulo] {titulo_noche}

<h2 style="margin-top:4px">Escrutado el {escrutado}% · {hora}</h2>

[[live-seats]]
[[tabla_noche]]

[nota] Participación {participacion}% · datos provisionales del Ministerio del Interior; se actualiza cada minuto. Los escaños definitivos los proclaman las juntas electorales.
