<!--
Bloque de resultados del modelo: sale igual en la portada (29N, sección "Qué dice nuestro modelo") y arriba de la
pestaña Modelo. Cómo se escribe: textos/README.md.

Huecos [[...]]: [[escanos_partido]] y [[voto_partido]] (rangos por partido), [[proj]] (barra de escaños),
[[bloques]] (los tres grupos que se arrastran) y [[evolucion]] (izquierda y derecha semana a semana).
No hay cifras ni condiciones.
Añadidos el 16-11-2026: [[quien_176]] (tarjetas "¿Quién llega a 176?", parte quien_176), [[atajos]] (botones, parte atajos)
y [[hemiciclo]] (el hemiciclo, con la frase de la parte hemiciclo_foco debajo). Se pueden mover o borrar.
-->
[[quien_176]]

### Escaños por partido estimados {#escanos | Escaños}

[sub] El punto es la estimación central; la franja recoge 9 de cada 10 simulaciones.

[[escanos_partido]]

::: juego
<div class="juego-tag">Interactivo</div>

#### Forma tu mayoría

[[atajos]]
[[hemiciclo]]

[[proj]]
[[bloques]]

[nota] Arrastra un partido a otro grupo. La mayoría son 176 diputados. Bajo cada grupo, el rango que recoge 9 de cada 10 simulaciones y la probabilidad de que llegue a 176. [Prueba otros porcentajes →](#simulador)

[nota] Cómo han evolucionado la izquierda y la derecha que hayas formado, semana a semana desde la convocatoria; la franja recoge 9 de cada 10 simulaciones.

[[evolucion]]
:::

### Voto estimado {#votos | Voto}

[sub] Porcentaje de voto previsto para el 29N, con la franja que recoge 9 de cada 10 simulaciones.

[[voto_partido]]

=== selector ===
<!--
El selector de modelo, arriba del bloque (solo en la portada). [[selector_modelo]] es el desplegable; la lista de
modelos y sus nombres salen de data/modelos/index.json (pipeline/modelos/portada.py).
Cifra: {descripcion_modelo}, la descripción de una línea del modelo elegido, sin lo que va entre paréntesis; en la portada
sube encima de «Resumen» (Víctor, 2026-11-17).
-->

<div class="controls">
<label for="modelo-sel">Modelo</label>
[[selector_modelo]]
</div>

<p class="note res-desc">{descripcion_modelo}</p>

=== nota_evolucion ===
<!--
Sale encima de la evolución semana a semana cuando el modelo elegido no es el publicado hasta ahora (K0): la serie
semanal solo existe para K0.
-->

[nota] La evolución semana a semana es la del modelo publicado hasta ahora (K0), el único del que guardamos las simulaciones de cada semana.

=== quien_176 ===
<!--
Tarjetas "¿Quién llega a 176?", arriba del bloque (las escribió Claude el 16-11-2026; en porcentaje desde el 17-11-2026,
por decisión de Víctor). Cifras, en porcentaje de las simulaciones del modelo elegido en el selector: {c_ppvox} PP y Vox suman 176 o más, {c_pp} el PP solo, {c_investidura} el bloque de la
investidura de 2023, {c_inv_sin_junts} ese bloque sin Junts (con CC); {c_ninguno} (ninguno de los dos llega) queda calculado pero sin tarjeta desde el 17-11-2026 (con el signo %; sale "<1%" o ">99%" en los extremos);
{simulaciones}, cuántas simulaciones son. Debajo, condición mas_votado: {mv_pp}, {mv_psoe}, {mv_vox}, en qué
porcentaje de las simulaciones es cada uno el partido con más votos (añadido el 17-11-2026). El data-q de cada tarjeta la une con su globo (el rango del 90%): no lo cambies.
-->
#### ¿Quién llega a 176?

<div class="q176">
<div class="q176-c q176-der q176-bloque" data-q="ppvox"><div class="q176-n">{c_ppvox}</div><div class="q176-t">PP y Vox</div></div>
<div class="q176-c q176-izq q176-bloque" data-q="investidura"><div class="q176-n">{c_investidura}</div><div class="q176-t">El bloque de la investidura de 2023</div></div>
<div class="q176-c q176-izq q176-bloque" data-q="inv_sin_junts"><div class="q176-n">{c_inv_sin_junts}</div><div class="q176-t">Ese bloque sin Junts (con CC)</div></div>
<div class="q176-c q176-der" data-q="pp"><div class="q176-n">{c_pp}</div><div class="q176-t">El PP solo</div></div>
</div>

[nota] Porcentaje de las simulaciones del modelo elegido ({simulaciones} en total) en las que pasa cada cosa. Toca o pasa el ratón por una tarjeta para ver el rango de escaños.

::: si mas_votado
#### ¿Quién es la fuerza más votada?

<div class="q176 q176-3">
<div class="q176-c q176-der"><div class="q176-n">{mv_pp}</div><div class="q176-t">El PP</div></div>
<div class="q176-c q176-izq"><div class="q176-n">{mv_psoe}</div><div class="q176-t">El PSOE</div></div>
<div class="q176-c q176-vox"><div class="q176-n">{mv_vox}</div><div class="q176-t">Vox</div></div>
</div>
:::

::: metodología
Cada tarjeta cuenta, entre todas las simulaciones del modelo elegido en el selector, en cuántas pasa lo que dice: que PP y Vox juntos, o el PP solo, tengan 176 escaños o más; que los tenga el bloque de la investidura de 2023, los partidos que votaron a favor en noviembre de 2023 (PSOE, Sumar, que entonces llevaba dentro a Podemos y Compromís, ERC, Junts, EH Bildu, PNV, BNG y Coalición Canaria); y ese bloque sin Junts, con CC dentro (por eso puede dar algo más que el grupo de la izquierda con el que arranca «Forma tu mayoría», que no lleva a CC). Las tarjetas de un solo partido van en su color; las de un bloque, rayadas. La fuerza más votada es la que saca más votos en toda España en cada simulación. El globo de cada tarjeta da el rango que recoge 9 de cada 10 simulaciones. Los atajos de «Forma tu mayoría» colocan esos mismos grupos.
:::

=== atajos ===
<!--
Atajos de "Forma tu mayoría": cada botón coloca los grupos de una vez y las cifras se rehacen. El texto de los botones se
puede cambiar; los data-atajo (ppvox, investidura, izquierda, restablecer) no. Qué partidos lleva cada atajo: resultados.js (ATAJOS).
-->
<div class="atajos" role="group" aria-label="Grupos ya formados">
<button type="button" data-atajo="ppvox">PP + Vox</button>
<button type="button" data-atajo="investidura" title="PSOE, Frente Amplio, Podemos, ERC, Junts, EH Bildu, PNV, BNG y CC">Bloque de investidura de 2023</button>
<button type="button" data-atajo="izquierda" title="PSOE, Frente Amplio y Podemos">Izquierda</button>
<button type="button" data-atajo="restablecer">Restablecer</button>
</div>

=== hemiciclo_foco ===
<!--
Bajo el hemiciclo de "Forma tu mayoría"; se rehace con cada cambio de grupos. Cifras: {grupo} (Izquierda, Otros o Derecha, el
grupo resaltado: el del último atajo o el último al que has movido un partido), {partidos} (quiénes lo forman), {escanos} (sus
escaños en el escenario central), {veces} (de cada 100 simulaciones, en cuántas llega a 176). Condición: simulaciones.
-->

::: si simulaciones
[nota] Resaltado, **{grupo}** ({partidos}): {escanos} escaños en el escenario central; llega a 176 en {veces} de cada 100 simulaciones.
::: si no
[nota] Resaltado, **{grupo}** ({partidos}): {escanos} escaños.
:::

[nota] Cada punto es un escaño del escenario central, en el color de su partido, ordenados por los grupos que formes; la raya del centro marca el 176. Toca o pasa el ratón por un partido para ver su rango.
