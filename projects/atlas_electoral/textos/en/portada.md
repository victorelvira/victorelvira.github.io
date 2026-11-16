<!--
English version of textos/portada.md (front page, 29N tab). Same parts, figures, slots and conditions as the Spanish
file; edit the Spanish file first, then this one. Syntax: textos/README.md.

Figures:
  {dias}               days left until 29N
  {ultimo_campo}       date of the model's latest poll (e.g. "13 November")
  {ultimo_modelo}      date the model was last updated
  {ppvox_176}          out of 100 simulations, in how many PP and Vox reach 176 (unused since 2026-11-16: the sentence repeated the cards)
  {pp_mas_votado}      out of 100, in how many the PP wins the most votes
  {simulaciones}       number of simulations of the model chosen in the selector
  {fecha_datos}        date of the data (when there is no model)
  {fuente_escanos}     where the 2026 seats per province come from
  {cambios_escanos}    provinces whose seat count changes from 2023

Conditions: antes / hoy / despues (relative to polling day), modelo, provincias, validacion,
sensibilidad, movilizacion, cambios.
-->
# General election in Spain · 29 November 2026


::: si antes
[sub] **{dias} days** to go until the general election. 350 members of the Congress and 209 senators are elected.
:::
::: si hoy
[sub] **Spain votes today.** 350 members of the Congress and 209 senators are elected.
:::
::: si despues
[sub] 350 members of the Congress and 209 senators are elected.
:::

[[índice]]

## What our model says <span class="tag-exp">experimental model</span> {#diputados | What the model says}

::: si modelo
[nota] Latest data used: polls up to {ultimo_campo}. Model updated on {ultimo_modelo}.

### Summary {#resumen | Summary}

[[resultados]]

::: metodología #metodo
**The polls.** Every national poll published since the 2023 general election, with its fieldwork dates and sample size. Polls that accumulate interviews day by day do not count the same interviews several times: for SW Demoscopia, each new day enters as a small poll with only its new interviews; Sociométrica, which gives more weight to recent interviews, enters with its latest wave. Polls commissioned by parties and re-estimations of CIS data made by third parties are shown but do not enter. The CIS enters as it publishes its figures, and the models that correct each pollster's house effect discount its usual lean, although this year its respondents' recalled vote is further from the 2023 result than in previous elections.

**Our forecast: seven models, equal weight.** What is shown by default combines seven models from different families, one per family, each with the same weight. Their seats are not averaged: their complete simulations are pooled, including the vote province by province, and the seats, the map and the Senate are drawn from them. All of them use those polls and allocate seats with the same rules. They differ in three ways: whether they correct each pollster's tendency to lean towards some parties (three do, based on how far each one deviated in 2023; four do not), how much recent polls weigh against older ones, and whether the step down to the provinces takes into account the regional, municipal and European elections held since 2023 (only one does). One of them, the Democrat style, leaves out the CIS. The selector above shows each model separately and the one we published until now (K0).

**Why equal weight.** We tried giving each model a weight according to how well it would have done in the 13 general elections since 1986. With so few elections, the weight concentrates on one or two models and does not do clearly better than equal weight for all: that is choosing, not combining.

**The polling error.** On polling day each model adds an error common to all polls, calibrated on how wrong they were in each general election since 1982 and correlated by bloc: when the polls are wrong about one party of the right, they tend to be wrong in the same direction about the others. ERC, Junts, Bildu and PNV have their own error scale.

**From votes to seats.** In each simulation, the national vote is carried to each province with the 2023 map (for Frente Amplio, Podemos and SALF, the map of the 2024 European election), plus a random variation by region and by province (one of the seven first corrects that map with the elections held since 2023). Lists that do not stand in a province hand their votes to the joint list that includes them or share them among the others. Seats are allocated with D'Hondt and the 3% threshold.

