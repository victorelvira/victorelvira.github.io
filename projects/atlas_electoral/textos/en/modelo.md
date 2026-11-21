<!--
English version of textos/modelo.md (Modelo tab). Same parts, figures {name} and slots [[name]] as the Spanish file;
the list of what each figure holds is in the comment at the top of the Spanish file.
Checked by pipeline/check_textos_en.py.
-->
# Statistical model

[[índice]]

## Forecast <span class="tag-exp">experimental model</span> {#prediccion | Forecast}

[[pred]]

## How far to trust it {#fiarse}

[[fiarse]]

## {#glosario | Glossary}

[[glosario]]

## {#fotos | Photos}

[[fotos]]

=== prediccion ===

[sub] Forecast of the model we published until now (K0; the front page shows «Our forecast» by default, which combines seven models). It starts from the polls and adds what the polls do not say: the error the industry has made at every general election since 1982. Updated on {fecha} with {n_encuestas} polls.


### Vote and seats by party

[[tabla_partidos]]

### Seats of each group in the {simulaciones} simulations

[[histograma]]

[nota] The PP has the most seats in **{pp_primero} out of 100** simulations.

### How it has changed

[nota] Each week, with only the polls published up to then.

::: rejilla
<div>
#### Probability that PP, Vox and SALF reach 176
[[serie_probabilidad]]
</div>
<div>
#### Seats by party (median)
[[serie_escanos]]
</div>
:::

#### Our forecast, day by day

[nota] What the front page said each day since 15 November, as published: this series is never recomputed, unlike the weekly one above (redone with today's model). An asterisk marks the days the model changed, not only the polls. It freezes with the blackout, on 23 November.

[[diario]]

::: metodología
**What it does.** For each party (PP, PSOE, Vox, Frente Amplio, Podemos, SALF, ERC, Junts, Bildu and PNV) it tracks support day by day with a filter that combines every poll of the cycle, removing each pollster's usual deviation in this cycle (what it did in 2023 counts for little: from one general election to the next, a pollster's bias hardly repeats). That gives today's level and its uncertainty.

**What the polls do not know.** On election day the industry error is added: how wrong this same filter was, with every poll, at each general election since 1982, in a direction that cannot be known in advance. It is simulated with the scale and the correlations between parties measured in those elections (the right moves together; right and left, in opposite directions). The tails are somewhat heavier than a normal's: in past general elections a 90% range built this way held about 89 times in 100 a week before the vote and about 82 a month before, so it is widened a little and leaves room for large surprises.

**Seats.** Each simulation of the national vote is taken to the provinces as in the simulator, with extra noise by region and by province calibrated on 1977-2023, and the seats are allocated with D'Hondt. The ranges cover 90% of the simulations.

[nota] Model K0, the one we published until now (specification in docs/modelos/especificacion/K0.md): a Kalman filter per party, industry error with tails somewhat heavier than a normal's (Student t with 14 degrees of freedom since 18 November; 100 before), {simulaciones} simulations. A provincial layer built from the CIS and 40dB microdata and the regional polls was also tested: it improves the map of percentages but not the seats, so it is not used. Parameters: scale of the industry error {b_escala}·√(p(1−p)); regional noise {s_ccaa}, provincial {s_prov}.
:::

=== sin_prediccion ===

[nota] The model's forecast will appear here.

=== fiarse ===

We have rerun the model we published until now (K0) for the {elecciones} general elections since {desde}, with only the polls known at the time. One week before, the result fell inside its range (the one that covers 9 out of 10 simulations) in {acierto_voto} out of 100 cases for the vote and in {acierto_escanos} out of 100 for the seats. «Our forecast», the combination of seven models that the front page shows by default, has not been tested this way as such.

::: si sensibilidad
The probability of a majority is not known as precisely as it seems. In K0, if the joint error of the polls were 50% larger than the historical one, PP and Vox would reach 176 in {error_x15} out of 100 simulations; if it were 20% smaller, in {error_x08}. And in those {elecciones} elections the model gave more than 50% to the right reaching 176 only twice, so a figure this high has hardly been put to the test.
:::

=== glosario ===

::: plegable "Glossary"
**Cooking.** What a pollster publishes is not what its respondents answer: the firm weights the answers, allocates the undecided and estimates who will vote. The result is the «cooked» estimate, the only figure our models use.

