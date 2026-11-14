# Textos del Atlas Electoral

Cada pestaña tiene aquí su archivo de texto. Lo que escribas es lo que sale en la web: guarda y recarga la página
(Cmd+Shift+R) en http://localhost:8090/elecciones_espa%C3%B1a/web/atlas_electoral.html

| Archivo | Pestaña |
|---|---|
| portada.md | 29N (portada) |
| provincia.md | Tu provincia |
| encuestas.md | Encuestas |
| generales.md | Generales |
| simulador.md | Simulador |
| dhondt.md | D'Hondt |
| comunidad.md, pueblo.md, mapa.md, explora.md | Tu comunidad, Tu pueblo, el mapa, Explora |

Al principio de cada archivo, entre `<!--` y `-->`, está la lista de cifras y condiciones de esa página. Ese bloque
no sale en la web.

## Lo básico

    # Título de la página
    ## Título de sección
    ### Subtítulo

    Un párrafo es texto seguido. Una línea en blanco separa párrafos.
    **negrita**, *cursiva*, [texto del enlace](https://...) o [a otra pestaña](#encuestas).

## Cifras: `{nombre}`

`{ppvox_176}` se sustituye por la cifra del día. Escribe la frase como quieras alrededor, pero deja las llaves y el
nombre tal cual. Si escribes un nombre que no existe, sale resaltado en amarillo con las llaves: así ves el error.
Para escribir unas llaves de verdad, pon `\{`.

## Gráficos y tablas: `[[nombre]]`

Una línea con `[[proj]]` es el sitio de un gráfico o una tabla. Puedes moverla a otra parte de la página o borrarla.
`[[índice]]` es donde va el índice de secciones.

## Secciones del índice

    ## Cuánto fiarse {#fiarse}
    ## Qué dice el modelo <span class="tag-exp">modelo experimental</span> {#diputados | Qué dice el modelo}

Lo que va entre llaves con `#` es el nombre interno de la sección (sirve para el índice y los enlaces); detrás de `|`,
el nombre corto que sale en el índice. Si cambias el `#nombre`, los enlaces que apunten a esa sección dejarán de
funcionar, así que mejor no lo toques.

Una sección que sale en el índice pero no tiene título visible se escribe solo con las llaves:

    ## {#participacion | Participación y voto por correo}

## Estilos de párrafo

Al principio de la línea:

| Marca | Cómo sale |
|---|---|
| `[sub]` | subtítulo gris, bajo un título |
| `[nota]` | letra pequeña |
| `[línea]` | frase destacada |
| `[antetítulo]` | rótulo en mayúsculas sobre el título |

## Bloques

    ::: tarjeta
    (recuadro blanco)
    :::

    ::: metodología #metodo
    (desplegable "Metodología")
    :::

    ::: plegable "Otro título"
    (desplegable con otro título)
    :::

## Condiciones

Algunas partes solo salen si hay datos (por ejemplo, la validación del modelo):

    ::: si validacion
    Este texto sale solo cuando hay validación.
    ::: si no
    Y este cuando no.
    :::

Los nombres de las condiciones de cada página están en su lista del principio.

## Partes

Una línea como `=== detalle ===` empieza otra parte del archivo: un trozo que la página usa por separado (por
ejemplo, la ficha que se rehace al elegir otra provincia).

## Reglas

- Nada de rayas largas (el guion largo, más largo que este: –): el control de calidad no deja publicar. Usa comas, dos puntos o paréntesis.
- Si escribes HTML (una línea que empieza por `<`), pasa tal cual.
- Si la página sale en blanco o rara, lo más probable es un `:::` sin cerrar. Dime en qué archivo estabas.
