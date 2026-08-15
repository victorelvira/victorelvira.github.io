# Fiestas de pueblo de Cantabria 🎉

Mapa interactivo y calendario de las fiestas de pueblo de Cantabria: fechas, tipos
de fiesta, duración y programa por horas.

Web **estática** (HTML + CSS + JavaScript) con mapa [Leaflet](https://leafletjs.com/)
sobre [OpenStreetMap](https://www.openstreetmap.org/). No necesita servidor ni
compilación: basta con abrir `index.html` o servir la carpeta.

## Funcionalidades

- 🗺 Mapa interactivo con marcadores por tipo de fiesta.
- 🔎 Búsqueda por nombre o pueblo + filtro por tipo.
- 📅 Filtro por fecha (día único o rango), siempre desde hoy, con accesos rápidos
  (Hoy · Este finde · Este mes · Todas).
- 📍 La lista se filtra por la zona visible del mapa.
- ⏱ Orden por duración (fiestas más cortas), fecha de inicio o de fin.
- 📱 Diseño responsive con conmutador Lista/Mapa en móvil.

## Estructura

```
index.html        # página principal
css/style.css     # estilos
js/clasicas.js    # fiestas clásicas curadas (invierno/primavera)
js/data.js        # fiestas generadas desde datos públicos
js/app.js         # lógica (mapa, filtros, orden, detalle)
```

## Datos

Los datos combinan una selección curada a mano con hechos (fechas, lugar, programa,
coordenadas) procedentes de fuentes públicas. Las descripciones se sintetizan a
partir de esos datos. Las fechas de fiestas de fecha móvil son aproximadas.

## Desarrollo local

```bash
python3 -m http.server 8777
# abre http://localhost:8777
```

## Licencia

Código bajo licencia MIT. Los datos pertenecen a sus respectivas fuentes públicas.
