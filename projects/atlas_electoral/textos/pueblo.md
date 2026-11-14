<!--
Tu pueblo. Cómo se escribe: textos/README.md.

Parte principal (la cabecera y el buscador):
  Sin cifras. [[s]] es el buscador y [[ficha]] el sitio donde va la parte "ficha".

Parte "no_encontrado": aviso cuando el código INE del enlace no existe.

Parte "ficha" (se rehace para cada municipio):
  {municipio}          nombre del municipio
  {provincia}          su provincia
  {ultima}             última elección general con datos, p. ej. "Generales 2023"
  {ultima_municipal}   última elección municipal con datos, p. ej. "Municipales 2023"
  Condiciones:
    municipales        hay elecciones municipales con datos de este municipio
    autonomicas        hay al menos dos elecciones autonómicas con datos (si no, se dice en la tarjeta)
    europeas           hay al menos dos elecciones europeas con datos
    gemelos            hay gemelos electorales calculados
    abiertas           el último resultado municipal es de listas abiertas
  Bloques que pone el código: [[cifras]] (censo, participación y distancia a España), [[cp]] (gráfico de
  participación), [[resultado]] y [[resultado_municipal]] (tablas, cada una con la parte "nota_tabla"
  debajo), [[gemelos]] (tabla), [[concejales]] (lista de electos).

Parte "nota_tabla": la nota bajo cada tabla de resultados.

Parte "sin_concejales": aviso cuando no hay concejales publicables.
-->
# Tu pueblo

[sub] Historial electoral completo de cualquier municipio, sus «gemelos» electorales y cuánto se parece a España.

[[s]]
[[ficha]]

=== no_encontrado ===

Municipio no encontrado.

=== ficha ===

<h1 style="margin-top:20px">{municipio} <span style="font-weight:400;color:var(--ink-2);font-size:18px">{provincia}</span></h1>

[[cifras]]

::: rejilla
<div class="card"><h2 style="margin-top:0">Generales</h2><div class="chart" id="cg"></div></div>
<div class="card"><h2 style="margin-top:0">Municipales</h2><div class="chart" id="cm">

::: si no municipales
[nota] Sin datos municipales en la fuente.
:::

</div></div>
:::

<div class="grid2" style="margin-top:16px">
<div class="card"><h2 style="margin-top:0">Autonómicas</h2><div class="chart" id="ca">

::: si no autonomicas
[nota] Sin suficientes elecciones autonómicas con datos de este municipio.
:::

</div></div>
<div class="card"><h2 style="margin-top:0">Europeas</h2><div class="chart" id="ce">

::: si no europeas
[nota] Sin datos.
:::

</div></div>
</div>

## Participación

[[cp]]

::: rejilla
<div>

## Resultado {ultima}

[[resultado]]

</div>
<div>

## Gemelos electorales

[nota] Municipios cuyo voto en las generales de 2015–2019 más se parece al de {municipio}.

::: si gemelos
[[gemelos]]
::: si no
[nota] Sin datos suficientes.
:::

</div>
:::

::: si municipales
## Último resultado municipal ({ultima_municipal})

::: si abiertas
[nota] Municipio de listas abiertas (hasta 250 habitantes): cada elector marca candidatos sueltos. El voto de cada lista es el de su candidato más votado y no hay datos de censo ni participación.
:::

[[resultado_municipal]]
:::

## Concejales electos

::: controles
<div class="seg" id="cyears"></div>
:::

[[concejales]]

[nota] Solo se publican las personas elegidas, ligadas a su cargo, y solo donde su número coincide con los escaños oficiales; los candidatos no electos no aparecen por su nombre. Fuente: listas de candidatos del Ministerio del Interior. Disponible de 2003 a 2023: antes, las listas de concejales de la fuente están incompletas.

=== nota_tabla ===

[nota] % sobre votantes. Se muestran las 10 candidaturas más votadas.

=== sin_concejales ===

[nota] Sin concejales publicables para este municipio.
