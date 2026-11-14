<!--
Pestaña D'Hondt (cómo se reparten los escaños). Cómo se escribe: textos/README.md.

Esta página no tiene cifras ni condiciones en el texto principal: los números salen en los gráficos,
las tablas y las animaciones, que se quedan en el código ([[...]] marca dónde va cada uno).

Bloques del código:
  [[controles_regla]]   selector de provincia y botones Soria, Cantabria, Madrid
  [[tn]]                los turnos animados
  [[controles_precio]]  selector de provincia del precio
  [[pr]]                la línea del precio
  [[controles_juega]]   los botones de escaños en juego
  [[a2]] [[tabla2]]     los botes de arena y su tabla
  [[controles_voto]]    selector de provincia (o toda España)
  [[sv]] [[pt]] [[ai]]  votos sin escaño, los tres pasos y los escaños en el aire

Parte "ocultas" (nota bajo los turnos, cuando hay listas pequeñas que no se dibujan):
  {ocultas}             "1 lista" o "3 listas"
-->
# Cómo se reparten los escaños

[sub] Cada provincia reparte sus escaños con la regla D'Hondt. Aquí se ve funcionar con los votos reales de las generales de julio de 2023, y lo que provoca.

[[índice]]

## La regla {#regla}

[[controles_regla]]
[[tn]]
<p class="note" id="tnnote"></p>

### Todos los turnos de una vez

[sub] Los votos de cada lista divididos entre 1, 2, 3…, puestos en fila de mayor a menor. Los primeros son los escaños; el primero que se queda fuera enseña lo cerca que estuvo.

<div id="esc" class="chart"></div>
<details class="metodo-box"><summary>La tabla de cocientes</summary><div class="metodo" id="tabla"></div></details>

## Encuentra el precio {#precio}

[sub] Otra forma de ver la misma regla. Arrastra la línea: es el precio de un escaño. Cada lista se lleva tantos escaños como bloques enteros de ese precio caben en sus votos. Busca un precio que reparta justo los escaños de la provincia.

[[controles_precio]]
[[pr]]

## Pruébalo {#juega}

[sub] Los votos como arena en botes. Arrastra la arena de cada bote para cambiar sus votos, y cambia los escaños en juego. Prueba a que Naranja saque escaño, o a quitarle uno a Rojo con los votos justos.

[[controles_juega]]
[[a2]]
[[tabla2]]

## ¿Sirvió tu voto? {#voto}

[sub] Un voto a una lista que no saca escaño en su provincia no elige a nadie. En gris, esos votos.

[[controles_voto]]
[[sv]]

## De proporcional a D'Hondt {#partes}

[sub] ¿Lo que se aleja el Congreso de los votos es culpa de D'Hondt o de las provincias? Las dos cosas, y se pueden separar en dos pasos.

[[pt]]

### La barrera real depende de la provincia

[sub] Cada punto es una provincia. Relleno: el porcentaje de la lista más pequeña que sacó escaño. Hueco: el de la más grande que se quedó sin él. Con más del porcentaje de la línea discontinua, el escaño está asegurado.

<div id="barrera" class="chart"></div>

## Escaños en el aire {#aire}

[sub] En cada provincia, el último escaño se decide entre dos listas. Estas son las que se decidieron por menos votos en 2023: los votos que le faltaron a la que se quedó fuera.

[[ai]]

::: metodología #metodo
**La regla.** En cada provincia se dividen los votos de cada candidatura entre 1, 2, 3… hasta el número de escaños, y los escaños van a los cocientes más altos. Solo cuentan las candidaturas con al menos el 3% de los votos válidos de la provincia (candidaturas más voto en blanco). Es el artículo 163 de la Ley Orgánica del Régimen Electoral General. Ceuta y Melilla eligen un diputado cada una, por mayoría, que da lo mismo.

**Turnos, precio y arena.** Son tres formas de la misma regla. En los turnos, la fuerza de una lista son sus votos divididos entre sus escaños más uno, y cada escaño va a la más fuerte. En el precio, cada lista recibe tantos escaños como veces cabe el precio en sus votos, redondeando hacia abajo; el precio que reparte justo los escaños de la provincia está entre el último cociente que obtiene escaño y el primero que se queda fuera. La arena es el precio visto desde arriba: una línea que baja.

**Votos sin escaño.** Votos a candidaturas que no obtuvieron ningún escaño en su provincia. No cuenta los votos sobrantes de las que sí obtuvieron alguno, ni el voto en blanco.

**Los tres pasos.** Proporcional en toda España: los 350 escaños por restos mayores sobre los votos a candidaturas de toda España, sin barrera. Proporcional en cada provincia: los escaños de cada provincia por restos mayores sobre sus votos, sin barrera, sumados. D'Hondt: el resultado oficial. La diferencia entre los dos primeros es lo que pone el reparto de escaños entre provincias y el tamaño pequeño de muchas; la diferencia entre los dos últimos, lo que pone la fórmula con su barrera.

**Le faltaron.** Los votos que necesitaba la lista que se queda fuera para que su siguiente cociente superara al último que obtuvo escaño, sin que nadie más cambie; en porcentaje, sobre los votos válidos de la provincia.

**Las barras y los botes.** Se dibujan las listas con al menos el 1% de los votos válidos de la provincia, como mucho nueve. Las demás no llegan al 3% y no cambian el reparto. Datos: Ministerio del Interior.
:::

=== ocultas ===

Además, {ocultas} con menos del 1% de los votos, que no se dibujan.
