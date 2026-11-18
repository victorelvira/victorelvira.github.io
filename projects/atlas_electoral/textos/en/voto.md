<!--
Your vote (tab "Your vote", #voto). Figures and conditions: see ../voto.md.
-->
# Your vote

## Where your vote counts {#peso | Where it counts}

[sub] If you want a bloc to win more seats, with which party of that bloc does your vote count most in your province? Choose where you vote and which bloc you prefer.

[[controles]]

[[respuesta]]

## Every province {#todas | Every province}

[sub] The best option of each bloc in each province, the second one, and how many times more chances a vote for the first has of adding a seat to the bloc. Click a header to sort.

[[lista]]

::: metodología
For each province and each simulation of «Our forecast» (140,000), we count how many more votes each list needs to win one more seat under the D'Hondt rule and the 3% threshold, and whom it would take it from. A seat counts for the bloc only if it comes from another bloc: if the PP takes it from Vox, the right gains nothing. We give 1,000 new votes to each party and count in what share of the simulations the bloc gains a seat. That share is proportional to the chance that a single vote for that party adds a seat to the bloc, and what we publish is the ratio between parties: «a vote for the PNV has 1.2 times the chances of one for the PSOE». The chance of a single vote, on its own, is always very small, one in hundreds of thousands or millions, so we do not give it: what helps to decide is the comparison within your province. The figures are over all the simulations. Below, we say whether the best option changes with how the night goes: we split the simulations into thirds by the national lead in votes of the left (PSOE, Frente Amplio, Podemos, ERC, Bildu, PNV) over the right (PP, Vox, SALF) and repeat the calculation in each third. With today's data, the right leads the left by about {mediana} points of the vote in the median simulation; the third that is good for the left is the simulations where that lead is under {corte_bajo} points, the middle one goes from {corte_bajo} to {corte_alto}, and the one good for the right, over {corte_alto}. It assumes everyone else votes as forecast, and it is not voting advice: it describes the forecast, with its uncertainty. The blocs are the starting groups of «Build your majority»; in Navarra, Geroa Bai counts with the PNV.
:::

=== respuesta ===
<!--
See ../voto.md.
-->
::: si vacia
In **{provincia}**, no party of {bloque} has a real chance of one more seat: here a vote almost never changes the allocation.
::: si no
In **{provincia}**, if you want more seats for {bloque}, your vote has the most chances of adding a seat with **{mejor}**. Against the others:
:::

=== partido ===
<!--
See ../voto.md.
-->
::: si umbral
**{partido}**: a vote for it almost never adds a seat here. It stays under 3% of the vote, the minimum to enter the allocation.
:::
::: si lejos
**{partido}**: a vote for it almost never adds a seat here; it is far from getting one.
:::
::: si parejas
**{partido}**: almost the same chances as {mejor}.
:::
::: si normal
**{partido}**: a vote {a_mejor} has **{veces} times** the chances of adding a seat to {bloque} of one {a_partido}.
:::

=== roba ===
<!--
See ../voto.md.
-->
When it wins a seat, it often takes it {a_dentro}, of the same bloc, and then {bloque} gains nothing.

=== depende ===
<!--
See ../voto.md.
-->
::: si igual
[nota] **Here it does not matter how the night goes**: whether it goes well, as expected or badly for {bloque}, a vote counts most with {mejor_bien}.
::: si no
::: si bn
[nota] **Here it depends on how the night goes**: if it goes well for {bloque} or as expected, a vote counts most with {mejor_bien}; if badly, with {mejor_mal}.
:::
::: si nm
[nota] **Here it depends on how the night goes**: if it goes well for {bloque}, a vote counts most with {mejor_bien}; if as expected or badly, with {mejor_normal}.
:::
::: si no_bn_nm
[nota] **Here it depends on how the night goes**: if it goes well for {bloque}, a vote counts most with {mejor_bien}; if as expected, with {mejor_normal}; if badly, with {mejor_mal}.
:::
:::

=== pequeno ===
<!--
See ../voto.md.
-->
[nota] Counting most does not mean counting much: a single vote very rarely decides a seat. What matters is the comparison between parties.
