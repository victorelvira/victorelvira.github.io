<!--
Your vote (tab "Your vote", #voto). Figures and conditions: see ../voto.md.
-->
# Your vote

## Where your vote counts {#peso | Where it counts}

[sub] If you want a bloc to win more seats, with which party of that bloc does your vote count most in your province? Choose where you vote and which bloc you prefer.

[[controles]]

[[respuesta]]

## Every province {#todas | Every province}

[sub] The best option of each bloc in each province, and the chance that one vote for that party decides a seat of the bloc (1 in…). Click a header to sort.

[[lista]]

::: metodología
For each province and each simulation of «Our forecast» (140,000), we count how many more votes each list needs to win one more seat under the D'Hondt rule and the 3% threshold, and whom it would take it from. A seat counts for the bloc only if it comes from another bloc: if the PP takes it from Vox, the right gains nothing. With 1,000 new votes for a party we measure how often the bloc gains a seat; divided by 1,000, it is the chance that a single vote decides it, «1 in…». What helps is comparing the parties within your province; across provinces, small ones come out higher because 1,000 votes are a larger part of the total there. The night's scenarios split the simulations into thirds by the national lead in votes of the left (PSOE, Frente Amplio, Podemos, ERC, Bildu, PNV) over the right (PP, Vox, SALF): «goes well» is the third most favourable to the chosen bloc and «goes badly» the least; the same calculation is repeated in each. With today's data, the right leads the left by about {mediana} points of the vote (the median of the simulations); the third that is good for the left is the simulations where that lead is under {corte_bajo} points, the middle one goes from {corte_bajo} to {corte_alto}, and the one good for the right, over {corte_alto}. It assumes everyone else votes as forecast, and it is not voting advice: it describes the forecast, with its uncertainty. The blocs are the starting groups of «Build your majority»; in Navarra, Geroa Bai counts with the PNV.
:::

=== respuesta ===
<!--
See ../voto.md.
-->
::: si vacia
In **{provincia}**, no party of {bloque} has a real chance of one more seat: here a vote almost never changes the allocation.
::: si no
In **{provincia}**, if you want more seats for {bloque}, your vote counts most with **{mejor}**: the chance that one vote for it decides a seat is **1 in {n}**.
::: si segundo
::: si parejas
[nota] It is small, as it always is for a single vote; what counts is the comparison, and here {segundo} counts almost as much.
::: si no
[nota] It is small, as it always is for a single vote; what counts is the comparison: here a vote {a_mejor} counts {veces} times as much as one {a_segundo}.
:::
:::
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
::: si roba
**{partido}**: 1 in {n}. When it wins a seat, it often takes it {a_dentro}, of the same bloc, and then {bloque} gains nothing.
:::
::: si normal
**{partido}**: 1 in {n}.
:::

=== contexto ===
<!--
See ../voto.md.
-->
::: si ataque
[nota] **If the night goes well for {bloque}**, the third of the simulations where it leads most: an attacking vote, to snatch one more seat.
:::
::: si normal
[nota] **If the night goes as expected**, the middle third of the simulations.
:::
::: si defensa
[nota] **If the night goes badly for {bloque}**, the third of the simulations where it does worst: a defensive vote, so as not to lose a seat.
:::

=== depende ===
<!--
See ../voto.md.
-->
::: si igual
[nota] **Here it does not matter how the night goes**: in all three cases, a vote counts most with {mejor_bien}.
::: si no
::: si bn
[nota] **Here it depends on how the night goes**: if it goes well for {bloque} or as expected, a vote counts most with {mejor_bien}; if badly, with {mejor_mal}. Choose it above for the detail.
:::
::: si nm
[nota] **Here it depends on how the night goes**: if it goes well for {bloque}, a vote counts most with {mejor_bien}; if as expected or badly, with {mejor_normal}. Choose it above for the detail.
:::
::: si no_bn_nm
[nota] **Here it depends on how the night goes**: if it goes well for {bloque}, a vote counts most with {mejor_bien}; if as expected, with {mejor_normal}; if badly, with {mejor_mal}. Choose it above for the detail.
:::
:::

=== riesgo ===
<!--
See ../voto.md.
-->
::: si hay
[nota] Seats of {bloque} in the balance here, the ones a defensive vote helps to hold: {lista}.
::: si no
[nota] Here {bloque} has no seat in the balance: the ones it wins, it wins in more than 95 of 100 simulations.
:::
