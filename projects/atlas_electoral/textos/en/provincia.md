<!--
English version of ../provincia.md (Provincias tab). Same parts, figures ({name}), slots ([[name]]), conditions and ids
as the Spanish file; the list of figures and conditions is in the comment at the top of ../provincia.md.
pipeline/check_textos_en.py refuses this file if any of them is missing.
-->
# Provinces

[sub] What the model expects for 29N in each province, how sure it is, and every poll published there. Polls up to {ultimo_campo}.

## Your province {#tuya | Your province}

[[selector]]
[[detalle]]

## Where it is decided {#decide | Where it is decided}

There are **{en_juego} seats in play**: seats that no party wins in at least 9 out of 10 simulations. The other {decididos} are all but decided. The map below shows how many are in play in each province; click one to see its own.

[[mapa]]

### Seats in play

[nota] The provinces with the most seats in play. For each, also the most frequent contest for its last seat: who usually takes it, who is left out and by how many votes. A party gaining a few votes only changes that last seat; the model's uncertainty, of several points, can move several seats at once, which is why a large province has several in play.

[[pugnas]]

::: metodología #metodo
**Where it comes from.** It is «Our forecast», the one on the front page, with {simulaciones} simulations from seven models: a national poll average, the industry error and, in each simulation, a provincial vote built from past elections, mainly the 2023 map (Frente Amplio, Podemos and SALF, from the 2024 European election) with noise by region and by province, and a D'Hondt allocation. Lists that do not appear in national polls keep their 2023 votes.

**Regional parties.** ERC, Junts, Bildu and PNV are about 1% of a national sample, so their error is measured separately and the poll noise is scaled to their size. Tested on the elections since 1986, about 9 out of 10 of their results fall within the range that holds 9 out of 10 simulations.

**Candidate lists.** Those proclaimed for the Congreso in the [BOE of 3 November]({boe}), with the correction of the 7th. Only the head of each list is shown.

**What it does not do.** The province's own polls are shown but do not move this calculation. When tested on the elections from 2015 to 2023 they improved it little, and only when the party map changed a lot.

**How to read the boxes.** Each box is one seat for that party: the first, winning at least one; the second, at least two. The fuller it is, the more likely.

**Votes for the last seat.** Median, across simulations, of the votes the first list left out needs to overtake the last list that gets in, on the scale of the 2023 votes.

**Type of poll.** This province only: every interview is in the province (including those of a single-province region, such as Madrid or Cantabria). National, with a figure for the province: a poll of all of Spain from which the provincial figure is taken; each province has few interviews, so the figure is very uncertain, and the interviews shown are those for all of Spain. Regional, with a figure for the province: the same, for a poll of an autonomous community. Not stated: the source does not say. Rows transcribed from the press and not yet reviewed are marked as such.

**Seats in play.** In each province, a party's seat counts as decided when the party wins it in at least 9 out of 10 simulations (the first, if it wins at least one; the second, if it wins at least two). The seats in play are the rest: those that no party has decided in this way.
:::

=== detalle ===

[[cabecera]]

<h3 class="pv-nombre">{provincia}</h3>

[[cifras]]

[[vista]]

::: si proyeccion
It elects {escanos} {escanos_palabra}{cambio}. The most likely allocation is **{reparto}**, which comes up in {prob_reparto} simulations.{siguientes}
::: si no
[[resumen_2023]]
:::

[[resultado]]

[[mapa_aqui]]

::: si proyeccion
#### Probability of each seat

[[casillas]]

#### Seats and vote by party

[[tabla_partidos]]
:::

[[vale]]

#### The last seat

::: si proyeccion
::: si disputa
::: si margen
Most often the last seat goes to **{ultimo_de}** and the first list left out is **{primera_fuera}** (in {prob_ultimo} simulations). About {margen} votes separate them.
::: si no
Most often the last seat goes to **{ultimo_de}** and the first list left out is **{primera_fuera}** (in {prob_ultimo} simulations).
:::
::: si no
No parties contest the last seat.
:::
[[aire]]
::: si no
[[ultimo_2023]]
:::