**How far to trust it.** The model we published until now (K0) was rerun for the general elections since 1986 with only the polls available at each moment: one week before, about 9 out of 10 results fell inside its range, the one that covers 9 out of 10 simulations. The combination of the seven has not been tested in this way as such. See [How far to trust it](#modelo/fiarse).

**What it does not do.** It does not use provincial polls, and it does not model turnout separately.
:::
::: si no
[sub] Seat allocation from the polls as of {fecha_datos}.

::: tarjeta
[[proj]]
[[bloques]]

[nota] Drag a party into another group. A majority is 176 seats. Allocation of the poll average province by province with D'Hondt, without margins of error. [Try other percentages →](#simulador)
:::
:::

## The model explained {#voto}

[The whole model, in the Model tab →](#modelo)

What is shown by default is our forecast: seven models from different families, each with the same weight. All of them start from the published polls; some correct each pollster's tendency to overestimate or underestimate each party and others do not. Each one adds the error that polls have had in the general elections since 1982, simulates thousands of possible results ({simulaciones} in what you are looking at) and allocates the seats province by province. The figures above summarise those simulations. [Methodology](#inicio/metodo) · [The statistical model, in detail →](#modelo)

We use every poll available up to {ultimo_campo}, with the models updated on {ultimo_modelo}.

The poll average. All the polls, one by one and by pollster, in [29N polls](#encuestas) (in Spanish).

[[promedio]]
[[chart-area]]

[nota] [Choose pollsters, in 29N polls (in Spanish) →](#encuestas) · [Past elections, in Past polls (in Spanish) →](#historico)

::: si provincias
## Where it is decided {#aire}

[sub] The allocation is played out province by province. These are the provinces with the most seats in play: seats that no party wins in at least 9 out of 10 simulations.

[[pugnas]]

[nota] [All the provinces in play →](#provincia/decide)

[[mapa_portada]]
:::

## Calendar {#calendario}

[[calendario]]

::: si cambios
[nota] Seats per province in 2026 {fuente_escanos}: {cambios_escanos}.
:::

::: mosaico
<a class="tile" href="#generales"><b>General elections 1977-2023</b><span>The Congress election by election: vote, turnout, the municipal map (in Spanish)</span></a>
<a class="tile" href="#simulador/encuestas"><b>Simulator</b><span>Move the percentages and see the seats, majorities and the last seat in each province (in Spanish)</span></a>
<a class="tile" href="#encuestas"><b>29N polls</b><span>Every poll towards 29N, their average, the pollsters and their weighting (in Spanish)</span></a>
<a class="tile" href="#historico"><b>Past polls</b><span>The polls of each election since 1982 and who gets it right (in Spanish)</span></a>
:::

=== pugna ===

::: si margen
**{provincia}**: {en_juego} of its {escanos} seats in play. The most frequent contest for the last seat is between **{ultimo_de}**, which wins it, and **{primera_fuera}**, which misses out by about {margen} votes (in {frecuencia} simulations).
::: si no
**{provincia}**: {en_juego} of its {escanos} seats in play. The most frequent contest for the last seat is between **{ultimo_de}**, which wins it, and **{primera_fuera}**, which misses out (in {frecuencia} simulations).
:::

=== noche ===

[antetítulo] {titulo_noche}

<h2 style="margin-top:4px">Counted: {escrutado}% · {hora}</h2>

[[live-seats]]
[[tabla_noche]]

[nota] Turnout {participacion}% · provisional data from the Ministry of the Interior; updated every minute. The final seats are proclaimed by the electoral boards.

=== mapa ===
<!--
The front-page map, inside "Where it is decided". [[mapa_masvotado]] is the map with its button, legend and note.
Figure: {modelo}, the name of the model chosen in the selector. Condition: otro_modelo (the chosen model has no
province map of its own; since 2026-11-16 every selector model has one).
-->
### Who wins in each province {#mapa-provincias | Map}

[sub] Each province in the colour of the party with the most votes; the labels give the province and the share of the leading party. Click or tap a province to see its allocation; from there its card opens.

::: si otro_modelo
[nota] This map is that of «Our forecast»: «{modelo}», chosen above, has no results by province.
:::

[[mapa_masvotado]]


=== cambio_casas ===
<!-- Below the poll chart of "The model explained" (inicio.js; Claude, 2026-11-15). Figures from data/cambio_casas.json
(pipeline/cambio_casas.py, every morning). {frase_cambio}: the parties that move most clearly; {n_casas}: how many
pollsters. [[tabla_cambio]]: the table per pollster, folded. -->
[nota] **Each pollster compared with itself.** Between its latest poll and the one it published 3 to 8 weeks earlier: {frase_cambio} ({n_casas} pollsters). This way it does not matter that some houses always give a party more than others do. It describes the data: the model already includes these polls and does not extend the trend to 29N.

[[tabla_cambio]]