**Direct voting intention.** What respondents answer, uncooked: the party they name as a share of the whole sample, undecided and abstention included.

**Cumulative tracker.** A poll published every few days with the same start date and a growing sample. So as not to count the same people twice, the model uses only the new interviews of each release, or only the latest one.

**Sampling error.** How far a poll deviates because it asked a few people at random and not everyone. It is larger the smaller the sample and evens out when many polls are combined.

**House effect.** A pollster's tendency to give a party more or less than the other pollsters, poll after poll. It is measured against the other firms, not against the result, and the published model removes it.

**Industry error.** How wrong all the polls are at once, on the same day and in the same direction. The polls of that election cannot see it, so the model adds it blind, with the size it has had at general elections since 1982.

**Poll average.** The published model tracks each party's support day by day with a filter that gives more weight to recent polls and to those with larger samples. Older polls weigh less, but they do not vanish all at once.

**Simulation.** One of the thousands of possible elections the model imagines: a national result, its breakdown by province and the seats that follow. Every probability on the site counts simulations.

**«9 out of 10».** We express uncertainty as frequencies: «in 9 out of 10 simulations» means that the result comes out in 9 out of every 10 of those imagined elections.

**Range.** The band that covers 9 out of 10 simulations: it leaves out the lowest 1 in 20 and the highest 1 in 20.

**Absolute majority.** 176 of the 350 deputies. The probability that a group reaches it is how many simulations out of 100 reach 176.

**Parties that move together.** In the simulations the error is not independent for each party: what the PP gains tends to go with what Vox gains, and what the right gains the left loses, as has happened in past elections.

**From the national vote to the provinces.** Each party starts from its 2023 vote in each province (new parties, from the 2024 European election) and rises or falls in the same proportion as in Spain as a whole, with an extra margin by region and by province.

**D'Hondt and the 3%.** The rule that allocates seats in each province. Lists with less than 3% of the province's valid votes are left out of the allocation.

**Seat in play.** A seat that no party wins in at least 9 out of 10 simulations. The rest are taken as decided.

**Model family.** Models built on the same underlying idea: the filters that remove the house effect (K), the quality of the pollsters (C), the regional, European and municipal elections in the breakdown by province (R), the simple average (M), El País's rules (L), POLITICO's (P), those of other aggregators (E) and the trajectory, which extends each party's trend (T).

**Our forecast.** What the front page shows by default: seven models, one per family (K7, C0, R0, M0, L0, P0 and E0), with equal weight. Their full simulations are pooled, including each province's vote, and from that mix come the seats, the map, the province cards and the Senate; seats are not averaged. One model per family, and not all of them, because models of the same family are so alike that they would be counted several times. We do not pick a single one because 13 general elections are not enough to know which is most accurate.

**Rerunning the past.** To know how far to trust it, the model is run again for every general election since 1986 with only the polls known at the time, and compared with what happened.
:::

=== fotos ===

::: plegable "Photos of the candidates"
Next to each party is a photo of the person who heads its list for Congress on 29 November, according to the lists proclaimed in the BOE (the Official State Gazette): for parties standing across Spain, the head of the Madrid list (for Frente Amplio, its candidate for prime minister, Ada Colau, who heads the Barcelona list); for the rest, the head of the list in its main province. The photos come from Wikimedia Commons, under free licences; these are their authors and licences. Where there is no free photo, the initials are shown.

[[lista_fotos]]
:::

=== conjunta ===
<!--
Figures and conditions: see ../modelo.md.
-->
[nota] Each cell is a combination of seats {dx} and {dy}; the stronger its colour, the more simulations land there. What is missing up to 350 belongs to the other parties.
::: si llega
[nota] Blue: 176 seats or more for {ny} (in {y176} simulations); red: 176 or more for {nx} (in {x176}); grey: neither (in {ninguno}).
:::
::: si delante
[nota] Blue if {ny} wins more seats than {nx}, red if the other way round, grey if they tie: {ny} comes ahead in {y176} simulations, {nx} in {x176} and they tie in {ninguno}.
:::
::: si tres
[nota] Drag to turn it. The height of each bar is how many simulations give that combination (in steps of 3 seats).
:::

=== tooltip_conjunta ===
<!--
Figures: see ../modelo.md.
-->
**{nx} {x}**, **{ny} {y}**, the rest {otros}: in {frecuencia} simulations.