#### Proclaimed candidate lists

::: si candidaturas
[[tabla_candidaturas]]
::: si no
[nota] No data.
:::

[[evolucion]]

[[dhondt]]

::: si proyeccion
#### Polls published here

::: si encuestas
[[tabla_encuestas]]
::: si no
[nota] We do not yet know of any poll published for this province.
:::
:::

[[municipios]]

=== pugna ===

::: si margen
**{provincia}**: {en_juego} of its {escanos} seats in play. The most frequent contest for the last one is between **{ultimo_de}**, which takes it, and **{primera_fuera}**, which is left out by about {margen} votes (in {frecuencia} simulations).
::: si no
**{provincia}**: {en_juego} of its {escanos} seats in play. The most frequent contest for the last one is between **{ultimo_de}**, which takes it, and **{primera_fuera}**, which is left out (in {frecuencia} simulations).
:::

=== tooltip ===

**{provincia}**: {escanos} {escanos_palabra}, {en_juego} in play.

::: si disputa
Last seat: most often **{ultimo_de}** takes it and **{primera_fuera}** is left out ({frecuencia} simulations).
:::

=== tooltip_voto ===

::: si presenta
**{provincia}**: {partido}, {voto} of the vote (median of the simulations). In 9 out of 10 simulations, between {voto_lo} and {voto_hi}.
::: si no
**{provincia}**: {partido} does not stand here.
:::

=== nota_voto ===

[nota] The vote the model expects for {partido} in each province: the median of its {simulaciones} simulations. Hatched grey marks the provinces where it does not stand.

=== tooltip_voto_2023 ===

::: si presenta
**{provincia}**: {partido}, {voto} of the vote in the 2023 general election.
::: si no
**{provincia}**: {partido} did not stand here in 2023.
:::

=== nota_voto_2023 ===

[nota] {partido}'s vote in each province in the general election of July 2023 (Ministry of the Interior). Hatched grey marks the provinces where it did not stand.

=== tooltip_mas_votado ===

::: si proyeccion
**{provincia}**: the most likely winner is **{partido}**, first in {frecuencia} simulations, with {voto} of the vote (median) and a lead of about {ventaja} points over the second.
::: si no
**{provincia}**: **{partido}** won in 2023, with {voto} of the vote and a lead of {ventaja} points over the second.
:::

=== nota_mas_votado ===

::: si proyeccion
[nota] Each province in the colour of the party that comes first in the most of the {simulaciones} simulations; the darker, the bigger its lead over the second (median gap, in the simulations it wins).
::: si no
[nota] Each province in the colour of the most voted party in the general election of July 2023; the darker, the bigger its lead over the second.
:::

=== resumen_2023 ===

In the general election of July 2023 it elected {escanos23} {escanos23_palabra}: **{reparto23}**. Turnout was {participacion} of the electoral roll.

=== resultado_2026 ===

#### Result by party

[nota] Expected vote: the dot is the median of the {simulaciones} simulations and the band holds 9 out of 10, as on the front page. On the right, the seats of the most likely allocation and, in brackets, the range they move within in 9 out of 10 simulations.

[[barras]]

=== resultado_2023 ===

#### Result by party

[nota] General election of 23 July 2023 (Ministry of the Interior). Share of the valid vote, which includes blank votes. Lists below 3% do not take part in the allocation.

[[barras]]

=== mapa_ficha ===

[nota] {provincia}, outlined on the map of Spain. Click another province to see its card.

=== vale ===

#### What your vote is worth: voters per seat

In {provincia} there are **{electores} voters for each seat**; the average for Spain is {media}. A vote here weighs {peso} an average vote. It ranks {puesto} of 52, counting from the one with the fewest voters per seat: {min_n} ({min}). The one with the most is {max_n} ({max}).

[[vale_tira]]

[nota] Voters on the electoral roll of the 2023 general election, including residents abroad, divided by the 2026 seats (Royal Decree calling the election). The INE has not yet published the 2026 roll.

