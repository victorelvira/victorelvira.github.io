<!--
Tu comunidad. Cómo se escribe: textos/README.md. La página entera se rehace al elegir otra comunidad.

Parte principal (la página):
  {nombre}       nombre de la comunidad elegida, p. ej. "Comunidad de Madrid"
  Condiciones:
    provincias   la comunidad tiene más de una provincia (se muestra la tabla "Por provincia")
  Bloques que pone el código: [[chips]] (botones de comunidades), [[cifras]] (diputados, censo y
  participación), [[selector]] (elección del mapa), [[mapa]], [[leg]] (leyenda), [[votos]] y [[part]]
  (gráficos), [[aut]] (parte "autonomicas"), [[seats]], [[cargos]] (botones Congreso, Senado,
  Parlamento y elección), [[reps]] (lista de electos), [[provs]] (tabla por provincia).

Parte "autonomicas" (el bloque "Parlamento autonómico"):
  {nombre}       nombre de la comunidad
  Condiciones:
    datos        hay elecciones autonómicas con datos de esta comunidad
  Bloques: [[autseats]] (escaños) y [[autvotos]] (gráfico).

Parte "sin_electos": aviso cuando no hay electos publicables para el cargo y la elección elegidos.
-->
# Tu comunidad

[[chips]]

<h1 style="margin-top:16px">{nombre}</h1>

[[cifras]]

::: rejilla
<div>

## Municipios

[[selector]]
[[mapa]]
[[leg]]

</div>
<div>

## Voto por familias (generales)

[[votos]]

## Participación frente a España

[[part]]

</div>
:::

## Parlamento autonómico

[[aut]]

## Diputados que ha elegido {nombre} en el Congreso

[[seats]]

## Quién representa a {nombre}

[[cargos]]
[[reps]]

[nota] Solo se publican las personas elegidas, ligadas a su cargo, y solo donde su número coincide con los escaños oficiales; los candidatos no electos no aparecen por su nombre. Fuente: listas de candidatos del Ministerio del Interior.

::: si provincias
## Por provincia

[[provs]]
:::

=== autonomicas ===

::: si datos
[sub] Escaños tras cada elección autonómica: hasta 2012, Ministerio del Interior; después, el portal oficial de resultados de cada comunidad.

[[autseats]]

<h3 class="h3" style="margin-top:16px">Voto por familias</h3>

[[autvotos]]
::: si no
[nota] Interior no publica las autonómicas de {nombre}.
:::

=== sin_electos ===

[nota] Sin datos publicables.
