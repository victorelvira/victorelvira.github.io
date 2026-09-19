// ES/FR: the page is written in Spanish; in FR mode every text node is translated with this dictionary
// (also the ones app.js/map.js render later, via a MutationObserver). Toggle reloads the page.
const lang = (() => { try { return new URLSearchParams(location.search).get('lang') || localStorage.getItem('jep-lang') || 'es'; } catch { return 'es'; } })();
const FR = [
  ['Mapa y lista', 'Carte et liste'], ['Mapa', 'Carte'], ['y lista', 'et liste'], ['Lista', 'Liste'],
  ['19–20 septiembre', '19–20 septembre'], ['Filtros', 'Filtres'], ['Prioridad · entrada · día · horario', 'Priorité · entrée · jour · horaire'],
  ['Prioridad', 'Priorité'], ['★ Alta', '★ Haute'], ['■ Media', '■ Moyenne'], ['○ Baja', '○ Basse'], ['Alta', 'Haute'], ['Media', 'Moyenne'], ['Baja', 'Basse'],
  ['Entrada', 'Entrée'], ['Todas las entradas', 'Toutes les entrées'], ['Sin reserva / acceso libre', 'Sans réservation / accès libre'],
  ['Actividades JEP completas', 'Activités JEP complètes'], ['Completo / con reserva', 'Complet / réservation'], ['Completo / cancelaciones', 'Complet / annulations'],
  ['Con reserva', 'Sur réservation'], ['Sin reserva', 'Sans réservation'], ['Acceso parcial', 'Accès partiel'], ['Acceso libre', 'Accès libre'],
  ['Entradas en el lugar', 'Billets sur place'], ['Gratuito', 'Gratuit'], ['Participación por verificar', 'Participation à vérifier'], ['Taquilla', 'Billetterie'], ['Inscripciones completas', 'Inscriptions complètes'], ['Completo · sólo invitación', 'Complet · sur invitation'], ['Sin reserva: se entra directamente', 'Sans réservation : entrée directe'], ['Reserva previa obligatoria', 'Réservation obligatoire'], ['Parte libre, ticket in situ o cupo por orden de llegada', 'Accès en partie libre, billet sur place ou dans la limite des places'], ['Mecanismo de acceso todavía no confirmado', 'Mode d’accès pas encore confirmé'], ['Sin confirmar', 'Non confirmé'], ['Mixto', 'Mixte'], ['Ocultar completos', 'Masquer les complets'], ['Sólo fichas con fuente individual o específica (no páginas índice)', 'Seulement les fiches à source individuelle ou spécifique'], ['Sólo fuentes verificadas', 'Sources vérifiées seulement'], ['Vigilar cancelaciones', 'Surveiller les annulations'], ['Disponibilidad no comprobada', 'Disponibilité non vérifiée'], ['Hay plazas', 'Places disponibles'], ['Fuente / programa', 'Source / programme'], ['Reservar', 'Réserver'], ['Fuente: página índice, no verificada individualmente.', 'Source : page index, non vérifiée individuellement.'], ['Completo', 'Complet'], ['Por verificar', 'À vérifier'],
  ['Día', 'Jour'], ['Cualquiera', 'Tous'], ['Sáb. 19', 'Sam. 19'], ['Dom. 20', 'Dim. 20'], ['Ambos', 'Les deux'],
  ['Lugares con visita el sábado y el domingo', 'Lieux ouverts samedi et dimanche'], ['Horario', 'Horaire'], ['Desde', 'De'], ['Hasta', 'À'],
  ['Restablecer filtros', 'Réinitialiser les filtres'], ['Restablecer', 'Réinitialiser'], ['Incluir horarios por confirmar', 'Inclure les horaires à confirmer'],
  ['Visitas que coinciden con tu franja. «Ambos»: los dos días.', 'Visites dans votre créneau. « Les deux » : les deux jours.'],
  ['La hora final debe ser posterior a la inicial.', "L'heure de fin doit suivre l'heure de début."],
  ['Mostrar todos los lugares filtrados', 'Afficher tous les lieux filtrés'], ['Ver todos', 'Voir tout'],
  ['Por prioridad · toda tu selección', 'Par priorité · toute votre sélection'], ['Incluye horarios pendientes', 'Horaires à confirmer inclus'], ['Por prioridad', 'Par priorité'],
  ['PARÍS / 2026', 'PARIS / 2026'], ['Cargando lugares…', 'Chargement des lieux…'], ['Localizando tu selección…', 'Localisation de votre sélection…'],
  ['Horarios según tu dataset. Confirma en la ficha del lugar.', 'Horaires selon vos données. Vérifiez sur la fiche du lieu.'], ['Direcciones: IGN', 'Adresses : IGN'],
  ['Sábado 19', 'Samedi 19'], ['Domingo 20', 'Dimanche 20'], ['Por confirmar', 'À confirmer'], ['Sin visita', 'Pas de visite'],
  ['Durante el día', 'Toute la journée'], ['Según visita', 'Selon visite'], ['cada 30 min', 'toutes les 30 min'],
  ['Información / reservas', 'Infos / réservations'], ['Cómo llegar', 'Itinéraire'], ['Artículo general JEP', 'Article général JEP'], ['Buscar programa', 'Chercher le programme'], ['También en esta dirección', 'Aussi à cette adresse'], ['Ver en el mapa', 'Voir sur la carte'],
  ['Ubicación aproximada en la vía.', 'Emplacement approximatif dans la rue.'], ['Ubicación por precisar · disponible en la lista.', 'Emplacement à préciser · disponible dans la liste.'],
  ['Revisa tu franja horaria', 'Vérifiez votre créneau'], ['No hay lugares con estos filtros', 'Aucun lieu avec ces filtres'],
  ['La hora «Hasta» debe ser igual o posterior a «Desde».', "L'heure « À » doit être égale ou postérieure à « De »."],
  ['Prueba otro día, amplía el horario o incluye horarios por confirmar.', 'Essayez un autre jour, élargissez le créneau ou incluez les horaires à confirmer.'],
  ['No se pudo cargar la selección', 'Impossible de charger la sélection'], ['Comprueba tu conexión y vuelve a cargar la página.', 'Vérifiez votre connexion et rechargez la page.'],
  ['Volver a intentar', 'Réessayer'], ['El fondo del mapa no se ha podido cargar. Puedes usar la lista.', "Le fond de carte n'a pas pu être chargé. Utilisez la liste."],
  ['Mapa no disponible. Puedes usar la lista.', 'Carte indisponible. Utilisez la liste.'], ['Cerrar ficha', 'Fermer la fiche'],
].sort((a, b) => b[0].length - a[0].length);
const RX = [[/(\d+) activos · (\d+) lugares/g, '$1 actifs · $2 lieux'], [/(\d+) de (\d+) · /g, '$1 sur $2 · '],
  [/ en el mapa/g, ' sur la carte'], [/ con ubicación pendiente/g, ' sans emplacement'], [/\blugares\b/g, 'lieux'], [/Desde /g, 'Dès '], [/Hasta /g, "Jusqu'à "]];