=== aire ===

::: si pugnas
How the last seat ends up in the simulations:

[[pugnas_lista]]
:::

::: si dudosos
The most uncertain seats (up to eight), with how often each party wins them:

[[dudosos_lista]]
:::

=== ultimo_2023 ===

::: si rival
The last seat went to **{ultimo_de}**, with a quotient of {cociente} votes ({votos_lista} votes divided by {divisor}). Next in the queue was **{siguiente}**, with {cociente_sig}: it fell {falta} votes short. {ultimo_de} could have lost {perder} votes and kept it.
::: si no
The only seat went to **{ultimo_de}**: no other list passed 3%.
:::

=== candidaturas_nota ===

[nota] Only the head of each list. [Full list in the BOE]({boe}).

=== evolucion ===

#### 2019 against 2023

[nota] Each party's vote in the general elections of November 2019 and July 2023, and its seats. The arrow says whether it rose or fell. Sumar, in 2019, is Unidas Podemos.

[[evolucion_tabla]]

=== dhondt ===

#### D'Hondt allocation

[nota] Each list's votes divided by 1, 2, 3... The {escanos23} highest quotients take the seats (in colour). Outlined, the last seat; with a dashed line, the next in the queue. Only lists with at least 3% of the valid vote take part.

[[dhondt_tabla]]

=== municipios ===

#### Municipalities

[nota] The {n} municipalities of {provincia}, from most to fewest voters in the 2023 general election, with the most voted list in each. Click one to see its history.

[[municipios_lista]]

=== aire_fila ===

**{lleva}** takes it and **{fuera}** is left out: in {frecuencia} simulations.

=== dudoso_fila ===

Seat no. {k} for **{partido}**: in {frecuencia} simulations.

=== tooltip_bloques ===
<!--
Front-page map, "Blocs" view: the bubble of each province. Figures and conditions: see ../provincia.md.
-->
::: si proyeccion
**{provincia}**: the bloc with the most votes would be **{bloque}**, with a lead of {ventaja} points over the second.
::: si no
**{provincia}**: in 2023 the bloc with the most votes was **{bloque}**, with a lead of {ventaja} points over the second.
:::
Left {izquierda} · Others {otros} · Right {derecha}
::: si resto
[nota] Other lists: {resto}.
:::

=== nota_bloques ===
<!--
Note under the map in the "Blocs" view. Figures and conditions: see ../provincia.md.
-->
::: si proyeccion
[nota] Each province in the colour of the bloc with the most votes, using the groups of "Build your majority": if you move a party to another group, the map changes. A bloc's vote is the sum of its parties' medians; the darker, the bigger its lead over the second bloc.
::: si no
[nota] Each province in the colour of the bloc with the most votes in the general election of July 2023, using the groups of "Build your majority": if you move a party to another group, the map changes. The darker, the bigger its lead over the second bloc.
:::
::: si fuera
[nota] Without seats in the central scenario, and so outside the box, these count in their starting bloc: {fuera}.
:::

