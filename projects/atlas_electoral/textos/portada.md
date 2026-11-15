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
# Elecciones generales en España -  29 de noviembre de 2026


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

## Qué dice nuestro modelo <span class="tag-exp">modelo experimental</span> {#diputados | Qué dice el modelo}

::: si modelo
[nota] Últimos datos utilizados: encuestas hasta el {ultimo_campo}. Modelo actualizado el {ultimo_modelo}.

### Resumen {#resumen | Resumen}

[línea] PP y Vox suman los 176 escaños con una probabilidad estimada del {ppvox_176}%. El PP es la fuerza más votada con una probabilidad del {pp_mas_votado}%.

[[resultados]]

::: metodología #metodo
**Las encuestas.** Todas las encuestas nacionales publicadas desde las generales de 2023, con su trabajo de campo y su muestra. Las encuestas que acumulan entrevistas día a día no cuentan varias veces las mismas: en SW Demoscopia, cada día nuevo entra como una encuesta pequeña con solo sus entrevistas nuevas; Sociométrica, que da más peso a lo reciente, entra con su última ola. Las encuestas encargadas por partidos y las reestimaciones del CIS hechas por terceros se muestran pero no entran.

**El promedio.** Para cada partido, un filtro de Kalman sigue su apoyo día a día y estima a la vez el sesgo de cada encuestadora, partiendo de la mitad del sesgo que tuvo en 2023.

**El error de las encuestas.** El día de la votación se añade un error común a todas las encuestas, calibrado con el que tuvieron en cada elección general desde 1982 y correlacionado por bloques: cuando las encuestas se equivocan con un partido de la derecha, suelen equivocarse en el mismo sentido con los demás. ERC, Junts, Bildu y PNV tienen su propia escala de error.

**De votos a escaños.** En cada simulación, el voto nacional se lleva a cada provincia con el mapa de 2023 (Frente Amplio, Podemos y SALF, con el de las europeas de 2024), más una variación aleatoria por comunidad y por provincia. Las listas que no se presentan en una provincia ceden sus votos a la lista conjunta que las incluye o los reparten entre las demás. Los escaños se asignan con D'Hondt y la barrera del 3%.

**Cuánto fiarse.** Rehecho para las elecciones generales desde 1986 con solo las encuestas de cada momento, el 90% de los resultados cayó dentro del rango del 90%. Ver [Cuánto fiarse](#modelo/fiarse).

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

El modelo parte de todas las encuestas publicadas, corrige la tendencia de cada encuestadora a sobrestimar o subestimar a cada partido, y añade el error que han tenido las encuestas en las elecciones generales desde 1982. Con eso simula {simulaciones} resultados posibles y reparte los escaños provincia a provincia. Las cifras de arriba resumen esas simulaciones. [Metodología](#inicio/metodo) · [El modelo estadístico, en detalle →](#modelo)

Usamos todas las encuestas disponibles hasta el {ultimo_campo} y un modelo actualizado el {ultimo_modelo}, donde corregimos el sesgo propio de cada casa de encuestas. 

El promedio de las encuestas. Todas, una a una y por encuestadora, en [Encuestas](#encuestas).

[[promedio]]
[[chart-area]]

[nota] [Elegir encuestadoras, en Encuestas 29N →](#encuestas) · [Las elecciones pasadas, en Encuestas históricas →](#historico)

::: si provincias
## Dónde se decide {#aire}

[sub] El reparto se juega provincia a provincia. Estas son las provincias con más escaños en el aire: escaños que ningún partido gana en al menos 9 de cada 10 simulaciones.

[[pugnas]]

[nota] [Todas las provincias en juego →](#provincia/decide)
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
