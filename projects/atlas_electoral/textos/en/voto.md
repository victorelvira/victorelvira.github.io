<!--
Your vote (tab "Your vote", #voto). Figures and conditions: see ../voto.md.
-->
# Your vote

## Where your vote counts {#peso | Where it counts}

[sub] If you want a bloc to win more seats, with which party of that bloc does your vote count most in your province? Choose where you vote and which bloc you prefer.

[[controles]]

[[respuesta]]

## Every province {#todas | Every province}

[sub] The best option of each bloc in each province, the second one, and how many times more a vote for the first counts. Click a header to sort.

[[lista]]

::: metodología
For each province and each simulation of «Our forecast» (140,000), we count how many more votes each list needs to win one more seat under the D'Hondt rule and the 3% threshold, and whom it would take it from. A seat counts for the bloc only if it comes from another bloc: if the PP takes it from Vox, the right gains nothing. We give 1,000 new votes to each party and count in what share of the simulations the bloc gains a seat. That share is proportional to the chance that a single vote for that party adds a seat to the bloc, and what we publish is the ratio between parties: «a vote for the PNV has 1.2 times the chances of one for the PSOE». The chance of a single vote, on its own, is always very small, one in hundreds of thousands or millions, so we do not give it: what helps to decide is the comparison within your province. The figures are over all the simulations. Below, we say whether the best option changes with how the night goes: we split the simulations into thirds by the national lead in votes of the left (PSOE, Frente Amplio, Podemos, ERC, Bildu, PNV) over the right (PP, Vox, SALF) and repeat the calculation in each third. With today's data, the right leads the left by about {mediana} points of the vote in the median simulation; the third that is good for the left is the simulations where that lead is under {corte_bajo} points, the middle one goes from {corte_bajo} to {corte_alto}, and the one good for the right, over {corte_alto}. It assumes everyone else votes as forecast, and it is not voting advice: it describes the forecast, with its uncertainty. The blocs are the starting groups of «Build your majority»; in Navarra, Geroa Bai counts with the PNV.
:::

=== respuesta ===
<!--
See ../voto.md.
-->
::: si vacia
In **{provincia}**, no party of {bloque} has a chance of one more seat.
::: si no
::: si solo
In **{provincia}**, for {bloque}: **{mejor}**, the only option.
::: si no
In **{provincia}**, for {bloque}, best **{mejor}**. How many times more a vote for it counts than one for:
:::
:::

=== depende ===
<!--
See ../voto.md.
-->
::: si igual
[nota] However the night goes, the best option is the same.
::: si no
[nota] **Depending on the night:** if it goes well for {bloque}, {mejor_bien}; as expected, {mejor_normal}; badly, {mejor_mal}.
:::
