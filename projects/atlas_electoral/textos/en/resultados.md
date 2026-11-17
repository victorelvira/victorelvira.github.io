<!--
English version of textos/resultados.md (the model's results block, shown on the front page and at the top of the
Modelo tab). Same parts, figures, slots and conditions as the Spanish file; edit the Spanish file first.

Slots: [[quien_176]], [[escanos_partido]] and [[voto_partido]] (ranges per party), [[atajos]], [[hemiciclo]],
[[proj]] (seat bar), [[bloques]] (the three draggable groups), [[evolucion]] (left and right week by week).
-->
[[quien_176]]

### Estimated seats by party {#escanos | Seats}

[sub] The dot is the central estimate; the band covers 9 out of 10 simulations.

[[escanos_partido]]

::: juego
<div class="juego-tag">Interactive</div>

#### Build your majority

[[atajos]]
[[hemiciclo]]

[[proj]]
[[bloques]]

[nota] Drag a party into another group. A majority is 176 seats. Under each group, the probability that it reaches 176. [Try other percentages →](#simulador)

[nota] How the left and the right you have built have moved, week by week since the election was called; the band covers 9 out of 10 simulations.

[[evolucion]]
:::

### Estimated vote {#votos | Vote}

[sub] Forecast vote share for 29N, with the band that covers 9 out of 10 simulations.

[[voto_partido]]

=== selector ===
<!--
The model selector above the block (front page only). [[selector_modelo]] is the drop-down. Figure: {descripcion_modelo},
the one-line description of the chosen model.
-->

<div class="controls">
<label for="modelo-sel">Model</label>
[[selector_modelo]]
</div>

<p class="note res-desc">{descripcion_modelo}</p>

=== nota_evolucion ===
<!--
Shown above the weekly evolution when the chosen model is not the one published until now (K0).
-->

[nota] The week-by-week evolution is that of the model published until now (K0), the only one whose simulations we keep for every week.

=== quien_176 ===
<!--
"Who reaches 176?" cards. Figures, as a percentage of the chosen model's simulations: {c_ppvox}, {c_pp},
{c_investidura}, {c_inv_sin_junts}; {simulaciones}, how many simulations. Condition mas_votado: {mv_pp}, {mv_psoe},
{mv_vox}. Do not change the data-q attributes.
-->
#### Who reaches 176?

<div class="q176">
<div class="q176-c q176-der q176-bloque" data-q="ppvox"><div class="q176-n">{c_ppvox}</div><div class="q176-t">PP and Vox</div><div class="q176-r">{r_ppvox}</div></div>
<div class="q176-c q176-izq q176-bloque" data-q="investidura"><div class="q176-n">{c_investidura}</div><div class="q176-t">The 2023 investiture bloc</div><div class="q176-r">{r_investidura}</div></div>
<div class="q176-c q176-izq q176-bloque" data-q="inv_sin_junts"><div class="q176-n">{c_inv_sin_junts}</div><div class="q176-t">The investiture bloc without Junts or CC</div><div class="q176-r">{r_inv_sin_junts}</div></div>
<div class="q176-c q176-der" data-q="pp"><div class="q176-n">{c_pp}</div><div class="q176-t">The PP alone</div><div class="q176-r">{r_pp}</div></div>
</div>

[nota] Share of the chosen model's simulations ({simulaciones} in total) in which each outcome happens. Below, the expected seats: those of the median simulation, so half the simulations give more and half give fewer.

::: si mas_votado
#### Who wins the most votes?

<div class="q176 q176-3">
<div class="q176-c q176-der"><div class="q176-n">{mv_pp}</div><div class="q176-t">The PP</div></div>
<div class="q176-c q176-izq"><div class="q176-n">{mv_psoe}</div><div class="q176-t">The PSOE</div></div>
<div class="q176-c q176-vox"><div class="q176-n">{mv_vox}</div><div class="q176-t">Vox</div></div>
</div>
:::

::: metodología
Each card counts, among all the simulations of the model chosen in the selector, in how many its outcome happens: that PP and Vox together, or the PP alone, have 176 seats or more; that the 2023 investiture bloc has them, the parties that voted in favour in November 2023 (PSOE, Sumar, which then included Podemos and Compromís, ERC, Junts, EH Bildu, PNV, BNG and Coalición Canaria); and that bloc without Junts or CC, the same left-hand group «Build your majority» starts with. Cards for a single party are in its colour; cards for a bloc are striped. The party with the most votes is the one that wins the most votes across Spain in each simulation. Each card also gives the expected seats, those of the median simulation. The shortcuts in «Build your majority» set up these same groups.
:::

=== atajos ===
<!--
Shortcuts of "Build your majority": each button sets the groups at once. Button text may change; the data-atajo values may not.
-->
<div class="atajos" role="group" aria-label="Ready-made groups">
<button type="button" data-atajo="ppvox">PP + Vox</button>
<button type="button" data-atajo="investidura" title="PSOE, Frente Amplio, Podemos, ERC, Junts, EH Bildu, PNV, BNG and CC">2023 investiture bloc</button>
<button type="button" data-atajo="izquierda" title="PSOE, Frente Amplio and Podemos">Left</button>
<button type="button" data-atajo="restablecer">Reset</button>
</div>

=== hemiciclo_foco ===
<!--
Under the hemicycle of "Build your majority". Figures: {grupo} (the highlighted group), {partidos} (its parties), {escanos}
(its seats in the central scenario), {veces} (out of every 100 simulations, in how many it reaches 176). Condition: simulaciones.
-->

::: si simulaciones
[nota] Highlighted, **{grupo}** ({partidos}): {escanos} seats in the central scenario; it reaches 176 in {veces} out of every 100 simulations.
::: si no
[nota] Highlighted, **{grupo}** ({partidos}): {escanos} seats.
:::

[nota] Each dot is a seat in the central scenario, in its party's colour, ordered by the groups you build; the line in the middle marks 176. Tap or hover over a party to see its range.

=== condiciona ===
<!--
Under "Seats per party", the "Hold the seats of" control. Figures and conditions: see ../resultados.md.
-->
::: si activo
::: si ninguna
[nota] No simulation gives {partido} {escanos}: try a value closer to the centre.
::: si no
::: si menos
There is a {prob} chance that {partido} gets {v} seats or fewer (expected: {esperados}).
:::
::: si mas
There is a {prob} chance that {partido} gets {v} seats or more (expected: {esperados}).
:::
[nota] The bands count only the {n} simulations (out of {total}) in which {partido} gets {escanos}; in grey, the band with all of them. In these, PP and Vox reach 176 in {ppvox}.
:::
::: si pocas
[nota] These are few simulations: take it as a pointer.
:::
::: si no
[nota] Move the slider to hold one party's seats: the other bands then count only the simulations in which that party gets those seats. That shows what moves with it.
:::