const tr = s => { let t = s; for (const [a, b] of FR) if (t.includes(a)) t = t.split(a).join(b); for (const [r, b] of RX) t = t.replace(r, b); return t; };
function walk(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) { const t = tr(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; }
  if (root.querySelectorAll) for (const el of [root, ...root.querySelectorAll('[title],[aria-label]')])
    for (const a of ['title', 'aria-label']) { const v = el.getAttribute?.(a); if (v && tr(v) !== v) el.setAttribute(a, tr(v)); }
}
if (lang === 'fr') {
  document.documentElement.lang = 'fr';
  document.title = 'Paris · Patrimoine 2026';
  walk(document.body);
  new MutationObserver(ms => ms.forEach(m => m.type === 'characterData' ? walk(m.target.parentNode) : m.addedNodes.forEach(n => walk(n.nodeType === 3 ? n.parentNode : n))))
    .observe(document.body, { subtree: true, childList: true, characterData: true });
  document.querySelector('.brand h1').innerHTML = 'Paris <span class="brand-divider">/</span> Patrimoine';
}
const btn = document.getElementById('lang-toggle');
btn.querySelector(`[data-l=${lang === 'fr' ? 'fr' : 'es'}]`).classList.add('on');
btn.addEventListener('click', () => { const next = lang === 'fr' ? 'es' : 'fr'; try { localStorage.setItem('jep-lang', next); } catch {} const u = new URL(location); u.searchParams.set('lang', next); location.href = u; });