=== pie_ficha ===
<!--
Footer of the card opened by clicking a province on the front-page map. Figures and conditions: see ../provincia.md.
-->
::: si participacion
Turnout in 2023: {participacion}.
:::
::: si reparto
[nota] Seats: the most frequent allocation, which comes up in {frecuencia_reparto} simulations (hover over or tap a figure to see each party's range). Votes estimated on the valid votes of 2023. Change in points from 2023.
:::
::: si bloques
[nota] Who makes up each bloc here: {composicion}. These are the groups of «Build your majority»: move a party to another group and the card changes.
:::
::: si bloques_proyeccion
[nota] Seats: the most frequent split between blocs, which comes up in {frecuencia_reparto} simulations (hover over or tap a figure to see the range). A bloc's share is the sum of its parties' shares. Change in points from 2023.
:::

=== tooltip_escanos ===
<!--
Front-page map, "by seats" views. Figures and conditions: see ../provincia.md.
-->
::: si proyeccion
::: si empate
**{provincia}**: in the most likely allocation ({reparto}; it comes up in {prob_reparto} simulations) **{lider}** tie, with {escanos} each.
::: si no
**{provincia}**: in the most likely allocation ({reparto}; it comes up in {prob_reparto} simulations) the one with the most seats is **{lider}**, with {escanos}, {ventaja} {ventaja_palabra} more than the second.
:::
[nota] With the most seats in the simulations: {frecuencias}.
::: si no
::: si empate
**{provincia}**: in 2023 **{lider}** tied, with {escanos} each ({reparto}).
::: si no
**{provincia}**: in 2023 the one with the most seats was **{lider}**, with {escanos}, {ventaja} {ventaja_palabra} more than the second ({reparto}).
:::
:::

=== nota_escanos ===
<!--
Note under the map in the "by seats" views. Figures and conditions: see ../provincia.md.
-->
::: si proyeccion
[nota] Each province in the colour of whoever has the most seats in the most likely allocation of the {simulaciones} simulations; the darker, the more seats ahead of the second. Hatched, the ties, frequent in small provinces. The labels give their seats (2=2 is a tie).
::: si no
[nota] Each province in the colour of whoever won the most seats in the general election of July 2023; the darker, the more seats ahead of the second. Hatched, the ties. The labels give their seats (2=2 is a tie).
:::
::: si bloques
[nota] The blocs are those of "Build your majority": if you move a party to another group, the map changes.
:::

=== tooltip_cambios ===
<!--
Front-page map, "Changes since 2023" view. Figures and conditions: see ../provincia.md.
-->
::: si cambia
**{provincia}**: changes bloc. In 2023, **{antes}**; in the 2026 projection, **{ahora}**.
::: si no
**{provincia}**: no change, **{ahora}** in 2023 and in the 2026 projection.
:::
::: si escanos
[nota] The first in seats stops being the 2023 one in {frecuencia} simulations.
::: si no
[nota] The first in votes stops being the 2023 one in {frecuencia} simulations.
:::

=== nota_cambios ===
<!--
Note under the map in the "Changes since 2023" view. Figures and conditions: see ../provincia.md.
-->
::: si escanos
[nota] {cambian} provinces change the bloc with the most seats compared with 2023, in the most likely allocation of the projection. In strong colour and outlined, those that change; faded, those that do not. The blocs are those of "Build your majority": if you move a party to another group, the map changes. How often the change happens comes from {simulaciones} simulations.
::: si no
[nota] {cambian} provinces change the bloc with the most votes compared with 2023: the bloc that comes first in the most simulations is not the 2023 one. In strong colour and outlined, those that change; faded, those that do not. The blocs are those of "Build your majority": if you move a party to another group, the map changes. How often the change happens comes from {simulaciones} simulations.
:::

=== tooltip_peso ===
<!--
Front-page map, "Where your vote counts" view. Figures and conditions: see ../provincia.md.
-->
::: si vacia
**{provincia}**: here no party of {bloque} has a chance.
::: si no
**{provincia}**, for {bloque}: best {mejor}.
::: si con_lista
It counts {lista}.
:::
::: si con_nunca
{nunca}.
:::
:::

=== nota_peso ===
<!--
Note under the map in the "Where your vote counts" view. Figures and conditions: see ../provincia.md.
-->
[nota] **What it is.** The party of {bloque} with which a vote has the most chances of adding a seat to it, according to «Our forecast». A seat taken from a partner of the same bloc does not count. The colour says how much that vote can count: small provinces come out darker because each vote is a larger part there. The blocs are the groups of «Build your majority». It is not voting advice.
::: si otro_modelo
[nota] This view always uses «Our forecast», even if you chose another model above.
:::

=== pie_peso ===
<!--
Footer of a province's card in the "Where your vote counts" view. Figures and conditions: see ../provincia.md.
-->
::: si vacia
[nota] Here no party of {bloque} has a chance of a seat.
::: si no
[nota] How many times more a vote for {mejor} counts to add a seat to {bloque}. More in [Your vote](#voto).
:::
