<!--
English version of textos/senado.md (Senado tab). Same parts, figures {name}, slots [[name]] and conditions as the
Spanish file; the list of what each figure holds is in the comment at the top of the Spanish file.
Checked by pipeline/check_textos_en.py.
-->
# The Senate

[sub] How many senators each party could win on 29 November, province by province, and how the chamber stood after 2023.

[[cabecera]]

[[panel]]

## Joint lists {#coaliciones | Coalitions}

[[coaliciones]]

::: metodología #metodo
**How the vote works.** Each mainland province elects 4 senators and each voter marks up to 3; the larger islands elect 3, Ceuta and Melilla 2 and the smaller islands 1. The candidates with the most votes win, whatever their list. From this year Ibiza and Formentera elect one each, so {electos_total} are elected. The regional parliaments appoint another {designados_total}: the chamber has {camara} seats and an absolute majority is {mayoria}.

**Where it comes from.** From the same {simulaciones} simulations of the Congress vote in the model (updated on {fecha}). In each one, every party's Congress vote is turned into votes for its Senate candidates using what happened in 2019 and 2023, and the candidates with the most votes win. The appointed senators are set by the current parliaments: they do not depend on 29 November. Tested on 2023 with what was learnt from 2019, the most likely allocation gets the party right for {aciertos_2023} of the 208 senators.

**What weighs most.** Three assumptions move the probability that the PP reaches {mayoria} on its own, which with everything as it stands happens in {p_base} out of 100 simulations:

*How much more the PP gets in the Senate than in Congress.* In 2019, with Ciudadanos in the race, its Senate candidates got considerably more than its Congress list; in 2023, almost the same. We use the average of the three elections ({offset_pp} more, compared with the PSOE). If 2023 repeats itself ({offset_2023}), the PP stays at {pp_2023} senators and the majority falls to {p_2023} out of 100.

*How much of their partners' vote the joint lists keep.* The PSOE runs with IU and Movimiento Sumar (Senado de Progreso) in almost every province. There was only one list of this kind in 2019-2023, Eivissa-Formentera, which kept {lambda} of its partners' vote. If they kept half, a PP majority would come out in {p_lambda05} out of 100; if they kept all of it, in {p_lambda1}.

*Voters with no Senate list.* Vox has no Senate list in Valencia or Castellón and fields a single candidate in 16 provinces; SALF has none at all. We assume that between none and half of those voters mark the closest list. If none did, {p_omega0} out of 100; if half did, {p_omega05}.

If the PP gives Vox one of its appointed senators from Andalusia, as the press reported in July, a PP majority on its own comes out in {p_andalucia} out of 100 simulations.

**The islands.** Each island is its own constituency and is drawn with the outline of its municipalities. With no polls per island, each party's vote on each island starts from its share in 2023, with noise.
:::

=== titulo_2026 ===
The Senate on 29 November, according to the model

=== titulo_2023 ===
Starting point: the Senate after 2023

=== titular_2026 ===
<div class="sn-titular">The PP, {pp_total} of {camara} senators</div>

[sub] Median of {simulaciones} simulations: {pp_electos} elected and {pp_designados} appointed. In 9 out of 10, between {pp_lo} and {pp_hi}.

[línea] An absolute majority is **{mayoria}**. The PP reaches it on its own in **{p_pp} out of 100** simulations; with Vox, in **{p_pp_vox} out of 100**.

=== nota_2026 ===
[nota] The hemicycle shows each party's median. Senators appointed by the regional parliaments are in a light shade.
::: si sin_asignar
[nota] The medians do not add up to the whole chamber: {sin_asignar} seats, in grey, fall to one side or the other depending on the simulation.
:::

=== titular_2023 ===
<div class="sn-titular">The PP, {pp_electos23} of {electos23} elected senators</div>

[sub] The PSOE won {psoe_electos23}. With the appointed senators, the PP had an absolute majority in the chamber.

=== nota_2023 ===
[nota] 208 senators were elected; the regional parliaments appoint another {designados_no}, who are not shown here. Each list's vote is that of its most voted candidate.

[nota] Turnout {participacion}. Blank votes {blancos}; invalid {nulos}.

=== mapa_2026 ===
### Party with the most senators in each constituency

[nota] Most likely allocation. The stronger the colour, the surer: hover (or tap) to see how often it comes out and the alternatives.

=== mapa_2023 ===
### Party with the most senators in each constituency

[nota] Result of July 2023. In 2023 Ibiza and Formentera elected one senator together.

=== comunidades_2026 ===
### By autonomous community

[nota] Senators elected in the most likely allocation of each constituency, plus those appointed by its parliament.

=== comunidades_2023 ===
### By autonomous community

[nota] Senators elected in 2023.

=== coaliciones_intro ===
[sub] Parties that run separately for Congress run together for the Senate. This is how the model counts them: each joint list adds up the Congress vote of its parties, with the discount described in the methodology.
