/* musicatlas, Classical Music Atlas.  Static, no build, no libraries.
   House conventions: ../../LLM.md.  Visual language and interaction model follow
   artatlas (../artatlas_project/artatlas/app.js): the same chrome (identity navbar
   brand, a searchable multi-select picker for the corpus, a segmented view switch
   chip facets), a full-height layout where only the content scrolls, and the same
   "ONLY on hover" trick for going from everything to one thing and back.

   What is specific here: a CATALOGUE is a list of works with their numbers, so the
   table is the spine and the default. "By key" and "Arrangements" are instruments
   that sit above that same table and filter it, not rival views. Colour is spent
   on composers, because that is the dimension that will have twenty values; keys
   get an 8px swatch in their own column, where it means something. */
const DATA_V = "0.53.0";
const BUILD_AT = "2026-09-15 23:38";

let WORKS = [], EDGES = [], COMPOSERS = [], BYID = new Map();
/* LAS PERSONAS. `PEOPLE` son 365 nombres (los 31 compositores del atlas y todo el que
   aparece en el camino entre dos de ellos); `PLINKS` las relaciones que constan.
   `ADJ` es solo la parte de la que se sigue que se trataron, que es la única con la que
   se pueden contar pasos entre dos personas. Ver harvest_people.py. */
let PEOPLE = {}, PLINKS = [], ADJ = new Map();

/* ---------- idioma ----------
   El atlas está escrito en INGLÉS y se traduce en tiempo de ejecución, con la propia
   cadena inglesa como clave: lo que el diccionario no cubra se queda en inglés en vez de
   salir en blanco. Copiado de artatlas/app.js, que lleva tres idiomas con esta forma.

   Hoy el diccionario está VACÍO a propósito: `t()` devuelve su argumento y no cambia nada.
   Está aquí porque el coste de ponerlo mientras se toca este código es cero y el de
   ponerlo después es volver a pasar por las 176 cadenas. El día que haya un `es`, es
   rellenar un fichero.

   Y ojo con lo que NO es interfaz: las formas ("symphony and overture"), las plantillas
   ("solo keyboard") y los 560 nombres de instrumento son DATOS, y traducirlos es otro
   trabajo, del tamaño del `museum_i18n.json` de artatlas. `t()` no los toca. 2026-09-15. */
let DICT = null;
const t = s => (DICT && DICT[s]) || s;
function buildAcquaintance(){
  ADJ=new Map();
  const add=(x,y)=>{ if(!ADJ.has(x)) ADJ.set(x,new Set()); ADJ.get(x).add(y); };
  PLINKS.forEach(l=>{ if(!l.met||l.impossible) return; add(l.a,l.b); add(l.b,l.a); });
}
/* El camino más corto de trato documentado entre dos personas, con los nombres de por
   medio. Es lo que hace útil el grafo: entre nuestros 31 compositores solo hay 8
   aristas directas, pero 83 parejas se alcanzan pasando por terceros. */
function acqPath(from,to){
  if(from===to||!ADJ.has(from)) return null;
  const prev=new Map([[from,null]]); let q=[from];
  while(q.length){
    const x=q.shift();
    if(x===to){ const out=[]; let c=x; while(c){ out.unshift(c); c=prev.get(c); } return out; }
    for(const y of (ADJ.get(x)||[])) if(!prev.has(y)){ prev.set(y,x); q.push(y); }
  }
  return null;
}
const state = { lens:"table", sub:"works", sel:null, f:{}, comp:new Set(), q:"",
                /* OPENS ON THE MOST-RECORDED WORK, not on whoever sorts first by
                   surname. The catalogue used to open on Bruckner, which told a reader
                   arriving for the first time that Bruckner is where classical music
                   starts. There is no popularity figure in any source here, so the
                   nearest true one is used: how many recordings exist. See `pop`. */
                sort:"rec", dir:1, open:new Set(), limit:300, parts:false, doubt:false,
                grouping:"period", tlMode:"composer", tlZoom:1, year:null, qw:[],
                /* quién está abierto en el panel: una obra (`sel`) o una persona
                   (`person`). Nunca los dos: el panel es uno. */
                person:null,
                /* qué eje de filtros está abierto; los siete nombres se ven siempre */
                axis:"form_group" };

/* ---------- reading a field ---------- */
/* THE INDEX IS COMPACT. core.json holds one short row per work, because the full
   records were 19.5 MB and a browser must parse all of it before drawing a row. The
   claims, media and tree live in musicatlas/w/<composer>.json and are fetched the first
   time a record from that composer is opened. These accessors read the row; DETAIL,
   when it has been loaded, is what the record card reads. */
const DETAIL = new Map();          // work id -> full record
const LOADED = new Set();          // composer slugs whose detail file is in
const AG = {u:"unanimous", p:"complementary", m:"majority", c:"conflict",
            r:"resolved", s:"single", d:"derived"};
const FIELD_KEY = {catalogue:"ca", key:"ke", instrumentation:"in",
                   date_composed:"da", form:"fo"};
const IDX = {form:"fo", key:"k", catalogue:"cat", instrumentation:"sc",
             date_composed:"dt"};

/* The index rows are short to keep the file small; everything downstream expects the
   long names. Hydrating once on load costs a little memory and saves rewriting forty
   call sites, and memory was never the problem: the 19.5 MB download was. */
function hydrate(r, byslug){
  const c = byslug[r.c] || {};
  r.id = r.i; r.title = r.t; r.composer_slug = r.c; r.composer = c.name || r.c;
  /* A work can have more than one composer: a pasticcio (The Enchanted Island, by
     Vivaldi and Handel and Purcell) or a disputed attribution (BWV 223, claimed for
     Bach and for Handel). The index folds those into one row and keeps every composer
     in cc, so the work is one line and is still findable under each of them. */
  r.composer_slugs = r.cc || [r.c];
  r.composers = r.composer_slugs.map(s2 => (byslug[s2]||{}).name || s2);
  r.form_group = r.fg; r.forces = r.fc; r.completeness = r.cm;
  r.nsources = r.n || 0;
  r.sources = new Array(r.n || 0);
  if(r.ve) r.versions = true;
  if(r.au) r.audio = r.au;
  if(r.ms) r.media = {scores: r.ms};
  r.tree = {children: r.ch || undefined, parent: r.p || undefined};
  r.ids = {imslp: r.im, mbid: r.mb, qid: /^Q\d+$/.test(r.i) ? r.i : undefined};
  if(r.x) r.kind = r.x;
  return r;
}

async function loadDetail(slug){
  if(LOADED.has(slug)) return;
  LOADED.add(slug);
  try{
    const d = await fetch(`w/${slug}.json?v=${DATA_V}`).then(r=>r.json());
    Object.entries(d).forEach(([id,rec])=>DETAIL.set(id,rec));
  }catch(e){ LOADED.delete(slug); }
}

const F = (w,n) => {
  const full = DETAIL.get(w.i);
  if(full) return (full.fields||{})[n] || null;
  // from the index alone we can still answer with the value and how well it agrees
  const k = IDX[n], v = k ? w[k] : null;
  if(v == null) return null;
  const code = (w.ag||{})[FIELD_KEY[n]];
  return {v, d:v, a: AG[code] || "single", n:1, s:null, _thin:true,
          doubt: code === "c",
          // the index carries the "outside the composer's life" flag as `ds`, and
          // losing it here put Buxtehude, who died in 1707, on the timeline in 1950
          suspect: (n === "date_composed" && w.ds) ? true : undefined};
};
const val  = (w,n) => { const f=F(w,n); return f ? f.v : null; };
const show = (w,n) => { const f=F(w,n); return f ? (f.d!=null?f.d:f.v) : null; };
const arr  = v => v==null ? [] : Array.isArray(v) ? v : [v];
const isWork = w => !w.x;
/* House style: no long dashes anywhere Víctor reads (../../LLM.md §4 bis). A source
   title may contain one, and rewriting the source would break the rule that we never
   alter what a source said, so it is replaced at DISPLAY time only. The raw string in
   the claim, and in the tooltip, stays exactly as the source wrote it. */
const nodash = s => String(s).replace(/\s*\u2014\s*/g, ", ").replace(/\s+\u2013\s+/g, ", ");
const esc = s => nodash(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const inDoubt = w => !!w.db;
/* 32 works have no label in any language Wikidata holds. Showing the raw id as if
   it were a name is a lie about the data; hiding them is a lie about the corpus.
   They read as "untitled" with their id beside it, and there is a filter for them. */
const isUntitled = w => /^Q\d+$/.test(w.t);
const titleOf = w => isUntitled(w)
  ? `<span style="color:var(--faint);font-style:italic">untitled</span> <span style="font:11px system-ui;color:var(--faint)">${esc(w.title)}</span>`
  : esc(w.title);
const fold = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();

/* ---------- composers: colour, period ---------- */
const PALETTE = ["#7a4a2b","#2e6b6b","#7b3fb0","#b0503b","#3f6fb0","#6f8f3a","#a8842c","#9c3f6e",
  "#3a7a55","#8a5a2a","#5f5fa8","#a05a3a","#4a7fa8","#8a3a3a","#5a8a4a","#7a5a8a",
  "#b07a2a","#3a6a8a","#8a7a3a","#6a3a5a","#4a8a7a","#a86a5a","#5a6a3a","#7a3a2a"];
const compColour = slug => PALETTE[(COMPOSERS.findIndex(c=>c.slug===slug)+PALETTE.length)%PALETTE.length];
function periodOf(c){ return period(c); }
function period(c){
  const b = c.born || 0;
  return b < 1730 ? "Baroque and earlier" : b < 1800 ? "Classical"
       : b < 1890 ? "Romantic" : "Modern";
}
const PERIOD_ORDER = ["Baroque and earlier","Classical","Romantic","Modern"];

/* ---------- keys ---------- */
const FIFTHS=["C","G","D","A","E","B","F#","Db","Ab","Eb","Bb","F"];
const ENHARM={Gb:"F#","C#":"Db","D#":"Eb","A#":"Bb","G#":"Ab",Cb:"B",Fb:"E","E#":"F","B#":"C"};
function keyParts(k){ if(!k||k==="various") return null;
  const m=String(k).match(/^([A-G][b#]?)\s+(major|minor)$/);
  return m?{tonic:ENHARM[m[1]]||m[1],mode:m[2]}:null; }
function keyColour(k){ const p=keyParts(k); if(!p) return "#e8e2d8";
  const h=(FIFTHS.indexOf(p.tonic)*30+18+360)%360;
  return p.mode==="major"?`hsl(${h} 46% 74%)`:`hsl(${h} 40% 52%)`; }

/* ---------- catalogue numbers, written as a musician writes them ---------- */
const CATNAME={opus:"Op.",brown:"B.",chominski:"C.",kobylanska:"KK",wn:"WN",bwv:"BWV",
  kochel:"K.",deutsch:"D.",hoboken:"Hob.",ryom:"RV",hwv:"HWV",th:"TH",cw:"ČW",searle:"S.",
  woo:"WoO",twv:"TWV",ama:"AMA",buxwv:"BuxWV",wab:"WAB",lesure:"L.",mwv:"MWV",
  burghauser:"B.",kirkpatrick:"K.",longo:"L.",fanna:"F.",rinaldi:"R.",pincherle:"P.",
  pestelli:"P.",fadini:"F."};
/* Scarlatti alone is numbered five ways (Kirkpatrick, Longo, Pestelli, Fadini and
   more) and Vivaldi four. Which one leads is the one scholars cite; the rest stay
   visible underneath, because a reader who knows a piece by its Longo number should
   still find it. */
/* A composer's OWN catalogue comes first, BWV for Bach, K. for Mozart, and the
   opus only when there is nothing better. Bach's partitas really were published as
   his Op. 1, but nobody looks them up that way. */
const PRIMARY=["bwv","kochel","deutsch","hoboken","ryom","hwv","twv","buxwv","wab",
  "kirkpatrick","lesure","searle","mwv","burghauser","th","cw","opus","brown","longo"];
const cats = w => arr(val(w,"catalogue")).map(s=>{
  const i=String(s).indexOf(":");
  const k=String(s).slice(0,i), rest=String(s).slice(i+1);
  const [n,ed]=String(rest||"").split("#");
  /* The group separator is stored as ":" so one work has one key whatever a source
     wrote, but the catalogues do not agree on how to print it: Hoboken is "Hob. I:41",
     Kobylańska is "KK IVb/10", Fanna is "F. XII n. 37". Printed the way musicians
     write it, keyed the way a join needs it. */
  const SEP={kobylanska:"/",fanna:" n. "};
  const shown=SEP[k]&&String(n).includes(":")?String(n).replace(":",SEP[k]):n;
  return {k,n,ed,label:(CATNAME[k]||k)+" "+shown+(ed?` (${ed}${["st","nd","rd"][ed-1]||"th"} ed.)`:"")};});
/* One source names the edition and another does not, so "K. 185" and "K. 185 (1st ed.)"
   were printed side by side. They are the same citation, and the qualified one says
   more, so the bare one is dropped from the display. Both claims stay in the data with
   their sources: this collapses what is shown, never what is held. */
function catsShown(w){
  const c=cats(w), qualified=new Set(c.filter(x=>x.ed).map(x=>x.k+":"+x.n));
  return c.filter(x=>x.ed || !qualified.has(x.k+":"+x.n));
}
function primaryCat(w){ const c=cats(w); if(!c.length) return null;
  for(const p of PRIMARY){ const h=c.find(x=>x.k===p); if(h) return h; } return c[0]; }
function catSort(w){ const p=primaryCat(w); if(!p) return [9e9,0];
  const rank=PRIMARY.indexOf(p.k), m=String(p.n).match(/(\d+)(?:\D+(\d+))?/);
  return [(rank<0?50:rank)*1e6+(m?+m[1]:9e5), m&&m[2]?+m[2]:0]; }

/* ---------- other cells ---------- */
function seconds(w){
  // the index carries one duration string, whichever the build preferred
  if(w.du && !DETAIL.get(w.i)){
    const a=String(w.du).match(/(\d+)s/); if(a) return +a[1];
    const b=String(w.du).match(/([\d.]+)\s*(min|hour|second)/i);
    if(b) return +b[1]*(/hour/i.test(b[2])?3600:/min/i.test(b[2])?60:1);
  }
  const m=F(w,"duration_measured"), e=F(w,"duration_estimated");
  if(m){const s=String(m.v).match(/(\d+)s/); if(s) return +s[1];}
  if(e){const s=String(e.v).match(/([\d.]+)\s*(min|hour|second)/i);
        if(s) return +s[1]*(/hour/i.test(s[2])?3600:/min/i.test(s[2])?60:1);}
  return null; }
const fmtDur=s=>s==null?"":s>=3600?`${Math.floor(s/3600)}h${Math.round(s%3600/60)}`
  :s>=600?`${Math.round(s/60)} min`:`${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,"0")}`;
/* Wikidata stores a year as a full timestamp, "1830-01-01T00:00:00Z", and almost
   always with a January 1st that means "we only know the year". Keeping the raw
   string is right (the tooltip still shows exactly what the source said); printing
   it in a table is not. IMSLP's own free text ("1838-39", "1829 (October 20-28)")
   is left exactly as written, it says more than a date could. */
function fmtDate(v){
  if(!v) return "";
  const s=String(v);
  const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if(!iso) return s;
  const [,y,m,d]=iso;
  if(m==="01"&&d==="01") return y;
  return `${y}-${m}`;
}
function year(w){ const f=F(w,"date_composed"); if(!f||f.suspect) return null;
  const d=show(w,"date_composed"); if(!d) return null;
  const m=String(d).match(/\b(1[0-9]{3}|20[0-9]{2})\b/); return m?+m[1]:null; }
/* Name what is there. "large ensemble" was the old answer above four instruments and it
   tells a reader nothing; three names and a count tell them what kind of piece it is,
   and the column truncates anyway. 623 works, 5 % of those with a scoring. */
function ensemble(w){ const i=arr(val(w,"instrumentation")); if(!i.length) return null;
  const a=[...i].sort();
  return a.length>4 ? a.slice(0,3).join(" + ")+" +"+(a.length-3) : a.join(" + "); }
/* `al` son las palabras que las OTRAS fuentes usan para la misma obra y el título principal
   no tiene: "moonlight", "jupiter", "appassionata". Vienen ya en el índice, porque
   `title_variants` vive en el fichero de detalle del compositor y ese solo se carga al
   abrir una ficha: el buscador estaba mirando un campo que casi siempre estaba vacío, y
   "moonlight" devolvía cero teniendo la sonata. 2026-09-15. */
function haystack(w){ return w._h || (w._h = fold([w.title,w.composers.join(" "),
  w.al || "",
  ...Object.values(w.title_variants||{}), cats(w).map(c=>c.label).join(" "),
  show(w,"key"), show(w,"dedication"), arr(val(w,"instrumentation")).join(" "),
  show(w,"genre")].filter(Boolean).join(" ⋅ "))); }

/* ---------- facets ---------- */
/* CATEGORY AXES. Three that answer three different questions, plus the odd flags.
   The raw values were useless as filters: 59 forms of which 14 covered 51 works
   between them, and 331 distinct instrument combinations. So the rail shows the
   GROUP, and picking a group opens a second rail with the specific forms inside it.
   Progressive, rather than a wall of chips nobody reads. */
const FORCES_ORDER=["solo keyboard","solo instrument","duo","trio","quartet","quintet",
  "sextet","ensemble","orchestra","soloist and orchestra","voice and keyboard",
  "voice and instruments","voice alone","voice and orchestra","chorus","chorus and orchestra"];
const DURATION_BANDS=[["under 3 min",0,180],["3 to 10 min",180,600],
                      ["10 to 30 min",600,1800],["over 30 min",1800,1e9]];
const PERIOD_OF = w => { const c=COMPOSERS.find(x=>x.slug===w.composer_slug);
  return c ? [period(c)] : []; };
/* THE CHIPS PARTITIONED AND THE GAP WAS STILL INVISIBLE.
   Every rail counted correctly: Kind's eleven values plus the works with no Kind come to
   exactly 15 083. But a facet whose `get` returns [] produces no chip, so the 2 698 works
   with no Kind at all (18 %), the 3 274 with no Forces (22 %) and the 6 158 with no key
   (41 %) were unreachable and, worse, unmentioned. A reader counting the chips concluded
   the catalogue was smaller than it is and could not ask why.

   This is artatlas's lesson arriving by a gentler road (`artatlas/NEXT.md`: *"a default
   that hides a gap is worse than a gap"*). There the gap was filled with a wrong default,
   `kind || "museum"`, and three of four chips lied. Here nothing lies, the absence simply
   had no name. So it gets one, and it is selectable like any other value, because "show me
   what we do not know about" is a real question in a catalogue that publishes its gaps.
   `gap:` is opt-in: "Also" is a list of flags, and a work with no flags is not a work
   whose flags are unknown. 2026-09-14. */
const NOT_STATED = "\u2205 not stated";
const FACETS=[
  {id:"form_group",label:"Kind",get:w=>w.form_group?[w.form_group]:[],gap:true},
  {id:"forces",label:"Forces",get:w=>w.forces?[w.forces]:[],order:()=>FORCES_ORDER,gap:true},
  {id:"period",label:"Period",get:PERIOD_OF,order:()=>PERIOD_ORDER,gap:true},
  /* Where the composer's own catalogue puts it. Not our derivation and not Wikipedia's
     invention: for Handel every one of these falls in a contiguous HWV range, so the
     grouping is Baselt's. Only composers whose list article actually partitions them
     have it, which is why the chip count is smaller than the corpus. */
  /* CAPPED, because this axis is one composer's catalogue and the rail was showing
     everybody's at once: 107 chips, 16 031 px of a 23 100 px rail, so reaching Length or
     Mode meant scrolling past every Handel subsection down to the ones holding a single
     work. Worse than long, it was a category error, Handel's "Odes and masques" standing
     beside Haydn's "Trios for baryton" as though they were one taxonomy. Picking a
     composer narrows the pool and the rail becomes that composer's own ordering, which is
     what the field means, so the cap says so rather than silently truncating. */
  /* No cap once a single composer is chosen: the rail is then that composer's own
     catalogue and showing all of it is the point of the axis. The widest is Brahms at 30.
     The note has to know this too, or it goes on telling a reader who has already picked
     Handel to pick a composer. */
  {id:"section",label:"As catalogued",get:w=>w.ls?[w.ls]:[],gap:true,
   limit:()=>state.comp.size===1?0:10,
   over:n=>`${n} more, pick a composer to see theirs`},
  /* Not shown as a chip rail: 100 places against 15 083 works would be a wall of ones.
     It exists so the map can set it and the chip above the table can drop it. */
  {id:"place",label:"First heard at",get:w=>w.pp?[w.pp]:[],hidden:true,
   name:q=>(PLACES[q]||{}).label||q},
  {id:"length",label:"Length",get:w=>{const s=seconds(w); if(s==null) return [];
    const b=DURATION_BANDS.find(([,lo,hi])=>s>=lo&&s<hi); return b?[b[0]]:[]},
    order:()=>DURATION_BANDS.map(b=>b[0]),gap:true},
  {id:"mode",label:"Mode",get:w=>{const k=val(w,"key"); if(!k) return [];
    if(k==="various") return ["several keys"]; const p=keyParts(k); return p?[p.mode]:[]},gap:true},
  {id:"flag",label:"Also",get:w=>{const o=[];
    if(w.audio) o.push("plays here");
    if(w.ar) o.push("on the Internet Archive");
    if((w.media||{}).scores) o.push("free score");
    if((w.media||{}).free_recordings) o.push("recording on IMSLP");
    /* two different facts, and they were being conflated: how many catalogues hold an
       entry, and how many facts two sources actually agreed on */
    if((w.sources||[]).length>=3) o.push("in three catalogues");
    if(w.xc) o.push("a fact confirmed twice");
    if(w.completeness==="lost") o.push("lost");
    if(w.versions) o.push("more than one version");
    if(isUntitled(w)) o.push("no title anywhere");
    if(w.nk) o.push("a name and nothing else");
    if((F(w,"date_composed")||{}).suspect) o.push("date outside the composer's life");
    return o}}
];
/* the second rail: the specific forms inside whichever kind is chosen */
const SUBFACET={id:"form",label:"which",get:w=>arr(val(w,"form"))};
function passes(w){
  if(state.comp.size && !w.composer_slugs.some(s2 => state.comp.has(s2))) return false;
  /* Every word, in any order. Matching the whole string literally meant "requiem
     mozart" looked for those two words adjacent and in that order, so it found
     nothing: the space was part of the needle instead of separating two of them. */
  if(state.qw.length && !state.qw.every(t => haystack(w).includes(t))) return false;
  if(state.doubt && !inDoubt(w)) return false;
  if(state.year!=null && year(w)!==state.year) return false;
  if(state.f.key && state.f.key.size){ const p=keyParts(val(w,"key"));
    if(!p || !state.f.key.has(p.tonic+" "+p.mode)) return false; }
  return [...FACETS, SUBFACET].every(f=>{const want=state.f[f.id];
    if(!want||!want.size) return true;
    const vs=f.get(w);
    /* the absence is a value you can select: a work with nothing on this axis matches
       "not stated" and nothing else */
    if(!vs.length) return want.has(NOT_STATED);
    return vs.some(v=>want.has(v));});
}
const visible = () => WORKS.filter(w => isWork(w) && passes(w));

/* ---------- concordance mark ---------- */
const SRC_URL={ wikidata:w=>w.ids.qid&&`https://www.wikidata.org/wiki/${w.ids.qid}`,
  imslp:w=>w.ids.imslp&&`https://imslp.org/wiki/${encodeURIComponent(w.ids.imslp.replace(/ /g,"_"))}`,
  musicbrainz:w=>w.ids.mbid&&`https://musicbrainz.org/work/${w.ids.mbid}` };
const AGREE={unanimous:n=>`${n} sources agree`,
  complementary:n=>`${n} sources, each adding something, none contradicting`,
  majority:n=>`${n} of them agree, the rest do not`,
  conflict:()=>"the sources disagree, both readings are shown",
  resolved:()=>"settled by hand", single:()=>"only one source has this",
  derived:()=>"worked out by us, not stated by any source"};
const mark=(w,n)=>{const f=F(w,n);
  return f?`<span class="cc ${f.suspect?"conflict":f.doubt?"conflict":f.a}" data-w="${esc(w.id)}" data-f="${n}"></span>`:"";};
/* LO QUE SE HA AGRUPADO, DICHO EN LA FICHA Y DESPLEGABLE.
   Dos fuentes pueden escribir la misma cosa con nombres distintos ("piano 4-hand" y
   "piano four hand"), o nombrar un papel y quién lo toca ("continuo (harpsichord)").
   Publicamos uno solo, y eso hay que contarlo: el desplegable dice qué se fusionó con
   qué y por qué, con las palabras de la fuente a la izquierda. Víctor, 2026-09-15. */
function mergedHTML(w,name){ const f=F(w,name); const m=f&&f.merged;
  if(!m||!m.length) return "";
  return `<details class="merged"><summary>${m.length} `
    + `${t(m.length>1?"names grouped in this field":"name grouped in this field")}</summary><ul>`
    + m.map(x=>`<li><span class="mfrom">${esc(x.from)}</span> → <span class="mto">${esc(x.to)}</span>`
        + `<span class="mwhy">${esc(t(x.why))}</span></li>`).join("")
    + `</ul></details>`; }
function tipHTML(w,name){ const f=F(w,name); if(!f) return "";
  const lines=Object.entries(f.s||{}).map(([s,raw])=>`<b>${s}</b>: ${esc(String(raw).slice(0,130))}`
    +(f.rejected&&f.rejected[s]?", rejected":""));
  return `${esc((AGREE[f.doubt?"conflict":f.a]||(()=>f.a))(f.n))}<br>${lines.join("<br>")}`
    +(f.suspect?`<span class="why">⚠ ${esc(f.suspect)}</span>`:"")
    +(f.why?`<span class="why">${esc(f.why)}</span>`:""); }
function srcDots(w){
  const codes=Object.values(w.ag||{});
  const worst = w.db ? "conflict" : codes.includes("r") ? "resolved"
    : codes.includes("u") ? "unanimous" : codes.includes("p") ? "complementary" : "single";
  const n=w.nsources||0;
  return `<span class="ccrow" title="${n} source${n===1?"":"s"}">`+
    Array.from({length:n},(_,i)=>`<span class="cc ${i===0?worst:"single"}" style="cursor:default"></span>`).join("")+`</span>`;
}

/* One delegated listener: the table is re-rendered constantly, so binding per grip
   would leak handlers on every draw. */
document.addEventListener("mousedown", e=>{
  const g=e.target.closest && e.target.closest("[data-grip]");
  if(g) startResize(e, g.dataset.grip);
}, true);
/* A way back. Double-click a grip and that column returns to the width the stylesheet
   gives it; with the alt key, every column does. Without this the only way out of a
   width you regret is clearing site data. */
document.addEventListener("dblclick", e=>{
  const g=e.target.closest && e.target.closest("[data-grip]");
  if(!g) return;
  e.preventDefault(); e.stopPropagation();
  if(e.altKey) Object.keys(COLW).forEach(k=>delete COLW[k]);
  else delete COLW[g.dataset.grip];
  saveColW(); renderStage();
}, true);

/* ---------- the composer picker ----------
   NO FLOTA. Era un popover que caía encima de la tabla, y Víctor, 2026-09-15: "no me
   gusta que flote, en general... side by side mejor". Tenía razón y el motivo es el
   mismo que el de la ficha: elegir compositores es una tarea que se hace MIRANDO la
   tabla, marcas uno y ves cuánto encoge el catálogo. Un panel que tapa justo eso te
   obliga a cerrarlo para ver el efecto de lo que acabas de hacer, abrirlo otra vez para
   la siguiente, y así treinta y una veces.
   Ahora es una columna más de #main, a la izquierda del catálogo y a la misma altura,
   y por eso tampoco se cierra al pulsar fuera: pulsar fuera es lo que vas a hacer todo
   el rato. Se cierra con su ×, con el botón o con Escape. */
function renderPicker(){
  const box=document.getElementById("picker");
  if(!box.dataset.built){
    box.innerHTML=`<button id="comp-btn" type="button" aria-expanded="false"></button>`;
    const pop=document.createElement("aside");
    pop.id="comp-pop"; pop.hidden=true;
    pop.innerHTML=`<div class="pop-top"><b>Composers</b>
        <button class="pop-x" data-act="close" aria-label="Close">×</button></div>
      <input id="comp-search" class="pop-search" placeholder="Search composers…" autocomplete="off">
      <div class="pop-actions"><button data-act="all">All</button><button data-act="none">None</button></div>
      <ul id="comp-list" class="pop-list"></ul>`;
    document.getElementById("main").prepend(pop);
    box.dataset.built="1";
    const btn=box.querySelector("#comp-btn"),
          s=pop.querySelector("#comp-search");
    const show=open=>{ pop.hidden=!open;
      document.body.classList.toggle("comp-open",open);
      btn.setAttribute("aria-expanded",String(open));
      if(open){ s.value=""; listComposers(); s.focus(); } };
    btn.addEventListener("click",()=>show(pop.hidden));
    document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!pop.hidden) show(false); });
    s.addEventListener("input",listComposers);
    pop.addEventListener("click",e=>{
      const act=e.target.closest("[data-act]");
      /* `close` va antes que nada: comparte atributo con `all`/`none` y el ternario de
         abajo lo habría leído como "ninguno", vaciando el catálogo al cerrar. */
      if(act && act.dataset.act==="close") return show(false);
      if(act){ state.comp = act.dataset.act==="all" ? new Set() : new Set(["∅"]);
        listComposers(); return draw(); }
      const only=e.target.closest("[data-only]");
      if(only){ state.comp=new Set([only.dataset.only]); listComposers(); return draw(); }
      const gonly=e.target.closest("[data-gonly]");
      if(gonly){ state.comp=new Set(COMPOSERS.filter(c=>period(c)===gonly.dataset.gonly).map(c=>c.slug));
        listComposers(); return draw(); }
      const cb=e.target.closest("input[data-slug]");
      if(cb){ const sl=cb.dataset.slug;
        const cur = state.comp.size&&!state.comp.has("∅") ? new Set(state.comp)
                  : state.comp.has("∅") ? new Set() : new Set(COMPOSERS.map(c=>c.slug));
        cb.checked?cur.add(sl):cur.delete(sl);
        state.comp = cur.size===COMPOSERS.length ? new Set() : cur.size ? cur : new Set(["∅"]);
        listComposers(); return draw(); }
    });
  }
  const n = state.comp.size===0 ? COMPOSERS.length : state.comp.has("∅") ? 0 : state.comp.size;
  const label = n===COMPOSERS.length ? `All ${COMPOSERS.length} composers`
    : n===0 ? "No composer" : n===1
      ? (COMPOSERS.find(c=>state.comp.has(c.slug))||{}).name
      : `${n} composers`;
  box.querySelector("#comp-btn").innerHTML = `♪ ${esc(label)} ▾`;
}
const chosen = slug => state.comp.size===0 ? true : state.comp.has(slug);
function listComposers(){
  const q=fold(document.getElementById("comp-search").value);
  const ul=document.getElementById("comp-list");
  const groups=new Map();
  COMPOSERS.filter(c=>!q||fold(c.name).includes(q)).forEach(c=>{
    const g=period(c); if(!groups.has(g)) groups.set(g,[]); groups.get(g).push(c); });
  const order=[...groups.keys()].sort((a,b)=>PERIOD_ORDER.indexOf(a)-PERIOD_ORDER.indexOf(b));
  ul.innerHTML = order.length ? order.map(g=>
    `<li class="pop-h">${esc(g)}<button class="grp-only" data-gonly="${esc(g)}">only</button></li>`+
    groups.get(g).sort((a,b)=>(a.born||0)-(b.born||0)).map(c=>
      `<li class="prow"><label><input type="checkbox" data-slug="${c.slug}" ${chosen(c.slug)?"checked":""}>
         <span class="sw" style="background:${compColour(c.slug)}"></span>
         <span class="pwho"><span class="pname" title="${esc(c.name)}">${esc(c.name)}</span>
           <span class="pyr">${c.born||""}–${String(c.died||"").slice(2)} · ${c.n_works||0} works</span></span></label>
       <button class="only" data-only="${c.slug}">only</button></li>`).join("")
  ).join("") : `<li class="pop-empty">No composer matches.</li>`;
}

/* ---------- the table ---------- */
const COLS=[
  {id:"comp",label:"Composer",cls:"c-comp"},
  {id:"work",label:"Catalogue",cls:"c-cat"},
  {id:"title",label:"Work",cls:"c-title"},
  {id:"key",label:"Key",cls:"c-key"},
  {id:"scoring",label:"Scoring",cls:"c-scoring"},
  {id:"date",label:"Composed",cls:"c-num"},
  {id:"dur",label:"Duration",cls:"c-num"},
  /* Two columns, not one. They were a single "Score · audio" cell holding a play
     button with no number on it, a count of score files and a count of off-site
     recordings, so the one thing it did not say was HOW MUCH AUDIO a work has. */
  {id:"score",label:"Scores",cls:"c-media"},
  {id:"audio",label:"Audio",cls:"c-media"},
  /* How many recordings of this work EXIST, which is not the same as how many we can
     offer you. It is MusicBrainz's own total, and it is the nearest thing this project
     has to a popularity measure, so it is shown rather than only sorted on: an order
     you cannot see the reason for is a magic trick. */
  {id:"rec",label:"Recorded",cls:"c-num c-rec"},
  {id:"src",label:"Sources",cls:"c-src"}
];
/* "Sort by catalogue" across several composers has to mean composer THEN number
   or Bach's Op. 1 lands between Chopin's and Mozart's. A catalogue belongs to one
   composer; it is not a shared axis. */
/* Which columns exist RIGHT NOW. Hiding a cell with display:none does not hide its
   column: it removes the cell, and every cell after it slides one column to the
   left, so with four cells hidden "Score · audio" and "Sources" landed on the
   zero-width columns meant for Key and Scoring and printed on top of each other.
   The cells, the headers and the <col> widths are all generated from this one list,
   so they cannot disagree. */
/* LAS COLUMNAS SE QUITAN POR FALTA DE SITIO, NO POR ABRIR UNA FICHA.
   Antes, abrir el panel quitaba CINCO columnas (tonalidad, plantilla, fecha, duración y
   grabaciones) mirara lo ancha que fuera la pantalla. En un monitor de PC sobra espacio
   para la tabla entera **y** el panel al lado, y aun así la tabla salía mutilada: el lector
   pulsaba una obra para saber más y perdía la mitad de lo que estaba viendo.

   Ahora se mide el hueco que de verdad queda y solo se quita lo que no cabe, y en orden:
   primero lo más prescindible. En una pantalla ancha no se quita nada. Víctor, 2026-09-15. */
const COL_W = {comp:104, cat:118, work:220, key:104, scoring:190, date:132, dur:74,
               score:62, audio:74, rec:78, src:60};
/* el orden en que se van cayendo cuando falta sitio, de lo que menos se echa en falta a
   lo que más. `work` y `comp` no están: sin ellas la fila no dice qué obra es. */
const COL_DROP = ["rec", "dur", "date", "scoring", "key", "src", "cat"];

/* NO SE QUITA NINGUNA COLUMNA. NUNCA.
   Hubo dos versiones peores antes de esta. La primera quitaba cinco columnas en cuanto se
   abría la ficha, mirara lo ancha que fuera la pantalla. La segunda las quitaba solo cuando
   no cabían, lo cual es mejor pero sigue siendo lo mismo: **el lector abre una obra para
   saber MÁS y pierde información de la tabla**, que es exactamente al revés de lo que ha
   pedido.

   Ahora la tabla mantiene sus once columnas y, cuando el hueco no da, **se desplaza a lo
   ancho**, que es lo que hace cualquier tabla y no le esconde nada a nadie. Víctor,
   2026-09-15. */
function liveCols(){ return COLS; }
/* THE LAST WORD OF A NAME IS NOT ALWAYS THE SURNAME. "Johann Strauss II" ends in a
   regnal numeral, so taking the last token filed the Blue Danube under "II" and printed
   the composer column as "ll". The numeral is part of how the name is written and is
   kept in the tooltip and the card; it is only skipped when asking WHICH WORD IS THE
   NAME. One function, used by the sort and by the cell, so the two cannot disagree. */
const SUFFIX = /^(?:[ivx]+|jr\.?|sr\.?|the|elder|younger|fils|p[eè]re)$/i;
function lastName(name){
  const parts = String(name||"").split(/\s+/).filter(Boolean);
  while(parts.length > 1 && SUFFIX.test(parts[parts.length-1])) parts.pop();
  return parts[parts.length-1] || "";
}
/* BY SURNAME. Sorting people by their given name put "Anton Bruckner" at the head of
   the whole catalogue, which is how Víctor found this: the first thing anybody saw was
   a composer nobody had asked for, because A comes first. */
const surname = w => fold(lastName(w.composer));

/* ---------- column widths the reader sets ---------- */
const COLW = (() => { try { return JSON.parse(localStorage.getItem("musicatlas.colw")||"{}"); }
                      catch(e){ return {}; } })();
function saveColW(){ try { localStorage.setItem("musicatlas.colw", JSON.stringify(COLW)); }
                     catch(e){}
}
/* Dragging a grip resizes one column live. The grip sits inside the <th>, so its
   mousedown has to stop there or the click would also sort the table, which is the one
   thing a person resizing a column is certainly not asking for. */
function startResize(ev, id){
  ev.preventDefault(); ev.stopPropagation();
  const table=document.querySelector("table.cat"); if(!table) return;
  const i=liveCols().findIndex(c=>c.id===id); if(i<0) return;
  const allCols=table.querySelectorAll("col");
  const col=allCols[i]; if(!col) return;
  /* FREEZE THE OTHERS FIRST. The table lays out fixed at 100 % width, so widening one
     column was taken out of its neighbours: pulling "Work" wider squeezed Scores and
     Audio from 77px to 17 and clipped them. Every column's current width is written
     down before the drag starts, so the one being pulled is the only one that moves and
     the table grows past the pane instead, where it can scroll. */
  const live=liveCols();
  live.forEach((c,j)=>{ const el=allCols[j]; if(!el) return;
    const w=Math.round(el.getBoundingClientRect().width);
    if(w) { COLW[c.id]=COLW[c.id]||w; el.style.width=COLW[c.id]+"px"; } });
  const x0=ev.clientX, w0=col.getBoundingClientRect().width || col.offsetWidth ||
           parseFloat(getComputedStyle(col).width) || 100;
  document.body.classList.add("resizing");
  document.body.classList.add("colw");    // renderStage confirms or drops it
  const fit=()=>{ const total=live.reduce((a,c)=>a+(COLW[c.id]||0),0);
                  if(total) table.style.width=total+"px"; };
  fit();
  const move=e=>{ const w=Math.max(40, Math.round(w0 + (e.clientX-x0)));
                  col.style.width=w+"px"; COLW[id]=w; fit(); };
  const up=()=>{ document.removeEventListener("mousemove",move);
                 document.removeEventListener("mouseup",up);
                 document.body.classList.remove("resizing"); saveColW(); };
  document.addEventListener("mousemove",move);
  document.addEventListener("mouseup",up);
}
const SORTV={ comp:w=>[surname(w), fold(w.composer)],
  work:w=>[surname(w), fold(w.composer), ...catSort(w)],
  cat:w=>catSort(w), title:w=>[fold(w.title)],
  key:w=>{const p=keyParts(val(w,"key"));return p?[FIFTHS.indexOf(p.tonic)*2+(p.mode==="minor"?1:0)]:[99]},
  scoring:w=>[fold(ensemble(w)||"~")], date:w=>[year(w)??9999], dur:w=>[seconds(w)??-1],
  src:w=>[-(w.sources||[]).length],
  /* how many recordings MusicBrainz holds, its own total and not our sample. Works we
     have no count for sort last rather than as zero: not measured is not "never
     recorded", and putting them at 0 would state something nobody said.
     Sorts on `pop`, not on `nr`: a recording attaches to a movement as readily as to
     the whole, so Beethoven's Seventh has no count of its own while its Allegretto has
     444, and ranking on `nr` buried the symphony under works nobody hums. `pop` is the
     work's own count where it has one and its best-counted movement where it does not,
     derived in build_core.py and labelled in the cell. */
  rec:w=>[w.pop?-w.pop:1, fold(w.composer)],
  score:w=>[-((w.media||{}).scores||0)],
  audio:w=>[-((w.au||0)+(w.ar||0)), -((w.media||{}).free_recordings||0)] };
function cmp(a,b){ const A=SORTV[state.sort](a), B=SORTV[state.sort](b);
  for(let i=0;i<Math.max(A.length,B.length);i++){ const x=A[i],y=B[i]; if(x===y) continue;
    if(typeof x==="string"||typeof y==="string") return String(x)>String(y)?state.dir:-state.dir;
    return (x-y)*state.dir; }
  return fold(a.title)>fold(b.title)?1:-1; }
const CELL = {
  /* One surname fits the column; three do not, and a truncated "Handel &…" tells the
     reader less than a count does. So: the first name, a dot per composer, and how many
     more, with every name in the tooltip and all of them spelled out in the card. */
  comp: w => {
    const n = w.composer_slugs.length;
    const dot = `<span class="dot" style="background:${compColour(w.composer_slug)}"></span>`;
    const first = esc(lastName(w.composers[0]||w.composer_slugs[0]));
    /* one dot, not one per composer: the column is 92px and three dots ate the name */
    /* the full name in the tooltip even for a single composer: once the regnal numeral
       is dropped, Johann Strauss I and Johann Strauss II both print "Strauss", and the
       column alone can no longer tell the father from the son. */
    return n < 2 ? `<span title="${esc(w.composers[0]||w.composer_slug)}">${dot}${first}</span>`
      : `<span class="multi" title="${esc(w.composers.join(" · "))}">${dot}${first}`
        + `<span class="plusn">+${n-1}</span></span>`;
  },
  work: w => { const c=primaryCat(w), others=cats(w).filter(x=>!c||x.k!==c.k).slice(0,2);
    return (c?esc(c.label):`<span style="color:var(--faint)">no number</span>`)
      + (c?mark(w,"catalogue"):"")
      + (others.length?`<div class="alt">${others.map(o=>esc(o.label)).join(" · ")}</div>`:""); },
  title: (w,isPart) => { const kids=(w.tree&&w.tree.children||[]).filter(id=>BYID.has(id));
    const flags=(w.completeness==="lost"?`<span class="flagdot flag-lost" title="lost"></span>`:"")
      +(w.versions?`<span class="flagdot flag-ver" title="more than one version on record"></span>`:"");
    return (kids.length&&!isPart?`<span class="caret" data-toggle="${esc(w.id)}">${state.open.has(w.id)?"▾":"▸"}</span>`:"")
      + titleOf(w) + flags
      + (kids.length&&!isPart?`<span class="parts">${kids.length} pieces</span>`:""); },
  key: w => { const k=show(w,"key"); return k
    ? `<span class="sw" style="background:${keyColour(val(w,"key"))}"></span>${esc(k)}${mark(w,"key")}` : ""; },
  scoring: w => { const e=ensemble(w); return e ? esc(e)+mark(w,"instrumentation") : ""; },
  date: w => esc(fmtDate(show(w,"date_composed"))) + (F(w,"date_composed")?mark(w,"date_composed"):""),
  dur: w => fmtDur(seconds(w)),
  score: w => scoreCell(w),
  audio: w => audioCell(w),
  /* `pw` says which number this is, and the cell has to agree with the sort or the
     column reads as a lie: the Op. 28 preludes hold 2 recordings as a set and 455 of
     the fifteenth, and a cell printing 2 beside a row ranked on 455 explains nothing. */
  rec: w => !w.pop
    ? `<span class="unknown" title="not counted yet, which is not the same as never recorded">\u00b7</span>`
    : w.pw === "own"
    ? `<span title="MusicBrainz holds ${w.pop} recording${w.pop>1?"s":""} of this work">${w.pop}</span>`
    : `<span class="derived" title="MusicBrainz counts only ${w.nr||0} recording${(w.nr||0)===1?"":"s"} of the whole work, and ${w.pop} of its best-counted part, so at least that many exist.">\u2265${w.pop}</span>`,
  src: w => srcDots(w),
};
function rowHTML(w,isPart){
  /* EL TÍTULO ENTERO AL PASAR EL RATÓN.
     La columna tiene un ancho fijo y los títulos largos se cortan con puntos suspensivos,
     así que "Concerto for flute, oboe, violin, bassoon, and continuo…" no se podía leer sin
     abrir la ficha. El `title` del navegador lo enseña entero, con el compositor delante
     para que sirva también cuando esa columna no se ve. Víctor, 2026-09-15. */
  const cells = liveCols().map(c => {
    const tip = c.id==="title"
      ? ` title="${esc(titleOf(w))}${w.composer?" · "+esc(w.composer):""}"` : "";
    return `<td class="${c.cls}"${tip}>${CELL[c.id](w,isPart)}</td>`;
  }).join("");
  return `<tr class="${isPart?"part":""}${state.sel===w.id?" sel":""}" data-id="${esc(w.id)}">${cells}</tr>`;
}
/* Free means free: only Public Domain and the CC licences without NC or ND are
   counted, and the count is of recordings whose licence IMSLP actually states. */
/* TWO DIFFERENT THINGS, and they had the same symbol.
   356 works play on this page (Wikimedia Commons, joined by identifier). 4 161 have
   recordings on IMSLP, 6 003 of them freely licensed, which we LINK to and do not
   play, because embedding them would stream from a nonprofit's bandwidth. Marking
   both with a ▶ promised audio that was not there. A filled play button now means it
   plays here; the IMSLP count is a link with its own words. */
/* SCORES: free score files on IMSLP, which is where they live and stay. */
/* LO QUE SE PUEDE ALCANZAR, Y DESDE DÓNDE.
   Lo colgado de esta obra se imprime como siempre. Lo que está en su cuaderno o en sus
   piezas se imprime en gris y con una flecha que dice hacia dónde mirar: ↑ en el conjunto
   al que pertenece, ↓ en sus partes. Nunca se suma a lo propio, porque no es lo mismo
   tener la partitura de esta pieza que tener el cuaderno que la contiene. 1 780 obras
   decían "sin partitura" con un PDF que las contiene a un clic. 2026-09-15. */
function reach(w, key, dir){
  const n = w[key]; if(!n) return "";
  const from = dir==="up" ? BYID.get(w[key.replace(/[ab]$/,"w")]) : null;
  const where = dir==="up"
    ? `${t("in")} ${from?titleOf(from):t("the set")}, ${t("which contains it")}`
    : t("spread across its parts");
  return `<span class="reach" title="${esc(n+" "+(key[0]==="s"?t("score(s)"):t("recording(s)"))+" "+where)}">`
       + `${dir==="up"?"↑":"↓"}${n}</span>`;
}
function scoreCell(w){
  const n=(w.media||{}).scores, u=SRC_URL.imslp(w);
  const own = (n && u)
    ? `<a href="${u}" target="_blank" rel="noopener" onclick="event.stopPropagation()"
        title="${n} free score file${n>1?"s":""} on IMSLP, opens there">♪${n}</a>` : "";
  if(own) return own;
  return reach(w,"sa","up") || reach(w,"sb","down");
}
/* AUDIO: how many recordings there are, which is what the column now says.
   Three different things, counted separately because they are not interchangeable:
     ▶N   playable on this page (Wikimedia Commons files, and Archive items we embed)
     ↗N   on IMSLP, freely licensed, opened there; we link, we never copy
   A work with nothing shows nothing, not a zero: silence is not "no recordings exist". */
function audioCell(w){
  const here=(w.au||0)+(w.ar||0), off=(w.media||{}).free_recordings||0, bits=[];
  if(here) bits.push(`<button class="play" data-play="${esc(w.id)}"
    title="${here} recording${here>1?"s":""} you can play here">▶${here}</button>`);
  const u=SRC_URL.imslp(w);
  if(off && u) bits.push(`<a class="offsite" href="${u}" target="_blank" rel="noopener"
    onclick="event.stopPropagation()"
    title="${off} freely-licensed recording${off>1?"s":""} on IMSLP, opens there">↗${off}</a>`);
  if(!bits.length){
    const r = reach(w,"ab","down") || reach(w,"aa","up");
    if(r) return r;
  }
  return bits.join(" ");
}
function renderWorks(){
  const v=visible(), vset=new Set(v.map(w=>w.id));
  const tops = state.parts ? v : v.filter(w=>{ const p=w.tree&&w.tree.parent;
    return !p || !vset.has(p) || !isWork(BYID.get(p)||{}); });
  tops.sort(cmp);
  const slice=tops.slice(0,state.limit);
  const body=slice.map(w=>{
    let h=rowHTML(w,false);
    if(!state.parts && state.open.has(w.id)){
      const kids=(w.tree.children||[]).map(id=>BYID.get(id)).filter(c=>c&&vset.has(c.id));
      kids.sort(cmp); h+=kids.map(c=>rowHTML(c,true)).join(""); }
    return h;}).join("");
  const cols=liveCols();
  const head=cols.map(c=>`<th data-sort="${c.id}" class="${c.cls}">${c.label}`+
    (state.sort===c.id?`<span class="dir"> ${state.dir>0?"▲":"▼"}</span>`:"")
    +`<span class="grip" data-grip="${c.id}" title="drag to resize · double-click to reset · alt+double-click resets all"></span>`
    +`</th>`).join("");
  /* A width the reader chose wins over the one the stylesheet suggests. Kept per column
     id, so it survives the panel opening (which drops four columns) and the next visit. */
  const colTags = cols.map(c=>{
    const w=COLW[c.id];
    return `<col class="k-${c.id==="work"?"cat":c.id}"${w?` style="width:${w}px"`:""}>`;
  }).join("");
  /* Only pin the table's width when EVERY visible column has one, otherwise the sum is
     short and the table would be narrower than its own columns. A half-filled store
     (an older visit, a column that has since appeared) falls back to the stylesheet. */
  const colwTotal = cols.every(c=>COLW[c.id])
    ? cols.reduce((a,c)=>a+COLW[c.id],0) : 0;
  /* ONE CONDITION, NOT TWO. The class and the pinned width have to agree: resetting a
     single column left the class on with no width pinned, so the table laid itself out
     as `width:auto` over a half-filled set of columns and every one of them moved. */
  document.body.classList.toggle("colw", colwTotal>0);
  document.getElementById("stage").innerHTML = tops.length
    ? `<table class="cat"${colwTotal?` style="width:${colwTotal}px"`:""}>${colTags}<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`+
      (tops.length>slice.length?`<button id="more">${t("Show more")}, ${tops.length-slice.length} ${t("left")}</button>`:"")
    : `<p style="padding:34px 18px;color:var(--muted)">Nothing matches. <button id="reset" style="border:0;background:none;color:var(--accent);cursor:pointer;text-decoration:underline;font:inherit">Clear everything</button></p>`;
}
function renderComposers(){
  const rows=COMPOSERS.map(c=>{
    const ws=WORKS.filter(w=>isWork(w)&&w.composer_slugs.includes(c.slug));
    const three=ws.filter(w=>w.nsources>=3).length;
    const dis=ws.filter(inDoubt).length;
    const play=ws.filter(w=>w.au).length;
    const scores=ws.reduce((a,w)=>a+(w.ms||0),0);
    const cs=new Set(); ws.forEach(w=>cats(w).forEach(x=>cs.add(CATNAME[x.k]||x.k)));
    const ys=ws.map(year).filter(Boolean);
    /* Commons holds far more recordings than we can attach: its audio files carry a
       licence, a duration and a creator but NOTHING that names the work, so there is
       no identifier to join on and we refuse to match by title. The category link is
       the honest way to hand someone the rest. */
    const comm=`https://commons.wikimedia.org/wiki/Category:Audio_files_of_music_by_${encodeURIComponent((c.name||"").replace(/ /g,"_"))}`;
    return `<tr data-comp="${c.slug}">
      <td class="c-title"><span class="dot" style="background:${compColour(c.slug)}"></span>${esc(c.name)}</td>
      <td class="c-num">${c.born||"?"}–${c.died||"?"}</td>
      <td class="c-comp">${esc(period(c))}</td>
      <td class="c-num"><b>${ws.length}</b></td>
      <td class="c-num">${three}</td>
      <td class="c-num">${dis}</td>
      <td class="c-num">${scores||""}</td>
      <td class="c-num">${play||""}</td>
      <td class="c-scoring">${[...cs].slice(0,5).join(" · ")}</td>
      <td class="c-num">${ys.length?Math.min(...ys)+"–"+Math.max(...ys):""}</td>
      <td class="c-num"><a href="${comm}" target="_blank" rel="noopener"
        onclick="event.stopPropagation()" title="more recordings on Wikimedia Commons than we can attach to individual works">Commons ↗</a></td></tr>`;
  }).join("");
  document.getElementById("stage").innerHTML=
    `<table class="cat"><thead><tr><th class="c-title">Composer</th><th class="c-num">Lived</th>
      <th class="c-comp">Period</th><th class="c-num">Works</th><th class="c-num">3 sources</th>
      <th class="c-num">Disagree</th><th class="c-num">Scores</th><th class="c-num">Plays here</th>
      <th class="c-scoring">Catalogues</th><th class="c-num">Dated span</th>
      <th class="c-num">More audio</th></tr></thead><tbody>${rows}</tbody></table>
     <p class="hint">Click a composer to open just their catalogue. "Plays here" counts the
       recordings Wikimedia Commons links to a specific work by identifier; Commons holds many
       more that name no work, so there is nothing to join them on.</p>`;
}

/* ---------- instruments above the table ---------- */
function renderInstrument(){
  const host=document.getElementById("instrument");
  if(state.lens==="table"){ host.innerHTML=""; return; }
  ({fifths:renderFifths, graph:renderGraph, time:renderTimeline,
    map:renderMap, game:renderGame, acq:renderAcq}[state.lens])(host);
}

/* ---------- lens: the map ----------
   The axis that earns the word atlas, and the last one to arrive because until today
   there was nothing honest to draw. The 260 places the atlas held were the venue column
   of two Wikipedia list articles, so a map of them would have been a map of Mozart and
   Handel, and they were prose: `King's Theatre, London` and `King’s Theatre, London`
   were two places, one curly apostrophe apart.

   Wikidata's P4647 is an ITEM, so two spellings are one QID and 95 % carry a coordinate.
   That gives 215 works in 100 places across a dozen composers, and the places read like
   what they are: Theater an der Wien, Teatro San Angelo in Venice (Vivaldi's own house),
   Leipzig, the Eszterházy Palace, the Oper am Gänsemarkt where Handel started.

   An instrument, like every other lens here: click a place and the table below filters
   to the works first heard there. */
let PLACES={};
let MAP=null, MAPLAYER=null;
/* after the layout settles, not during: the grid animates and a size read mid-transition
   is the size it is passing through */
function remapSoon(){ if(MAP) setTimeout(()=>{ try{ MAP.invalidateSize(); }catch(e){} }, 260); }
/* LEAFLET SE CARGA CUANDO SE ABRE EL MAPA, NO ANTES.
   Eran 144 KB de JS y 14 de CSS en la primera carga, casi un 20 % de los 805 KB que viajan,
   para una vista que la mayoría no va a abrir nunca. Se pide la primera vez que alguien
   pulsa "Map" y ya se queda. Vendorizado, así que no sale de este sitio. 2026-09-15. */
let LEAFLET = null;
function needLeaflet(){
  if(LEAFLET) return LEAFLET;
  LEAFLET = new Promise((ok, no) => {
    const css=document.createElement("link");
    css.rel="stylesheet"; css.href="vendor/leaflet.css";
    document.head.appendChild(css);
    const js=document.createElement("script");
    js.src="vendor/leaflet.js"; js.onload=()=>ok(true); js.onerror=no;
    document.head.appendChild(js);
  });
  return LEAFLET;
}
function renderMap(host){
  if(typeof L === "undefined"){
    host.innerHTML=`<p class="hint">${t("loading the map…")}</p>`;
    needLeaflet().then(()=>renderMap(host))
      .catch(()=>{ host.innerHTML=`<p class="hint">${t("the map could not load")}</p>`; });
    return;
  }
  return renderMapNow(host);
}
function renderMapNow(host){
  const pins=new Map();
  for(const w of visible()){
    if(!w.pp || !PLACES[w.pp]) continue;
    if(!pins.has(w.pp)) pins.set(w.pp, []);
    pins.get(w.pp).push(w);
  }
  const shown=[...pins.values()].reduce((a,v)=>a+v.length,0);
  const noxy=visible().filter(w=>!w.pp && w.premiere_place).length;
  host.innerHTML=`<div id="map"></div>
    <p class="hint">${shown} work${shown===1?"":"s"} in ${pins.size} place${pins.size===1?"":"s"},
      first heard there. Most come from Wikidata's <code>P4647</code>, which gives an item
      and not a name, so two spellings of one theatre are one pin and the coordinate is
      the source's own. The rest were looked up from a place name a list article wrote as
      prose, and they are drawn hollow because that is a weaker fact. Click a place to
      filter the catalogue to it.
      ${noxy?`${noxy} more name a place we still cannot put on a map.`:""}
      <span class="mapkey"><span class="k-solid"></span> as the source gave it
      <span class="k-dash"></span> looked up from a name</span></p>`;
  const el=document.getElementById("map");
  if(!window.L){ el.innerHTML='<p class="hint">the map library did not load</p>'; return; }
  if(MAP){ MAP.remove(); MAP=null; }
  MAP=L.map(el,{zoomControl:true,scrollWheelZoom:false}).setView([48,10],4);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {maxZoom:18, attribution:"© OpenStreetMap"}).addTo(MAP);
  MAPLAYER=L.layerGroup().addTo(MAP);
  const bounds=[];
  for(const [q,ws] of pins){
    const p=PLACES[q]; if(p.lat==null) continue;
    bounds.push([p.lat,p.lon]);
    /* area with the count, not radius: a circle twice as wide looks four times as big,
       and Vienna would swamp a village that saw one premiere. */
    const r=3+Math.sqrt(ws.length)*3.2;
    /* A coordinate Wikidata handed us and one we looked up from a name are not the same
       fact, so they are not the same pin: the looked-up ones are drawn hollow, with a
       dashed edge, and say so when you hover. Drawing them identically would be the map
       claiming a precision it has not got. */
    const guessed = p.by==="name";
    const m=L.circleMarker([p.lat,p.lon],{radius:r,weight:guessed?1.4:1.5,
      color:"#6a4a2a", dashArray:guessed?"3 2":null,
      fillColor:compColour(ws[0].composer_slug),
      fillOpacity:guessed?0.16:0.62}).addTo(MAPLAYER);
    const where=[p.city,p.country].filter(Boolean).join(", ");
    const names=[...new Set(ws.map(w=>w.composer.split(" ").slice(-1)[0]))];
    const note = guessed
      ? `<br><span class="tdim">${p.precision==="city only"
          ? "the town around a venue we could not place"
          : "placed by looking the name up, not given as a coordinate"}</span>`
      : "";
    m.bindTooltip(`<b>${esc(p.label)}</b>${where?`<br><span class="tdim">${esc(where)}</span>`:""}
      <br>${ws.length} work${ws.length===1?"":"s"} · ${esc(names.slice(0,4).join(", "))}${names.length>4?"…":""}${note}`,
      {direction:"top"});
    m.on("click",()=>{ state.f.place=new Set([q]); state.lens="table"; state.sub="works";
                       draw(); });
  }
  if(bounds.length) MAP.fitBounds(bounds,{padding:[28,28],maxZoom:6});
}

/* ---------- lens: the timeline ----------
   artatlas draws a dot per year, sized by how many works. That works there because
   a painter makes three works in a good year. It breaks here: Bach wrote 245 in
   1725, and a radius proportional to that spills across two neighbouring rows, the encoding stops being readable exactly where the data is most interesting.
   So: a BAR per year. Bars cannot overlap, their heights are directly comparable
   and a career acquires a shape (Bach's Leipzig years become a visible mountain).

   Kept from artatlas: a row per composer ordered by birth, the composer's colour
   grouping modes, Compress/Stretch, and the fact that it is an instrument, click
   a bar and the table below filters to that composer in that year.
   Added, because the subject earns it: the life drawn as a pale bar behind. */
const TL_MODES = [["composer","By composer"],["period","By period"],
                  ["family","By kind"],["all","All together"]];
const ROW_H = 34;

function renderTimeline(host){
  const pool=WORKS.filter(w=>isWork(w)&&(state.comp.size===0||w.composer_slugs.some(s2=>state.comp.has(s2)))
    && (!state.f.form||!state.f.form.size||arr(val(w,"form")).some(f=>state.f.form.has(f)))
    && (!state.f.family||!state.f.family.size||state.f.family.has(w.family)));
  const undated=pool.filter(w=>year(w)==null).length;
  const compOf=s=>COMPOSERS.find(c=>c.slug===s)||{};
  const keyOf={ composer:w=>w.composer_slug,
                period:w=>periodOf(compOf(w.composer_slug)),
                family:w=>w.family||",",
                all:()=>"all" }[state.tlMode];

  // year -> {group -> {composer -> n}}, so a stacked row keeps its colours
  const byGroup=new Map();
  pool.forEach(w=>{ const y=year(w); if(y==null) return;
    const g=keyOf(w);
    if(!byGroup.has(g)) byGroup.set(g,new Map());
    const m=byGroup.get(g);
    if(!m.has(y)) m.set(y,new Map());
    const c=m.get(y); c.set(w.composer_slug,(c.get(w.composer_slug)||0)+1); });
  if(!byGroup.size){ host.innerHTML=`<p class="hint">No dated works in this selection.</p>`; return; }

  const total=m=>[...m.values()].reduce((a,b)=>a+b,0);
  const years=[...byGroup.values()].flatMap(m=>[...m.keys()]);
  const lo=Math.min(...years)-2, hi=Math.max(...years)+2;
  const LEFT=state.tlMode==="composer"?226:150;
  const avail=Math.max(520,(host.clientWidth||host.parentElement.clientWidth||900)-8);
  const W=Math.round(LEFT+(avail-LEFT)*state.tlZoom), H=byGroup.size*ROW_H+46;
  const x=y=>LEFT+((y-lo)/(hi-lo))*(W-LEFT-26);
  const bw=Math.max(1.6,Math.min(14,(W-LEFT-26)/(hi-lo)*0.82));

  const order=[...byGroup.keys()].sort((a,b)=>{
    if(state.tlMode==="composer") return (compOf(a).born||0)-(compOf(b).born||0);
    if(state.tlMode==="period") return PERIOD_ORDER.indexOf(a)-PERIOD_ORDER.indexOf(b);
    return total2(byGroup.get(b))-total2(byGroup.get(a));
  });
  function total2(m){ return [...m.values()].reduce((s,c)=>s+total(c),0); }

  const peak=Math.max(...[...byGroup.values()].flatMap(m=>[...m.values()].map(total)));
  const step=(hi-lo)>220?50:(hi-lo)>90?25:10;
  const ticks=[];
  for(let yy=Math.ceil(lo/step)*step; yy<=hi; yy+=step)
    ticks.push(`<line class="grid" x1="${x(yy).toFixed(1)}" y1="24" x2="${x(yy).toFixed(1)}" y2="${H-16}"/>
      <text class="tick" x="${x(yy).toFixed(1)}" y="16" text-anchor="middle">${yy}</text>`);

  const rows=order.map((g,i)=>{
    const base=34+i*ROW_H+ROW_H-14, maxH=ROW_H-12;
    const c=state.tlMode==="composer"?compOf(g):null;
    const label=c?c.name:(g==="all"?"every composer":g);
    const life=c&&c.born?`<line class="life" x1="${x(c.born).toFixed(1)}" y1="${base-3}" x2="${x(c.died||c.born).toFixed(1)}" y2="${base-3}" stroke="${compColour(g)}"/>`:"";
    const bars=[...byGroup.get(g).entries()].sort((a,b)=>a[0]-b[0]).map(([yy,per])=>{
      // Square root, not linear. Bach's 245 works in 1725 against Chopin's typical
      // eight flattened every other row to a hairline: true to the numbers, useless
      // as a picture, and it hid the very shape the view exists to show. sqrt keeps
      // the ordering and the comparability while letting the small years be seen.
      const n=total(per), h=Math.max(1.5,(Math.sqrt(n)/Math.sqrt(peak))*maxH);
      let acc=0;
      const segs=[...per.entries()].sort((a,b)=>b[1]-a[1]).map(([slug,k])=>{
        const sh=(k/n)*h, yTop=base-acc-sh; acc+=sh;
        return `<rect x="${(x(yy)-bw/2).toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw.toFixed(1)}"
          height="${sh.toFixed(1)}" fill="${compColour(slug)}"/>`;}).join("");
      return `<g class="tbar" data-y="${yy}" data-g="${esc(g)}" data-n="${n}"
        data-label="${esc(label)}">${segs}
        <rect class="hit" x="${(x(yy)-Math.max(bw,4)/2).toFixed(1)}" y="${(base-maxH).toFixed(1)}"
          width="${Math.max(bw,4).toFixed(1)}" height="${maxH}" fill="transparent"/></g>`;}).join("");
    return `${life}<line class="axis" x1="${LEFT}" y1="${base}" x2="${(W-24)}" y2="${base}"/>
      <text class="tlab" x="${LEFT-12}" y="${base-1}" text-anchor="end">${esc(label.length>26?label.split(" ").slice(-1)[0]:label)}${c&&c.born?` <tspan fill="#a89e91">${c.born}–${c.died||""}</tspan>`:""}</text>${bars}`;
  }).join("");

  host.innerHTML=
    `<div class="tlbar">
       <span id="tl-modes">${TL_MODES.map(([k,l])=>
         `<button data-tl="${k}" aria-pressed="${state.tlMode===k}">${l}</button>`).join("")}</span>
       <button class="chip" data-zoom="-">− Compress</button><button class="chip" data-zoom="+">+ Stretch</button>
       <span class="hint" style="margin:0">one bar per year · tallest = ${peak} works · height is √count, so one huge year does not flatten the rest${undated?` · ${undated} undated works are not shown`:""}</span>
     </div>
     <div class="tlscroll"><svg id="timeline" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
       ${ticks.join("")}${rows}</svg></div>`;
}


function renderFifths(host){
  const counts={};
  WORKS.filter(w=>isWork(w)&&(state.comp.size===0||w.composer_slugs.some(s2=>state.comp.has(s2))))
    .forEach(w=>{const p=keyParts(val(w,"key"));
      if(p) counts[p.tonic+"|"+p.mode]=(counts[p.tonic+"|"+p.mode]||0)+1;});
  const max=Math.max(1,...Object.values(counts));
  const cx=280,cy=270,R=[[112,168],[60,108]],segs=[];
  FIFTHS.forEach((t,i)=>["major","minor"].forEach((mode,ring)=>{
    const n=counts[t+"|"+mode]||0, a0=(i*30-105)*Math.PI/180, a1=(i*30-75)*Math.PI/180, [r0,r1]=R[ring];
    const on=state.f.key&&state.f.key.has(t+" "+mode);
    const P=(r,a)=>`${(cx+r*Math.cos(a)).toFixed(1)} ${(cy+r*Math.sin(a)).toFixed(1)}`;
    const am=(a0+a1)/2, tr=(r0+r1)/2;
    segs.push(`<path class="seg" d="M${P(r0,a0)}A${r0} ${r0} 0 0 1 ${P(r0,a1)}L${P(r1,a1)}A${r1} ${r1} 0 0 0 ${P(r1,a0)}Z"
      fill="${n?keyColour(t+" "+mode):"#f0ebe3"}" fill-opacity="${n?(0.3+0.7*n/max).toFixed(2):1}"
      stroke="${on?"#241a12":"rgba(0,0,0,.08)"}" stroke-width="${on?2:1}" data-key="${t} ${mode}">
      <title>${t} ${mode}, ${n} works</title></path>
      <text x="${cx+tr*Math.cos(am)}" y="${cy+tr*Math.sin(am)-1}" text-anchor="middle">${t}${mode==="minor"?"m":""}</text>
      <text class="cnt" x="${cx+tr*Math.cos(am)}" y="${cy+tr*Math.sin(am)+8}" text-anchor="middle">${n||""}</text>`);
  }));
  host.innerHTML=`<svg id="fifths" viewBox="95 85 370 370">${segs.join("")}</svg>
    <p class="hint">outer ring major · inner minor · click a wedge to keep only that key</p>`;
}

/* BIPARTITE, not radial. With four composers a ring round a single hub read fine;
   with 31 the hubs stacked into a column down the middle of the ring and the labels
   collided with everything. Two columns instead: our composers on the left in birth
   order, everyone they are linked to on the right by how many links they have. It
   scales, it stays readable, and the direction of the relationship is the direction
   you read in. */
function renderGraph(host){
  const mine=new Set(COMPOSERS.map(c=>c.name));
  const hubs=COMPOSERS.filter(c=>chosen(c.slug));
  const hubNames=new Set(hubs.map(c=>c.name));
  const deg=new Map(), hubDeg=new Map(), links=[];
  EDGES.forEach(e=>{ if(e.self) return;
    const ours=e.dir==="out"?e.oc:e.dc, other=e.dir==="out"?e.dc:e.oc;
    const hub=ours.find(c=>hubNames.has(c)); if(!hub) return;
    other.filter(c=>!mine.has(c)).forEach(c=>{
      deg.set(c,(deg.get(c)||0)+1); hubDeg.set(hub,(hubDeg.get(hub)||0)+1);
      links.push({hub,other:c}); });
  });
  const others=[...deg.entries()].sort((a,b)=>b[1]-a[1]).slice(0,46);
  if(!others.length){ host.innerHTML=`<p class="hint">No arrangement links for this selection.</p>`; return; }
  const live=hubs.filter(c=>hubDeg.get(c.name));
  const shown=new Set(others.map(o=>o[0]));

  const ROW=17, LX=250, RX=470, TOP=26;
  const H=Math.max(live.length, others.length)*ROW+TOP+18;
  const ly=i=>TOP+i*ROW+(Math.max(0,(others.length-live.length))*ROW)/2;
  const ry=i=>TOP+i*ROW;
  const lpos=new Map(live.map((c,i)=>[c.name,ly(i)]));
  const rpos=new Map(others.map(([n],i)=>[n,ry(i)]));

  const edges=links.filter(l=>shown.has(l.other)&&lpos.has(l.hub)).map(l=>{
    const y1=lpos.get(l.hub), y2=rpos.get(l.other);
    return `<path class="edge" data-o="${esc(l.other)}" data-h="${esc(l.hub)}"
      d="M${LX} ${y1} C${LX+70} ${y1} ${RX-70} ${y2} ${RX} ${y2}"/>`;}).join("");
  const left=live.map((c,i)=>{const y=ly(i), n=hubDeg.get(c.name)||0;
    return `<g class="node" data-h="${esc(c.name)}" data-slug="${c.slug}">
      <circle cx="${LX}" cy="${y}" r="4.5" fill="${compColour(c.slug)}"/>
      <text x="${LX-9}" y="${y+3.5}" text-anchor="end">${esc(c.name)} <tspan fill="#a89e91">${n}</tspan></text></g>`;}).join("");
  const right=others.map(([n,k],i)=>{const y=ry(i);
    return `<g class="node" data-o="${esc(n)}">
      <circle cx="${RX}" cy="${y}" r="${(2.5+Math.min(6,Math.sqrt(k)*1.8)).toFixed(1)}" fill="#6a4a2a" fill-opacity=".78"/>
      <text x="${RX+9}" y="${y+3.5}">${esc(n)} <tspan fill="#a89e91">${k}</tspan></text></g>`;}).join("");

  host.innerHTML=`<div class="tlscroll"><svg id="graph" width="760" height="${H}" viewBox="0 0 760 ${H}">
      <text class="glab" x="${LX-9}" y="16" text-anchor="end">in the atlas</text>
      <text class="glab" x="${RX+9}" y="16">linked to</text>
      ${edges}${left}${right}</svg></div>
    <p class="hint">${links.length} links · ${deg.size} composers on the other end ·
      hover a name to light its links, click one to see the works. In Bach “based on” usually names the chorale a cantata
      grows from, which is why hymn writers sit here beside Liszt.</p>`;
}

/* ALSO CALLED. 4 489 works, 29 % of the catalogue, carry a different name in each
   source, and until now they were searchable and invisible: type "Schwanengesang" and
   you found it, open it and you would never learn that MusicBrainz calls it something
   else. This project's first decision was that a title is an identity and no source's
   spelling is wrong (DECISIONS.md), and `title_variants` is where that decision is kept.
   Showing it is the decision made visible; hiding it was us keeping the evidence in a
   drawer. Each name says who calls it that, because that is the whole point. */
function clearQuery(){
  state.q=""; state.qw=[];
  const box=document.getElementById("q"); if(box) box.value="";
}

function alsoCalled(w){
  const v=w.title_variants||{}, shown=fold(titleOf(w));
  const others=Object.entries(v).filter(([,n])=>n && fold(n)!==shown);
  if(!others.length) return "";
  return `<p class="alsoc"><span class="lab">Also called</span>`
    + others.map(([src,n])=>`<span class="alt">${esc(n)}<span class="who">${esc(src)}</span></span>`).join("")
    + `</p>`;
}

/* ---------- record panel ---------- */
/* ROWS used to live here, superseded by ROWS2 inside drawRec and never deleted. It was
   also broken: two missing commas made three of its entries subscript the entry before
   them, so the constant evaluated with two `undefined` holes in it. Nothing read it, so
   nothing failed, which is why it sat there for weeks. Removed 2026-09-12 along with the
   blind spot in scan_damage.py that could not see across a line ending. */
/* PAGING THROUGH THE OPEN CARD, the way artatlas pages through an enlarged painting and
   Batalla de Flores before it. Clicking a row, reading it, closing it and hunting for the
   next row is three actions for what is one thought: "and the next one?".

   THE SEQUENCE IS WHAT THE TABLE IS ACTUALLY DRAWING, read from the DOM rather than
   recomputed. That is the whole trick, and it is why the order is right for free: the
   sort, the filters, the composer picker, whether movements are shown, and the 300-row
   limit are all already expressed in those rows. A second computation of "which works,
   in what order" would be a second answer, and the two would drift. */
const recSeq = () => [...document.querySelectorAll("#stage tbody tr[data-id]")]
                       .map(tr => tr.dataset.id);
function recNav(){
  const nav = document.getElementById("recnav");
  const seq = recSeq(), i = seq.indexOf(state.sel);
  const many = seq.length > 1 && i >= 0;
  nav.hidden = !many;
  /* the gutter at the top of the card is only widened while the pager is actually there */
  document.body.classList.toggle("rec-paged", many);
  if(!many) return;
  document.getElementById("reccount").textContent = `${i+1} / ${seq.length}`;
  /* Walking off the end brings in the next chunk rather than wrapping: there are 15 083
     works and the table draws 300, so wrapping at row 300 would quietly tell the reader
     the catalogue ends there. Only the last step is disabled, and only once nothing is
     left to load. */
  const atEnd = i === seq.length - 1 && !document.getElementById("more");
  nav.querySelector('[data-step="1"]').disabled = atEnd;
  nav.querySelector('[data-step="-1"]').disabled = i === 0;
  /* the analogue of preloading the next image: the claims live in a per-composer file,
     so stepping onto a work by a composer we have not fetched would stall on the network
     with the card already open. Fetch it now, while the reader is still reading this one. */
  const nx = BYID.get(seq[i+1]);
  if(nx && !LOADED.has(nx.composer_slug)) loadDetail(nx.composer_slug);
}
function moveRec(step){
  const seq = recSeq(), i = seq.indexOf(state.sel);
  if(i < 0) return;
  if(step > 0 && i === seq.length - 1){
    const more = document.getElementById("more");
    if(!more) return;                      // genuinely the end of the list
    state.limit += 300; renderStage();
    const grown = recSeq();
    if(grown.length > seq.length) return openRec(grown[i+1]);
    return;
  }
  const next = seq[i + step];
  if(next) openRec(next);
}
/* FICHA DE COMPOSITOR. Hasta ahora una fila de compositor solo servía para filtrar el
   catálogo, y todo lo que sabemos de la persona (dónde nació, qué tocaba, quién fue su
   maestro) no se veía en ningún sitio. Usa el mismo panel que una obra, así que hereda
   el paso de ficha en ficha, el atrás y el cerrar con Escape. 2026-09-15. */
function personLine(q){
  const p=PEOPLE[q]; if(!p) return esc(q);
  const yrs=(p.born||p.died)?` <span class="yrs">${p.born||"?"}-${p.died||"?"}</span>`:"";
  return (p.ours?`<button class="plink" data-comp-open="${esc(p.ours)}">${esc(p.label)}</button>`
                :`<span>${esc(p.label)}</span>`)+yrs;
}
function openComposer(slug){
  const c=COMPOSERS.find(x=>x.slug===slug); if(!c) return;
  state.sel=null; state.person=slug;
  const q=c.qid, me=PEOPLE[q]||{};
  const ws=WORKS.filter(w=>isWork(w)&&w.composer_slugs.includes(slug));
  const scores=ws.reduce((a,w)=>a+(w.ms||0),0), play=ws.filter(w=>w.au||w.ar).length;
  /* las relaciones, separadas por lo que significan de verdad: de la primera lista se
     sigue que se trataron, de la segunda no. Bach se sabía a Vivaldi por las partituras. */
  const mine=PLINKS.filter(l=>l.a===q||l.b===q);
  const other=l=>l.a===q?l.b:l.a;
  const knew=mine.filter(l=>l.met&&!l.impossible);
  const infl=mine.filter(l=>!l.met);
  const bad=mine.filter(l=>l.impossible);
  const list=(ls,rel)=>ls.map(l=>`<li>${esc(l.a===q?l.type:invRel(l.type))} ${personLine(other(l))}`
      +(l.impossible?`<span class="why">⚠ ${esc(l.impossible)}</span>`:"")+`</li>`).join("");
  /* a cuántos pasos queda cada uno de los otros del atlas, por trato documentado */
  const reach=COMPOSERS.filter(x=>x.slug!==slug&&x.qid).map(x=>{
      const path=acqPath(q,x.qid); return path?{c:x,path}:null; }).filter(Boolean)
    .sort((a,b)=>a.path.length-b.path.length).slice(0,12);
  document.getElementById("recbody").innerHTML=
    `<p class="whose"><span class="dot" style="background:${compColour(slug)}"></span>
       ${esc(c.name)}<span class="yrs"> ${c.born||"?"}-${c.died||"?"}</span></p>
     <h2>${esc(c.name)}</h2>
     <p class="sub">${esc(period(c))}${me.born_place?` · ${t("born in")} ${esc(me.born_place)}`:""}`
       +`${me.died_place?` · ${t("died in")} ${esc(me.died_place)}`:""}</p>
     ${me.image?`<p class="portrait"><a href="${esc(me.image)}" target="_blank" rel="noopener">
        ${t("see the portrait on Wikimedia Commons")} ↗</a><span class="why">${t("we link, we never copy")}</span></p>`:""}
     <p class="chips">
       <span class="ch">${ws.length} ${t("works")}</span>
       ${scores?`<span class="ch">${scores} ${t("scores")}</span>`:""}
       ${play?`<span class="ch">${play} ${t("with audio")}</span>`:""}
       ${(c.catalogues||[]).length?`<span class="ch">${esc((c.catalogues||[]).join(" · "))}</span>`:""}
       ${(me.instruments||[]).length?`<span class="ch">${t("played")} ${esc(me.instruments.slice(0,4).join(", "))}</span>`:""}
     </p>
     <p><button class="goworks" data-conly="${esc(slug)}">${t("see their")} ${ws.length} ${t("works in the catalogue")}</button></p>
     ${knew.length?`<h4 class="sec">${t("People they knew, as recorded")}</h4><ul class="rel">${list(knew)}</ul>`:""}
     ${bad.length?`<h4 class="sec">${t("Relations the source asserts that cannot have happened")}</h4>
        <ul class="rel bad">${list(bad)}</ul>`:""}
     ${infl.length?`<h4 class="sec">${t("Influences")}</h4>
        <p class="why">${t("A recorded influence does not mean they ever met: Bach knew Vivaldi from the scores.")}</p><ul class="rel">${list(infl)}</ul>`:""}
     ${reach.length?`<h4 class="sec">${t("How many steps away the others in the atlas are")}</h4>
        <ul class="rel steps">${reach.map(r=>`<li><b>${r.path.length-1}</b>
          <button class="plink" data-comp-open="${esc(r.c.slug)}">${esc(r.c.name)}</button>
          <span class="why">${r.path.map(x=>esc((PEOPLE[x]||{}).label||x)).join(" → ")}</span></li>`).join("")}</ul>`:""}`;
  document.body.classList.add("rec-open");
  document.getElementById("recnav").hidden=true;
  document.body.classList.remove("rec-paged");
  remapSoon();
  writeHash();          // una ficha de persona es navegación, igual que una de obra
}
/* La misma relación, dicha desde el otro lado: si el registro dice que A es alumno de B,
   en la ficha de B hay que leer "teacher of A" y no "student of A". */
const REL_INV={"student of":"teacher of","teacher of":"student of","child of":"parent of",
  "sibling of":"sibling of","married to":"married to","worked for":"employed",
  "collaborated with":"collaborated with","influenced by":"influenced"};
const invRel=t=>REL_INV[t]||t;
/* UN ENLACE VIEJO SIGUE LLEVANDO A SU OBRA.
   Los ids de las obras sin QID pasaron de ser el título de su página de IMSLP a ser el
   `pageid` numérico, que es lo único que sobrevive a que IMSLP renombre la página. Eso
   cambió 7 323 ids de golpe, y cualquiera que hubiera compartido un enlace se habría
   quedado con un 404 silencioso. `redirects.json` guarda viejo -> nuevo para siempre, y se
   carga SOLO cuando un id no aparece, que es lo raro: son 400 KB que nadie tiene que
   descargar para ver el catálogo. 2026-09-15. */
let REDIR = null;
async function resolveId(id){
  if(BYID.has(id)) return id;
  if(REDIR === null){
    try{ REDIR = await fetch(`redirects.json?v=${DATA_V}`).then(r=>r.json()); }
    catch(e){ REDIR = {}; }
  }
  const to = REDIR[id];
  return (to && BYID.has(to)) ? to : null;
}
async function openRec(id){
  if(!BYID.has(id)){
    const to = await resolveId(id);
    if(!to) return;
    id = to;
  }
  const w=BYID.get(id); if(!w) return; state.sel=id; state.person=null;
  /* the claims live in the composer's detail file, fetched the first time one of
     their records is opened; the card is drawn twice, thin then full, so it never
     waits on the network before showing anything */
  if(!DETAIL.has(id) && !LOADED.has(w.composer_slug)){
    drawRec(w); await loadDetail(w.composer_slug);
  }
  drawRec(w);
}
function drawRec(row){
  /* the card reads the DETAIL record where it exists (claims, media, the audio list,
     the full tree) and falls back to the index row, so the first paint happens before
     the fetch returns and the second has everything */
  const w = Object.assign({}, row, DETAIL.get(row.id) || {});
  w.id = row.id; w.title = row.title; w.composer = row.composer;
  w.composer_slug = row.composer_slug; w.forces = row.forces;
  w.composer_slugs = row.composer_slugs; w.composers = row.composers;
  w.form_group = row.form_group; w.completeness = row.completeness;
  const id=w.id;
  const c=COMPOSERS.find(x=>x.slug===w.composer_slug)||{};
  const cat=catsShown(w), pc=primaryCat(w);

  /* THE HEADLINE. What a musician wants before anything else: whose it is, what it
     is, who plays it, what key, how long. Chips, not a table, because these are the
     five things you scan, and the table below is for the things you check. */
  const head=[
    val(w,"form") && {t:show(w,"form"), cls:"k-form"},
    w.forces && {t:w.forces, cls:"k-forces"},
    show(w,"key") && {t:show(w,"key"), cls:"k-key", sw:keyColour(val(w,"key"))},
    /* the chip takes the YEAR; IMSLP's free text can run to a whole sentence
       ("1831 (Grand polonaise brillante), 1834 (Andante spianato)") which is worth
       reading in the table below and useless squeezed into a pill */
    year(w) && {t:String(year(w)), cls:"k-date"},
    seconds(w)!=null && {t:fmtDur(seconds(w)), cls:"k-dur"},
    w.completeness && {t:w.completeness, cls:"k-warn"},
  ].filter(Boolean).map(k=>`<span class="kf ${k.cls}">${k.sw?`<span class="sw" style="background:${k.sw}"></span>`:""}${esc(k.t)}</span>`).join("");

  const fromPage = (F(w,"catalogue")||{}).from_page_name;
  const catline = cat.length
    ? `<div class="catline">${cat.map(x=>`<b>${esc(x.label)}</b>`).join('<span class="sep">·</span>')}
       ${mark(w,"catalogue")}${fromPage?`<span class="frompage" title="${esc(fromPage)}">from the page name</span>`:""}</div>` : "";

  const ROWS2=[["instrumentation","Scored for"],["date_composed","Composed"],
    ["duration_measured","Measured in recordings"],["duration_estimated","Editor's estimate"],
    ["dedication","Dedicated to"],["genre","Genre (Wikidata)"],["period_style","Style"]];
  const dl=ROWS2.filter(([f])=>F(w,f)).map(([f,l])=>{
    let v=show(w,f); if(f==="date_composed") v=fmtDate(v);
    return `<dt>${l}</dt><dd>${esc(Array.isArray(v)?v.join(", "):v)}${mark(w,f)}`
         + `${mergedHTML(w,f)}</dd>`;}).join("");

  const kids=(w.tree&&w.tree.children||[]).map(i=>{const k=BYID.get(i); if(!k) return "";
    const kc=primaryCat(k), ks=show(k,"key");
    return `<button data-goto="${esc(i)}"><span class="kt">${titleOf(k)}</span>
      <span class="km">${kc?esc(kc.label):""}${ks?` · ${esc(ks)}`:""}${seconds(k)!=null?` · ${fmtDur(seconds(k))}`:""}</span></button>`;}).join("");
  const parent=(w.tree&&w.tree.parent)&&BYID.get(w.tree.parent);

  const links=Object.entries(SRC_URL).map(([k,fn])=>{const u=fn(w);
    return u?`<a href="${u}" target="_blank" rel="noopener">${k} ↗</a>`:"";}).join("");
  const vers=(w.versions||[]).map(v=>esc(v.raw)).join(" · ");

  document.getElementById("recbody").innerHTML=
    `<p class="whose">${(w.composer_slugs||[w.composer_slug]).map((s2,i)=>{
        const ci=COMPOSERS.find(x=>x.slug===s2)||{};
        return `<span class="dot" style="background:${compColour(s2)}"></span>`
             + `<button class="plink" data-comp-open="${esc(s2)}">`
             + esc(ci.name||(w.composers||[])[i]||s2) + `</button>`
             + `<span class="yrs">${ci.born?` ${ci.born}${ci.died?"-"+ci.died:""}`:""}</span>`;
      }).join('<span class="amp">&amp;</span>')}</p>
     ${(w.composer_slugs||[]).length>1?`<p class="shared">The sources attribute this to
        ${w.composer_slugs.length} composers. That is not a duplicate: it is a
        pasticcio, or an attribution nobody has settled, and the catalogue keeps every
        name rather than choosing one.</p>`:""}
     <h2>${titleOf(w)}</h2>
     ${catline}
     <div class="keyfacts">${head}</div>
     ${w.premiere_place?`<p class="premiere">first heard at <b>${esc(w.premiere_place.v)}</b>
       <a href="${esc(w.premiere_place.article||"")}" target="_blank" rel="noopener"
          title="from the Wikipedia list of this composer's compositions">↗</a></p>`:""}
     ${parent?`<p class="inpart">part of <button data-goto="${esc(parent.id)}">${titleOf(parent)}</button></p>`:""}
     ${vers?`<p class="vers">More than one version on record: ${vers}</p>`:""}
     ${w.joined_by?`<p class="joined">Two sources were joined here. ${esc(w.joined_by)}</p>`:""}
     ${alsoCalled(w)}
     ${audioBlock(w)}
     ${dl?`<h4 class="sec">The facts, and who says them</h4><dl>${dl}</dl>`
        :`<p class="nothing">A name and nothing else. The sources have an entry for this
          and attribute it, and then say no more: no key, no date, no scoring. It is
          kept because it exists, not because we know anything about it.</p>`}
     ${kids?`<h4 class="sec">${(w.tree.children||[]).length} pieces</h4><div class="kids">${kids}</div>`:""}
     ${mediaBlock(w)}
     <div class="links">${links}</div>`;
  document.body.classList.add("rec-open");
  recNav();
  /* Leaflet caches the size of its box and cannot see CSS resize it. Opening the record
     panel narrows #main by 440px, and without this the map keeps drawing at the old
     width: tiles stop short of the edge and every pin sits where it used to be rather
     than where it is. */
  remapSoon();
  renderStage();
}


/* ONE PLAYER, whatever the source.
   Commons recordings used the browser's native <audio> and Archive ones an iframe of
   the Archive's own widget: two different objects in the same card, one of them
   unstyleable because it is cross-origin. And an Archive recording showed no length
   while a Commons one did. So: our own transport for everything, a single shared
   <audio> element so only one thing ever plays, and every row states the same four
   facts, format, duration, who played it, and under what licence.
   The files are still served by Commons and by the Archive. We host nothing. */
const AUDIO = new Audio();
AUDIO.preload = "none";
let PLAYING = null;                       // the row currently bound to it

function fmtClock(s){
  if(s==null||!isFinite(s)) return "--:--";
  s=Math.round(s);
  return s>=3600 ? `${Math.floor(s/3600)}:${String(Math.floor(s%3600/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`
                 : `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
}
/* the file name already says what it is, so a format never has to be missing */
const EXT_FMT={mp3:"MP3",ogg:"OGG",oga:"OGG",opus:"OPUS",flac:"FLAC",wav:"WAV",
  wave:"WAV",m4a:"M4A",aac:"AAC",mid:"MIDI",midi:"MIDI",shn:"SHN"};
function fmtOf(o){
  if(o.format) return o.format;
  const m=String(o.url||"").toLowerCase().match(/\.([a-z0-9]{2,5})(?:\?|$)/);
  return m ? (EXT_FMT[m[1]] || m[1].toUpperCase()) : null;
}
function playerRow(o){
  const meta=[fmtOf(o), o.seconds!=null?fmtClock(o.seconds):null, o.credit, o.licence]
    .filter(Boolean).map(esc);
  return `<div class="pl" data-url="${esc(o.url)}" data-sec="${o.seconds!=null?o.seconds:""}">
    <div class="pl-top">
      <button class="pl-play" aria-label="play">▶</button>
      <div class="pl-bar"><div class="pl-fill"></div></div>
      <span class="pl-time">${o.seconds!=null?fmtClock(o.seconds):"--:--"}</span>
    </div>
    <p class="pl-meta">${o.label?`<span class="pl-label">${esc(o.label)}</span><br>`:""}
      ${meta.join(" · ")}
      ${o.where?` · <a href="${esc(o.where)}" target="_blank" rel="noopener">${esc(o.source)} ↗</a>`
              :` · ${esc(o.source||"")}`}
      ${o.note?`<br><span class="ours">${esc(o.note)}</span>`:""}</p></div>`;
}
function bindPlayer(row){
  if(PLAYING && PLAYING !== row){ PLAYING.classList.remove("on"); }
  if(PLAYING === row && !AUDIO.paused){ AUDIO.pause(); row.classList.remove("on");
    row.querySelector(".pl-play").textContent="▶"; return; }
  if(PLAYING !== row){ AUDIO.src = row.dataset.url; PLAYING = row; }
  row.classList.add("on");
  AUDIO.play().catch(()=>{ row.querySelector(".pl-time").textContent="cannot play"; });
  row.querySelector(".pl-play").textContent="⏸";
}
AUDIO.addEventListener("timeupdate", ()=>{
  if(!PLAYING) return;
  const known = +PLAYING.dataset.sec || AUDIO.duration;
  const pct = known ? (AUDIO.currentTime/known)*100 : 0;
  PLAYING.querySelector(".pl-fill").style.width = Math.min(100,pct)+"%";
  PLAYING.querySelector(".pl-time").textContent =
    fmtClock(AUDIO.currentTime) + " / " + fmtClock(known);
});
AUDIO.addEventListener("loadedmetadata", ()=>{
  // a duration the source never stated, now that the file itself can say
  if(PLAYING && !PLAYING.dataset.sec && isFinite(AUDIO.duration)){
    PLAYING.dataset.sec = Math.round(AUDIO.duration);
  }
});
AUDIO.addEventListener("ended", ()=>{ if(PLAYING){
  PLAYING.classList.remove("on"); PLAYING.querySelector(".pl-play").textContent="▶"; }});

function audioBlock(w){
  /* the card paints twice, thin then full: on the first pass `audio` is still the
     COUNT from the index row, not the list, and the list only exists once the
     composer's detail file has landed */
  const list = Array.isArray(w.audio) ? w.audio : [];
  const arch = Array.isArray(w.archive) ? w.archive : [];
  const rows=[];
  list.forEach(a=>rows.push(playerRow({
    url:a.url, seconds:a.seconds, format:a.format, licence:a.licence,
    credit:a.credit || "performer not named", source:"Wikimedia Commons", where:a.page,
    note:[a.credit_inferred?"performer read from the file name":null,
          a.matched_by?"linked by "+String(a.matched_by).split(",")[0]:null]
         .filter(Boolean).join(" · ")})));
  arch.forEach(it=>{
    const tr=it.tracks||[];
    if(!tr.length){
      rows.push(`<p class="pl-nofile"><a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.title)}</a>
        <br><span>on the Internet Archive, no playable file listed</span></p>`);
      return;
    }
    const total=it.seconds!=null?fmtClock(it.seconds):null;
    rows.push(`<div class="pl-group"><p class="pl-gtop">${esc(it.title)}
      <span>${tr.length} track${tr.length>1?"s":""}${total?` · ${total}`:""}${it.creator?` · ${esc(it.creator)}`:""}
      · <a href="${esc(it.url)}" target="_blank" rel="noopener">Internet Archive ↗</a></span></p>
      ${tr.slice(0,12).map(t=>playerRow({
        url:t.url, label:t.title, seconds:t.seconds, format:t.format,
        licence:it.licence?String(it.licence).replace(/^https?:\/\//,""):"no licence stated there",
        source:"Internet Archive", where:it.url})).join("")}</div>`);
  });
  const midi=(Array.isArray(w.midi)?w.midi:[]).length;
  if(!rows.length && !midi) return "";
  return `<h4 class="sec">Listen</h4>${rows.join("")}
    ${midi?`<p class="pl-midi">${midi} MIDI rendering${midi>1?"s":""} on Commons, not offered here:
      a MIDI file is a synthesis, not a performance, and no browser plays one natively.
      <a href="${esc(w.midi[0].page)}" target="_blank" rel="noopener">see it ↗</a></p>`:""}
    <p class="offwhy">Played from Wikimedia Commons and the Internet Archive, which host and
      serve these files. Nothing is copied here.</p>`;
}
function mediaBlock(w){
  const m=w.media; if(!m) return "";
  const u=SRC_URL.imslp(w);
  const lic=(m.licences||[]).slice(0,4).map(l=>esc(l)).join("<br>");
  const perf=(m.sample||[]).slice(0,4).map(x=>
    `<p class="offrec">${esc(x.performers||"performer not named")}${x.publisher?` · ${esc(x.publisher)}`:""}<br><span>${esc(x.licence)}</span></p>`).join("");
  return `<h4 class="sec">On IMSLP, not here</h4>
    <p class="offnote">
      ${m.scores?`<b>${m.scores}</b> free score file${m.scores>1?"s":""}`:""}
      ${m.recordings?`${m.scores?" · ":""}<b>${m.free_recordings}</b> of ${m.recordings} recording${m.recordings>1?"s":""} freely licensed`:""}
    </p>
    ${m.recordings?`<p class="offwhy">These play on IMSLP, not on this page: embedding them would
      stream from a donation-funded library's bandwidth, and its robots.txt asks us not to touch
      the file paths. The link opens the work there.</p>`:""}
    ${perf}
    ${lic?`<p class="offlic">licences on that page:<br>${lic}</p>`:""}
    ${u?`<p><a class="offlink" href="${u}" target="_blank" rel="noopener">open on IMSLP ↗</a></p>`:""}`;
}

/* ---------- chrome ---------- */
function railFor(f, pool, limit){
  const counts=new Map();
  let gap=0;
  pool.forEach(w=>{ const vs=f.get(w);
    if(f.gap && !vs.length) gap++;
    vs.forEach(v=>counts.set(v,(counts.get(v)||0)+1)); });
  if(!counts.size) return "";
  let items=[...counts.entries()];
  const order=f.order && f.order();
  items.sort(order ? (a,b)=>order.indexOf(a[0])-order.indexOf(b[0]) : (a,b)=>b[1]-a[1]);
  limit = limit || (typeof f.limit === "function" ? f.limit() : f.limit);
  const cut = limit ? Math.max(0, items.length - limit) : 0;
  if(limit) items=items.slice(0,limit);
  /* last, and after the limit, so it is never one of the values a "top 10" cuts off and
     never competes with them for a place in the rail */
  if(gap) items.push([NOT_STATED, gap]);
  /* el nombre del eje solo se repite en el subeje ("As catalogued" dentro de Kind): para
     el eje abierto ya lo dice su botón, y ponerlo dos veces es ruido. */
  return `<span class="fg">${f.id===state.axis?"":`<span class="lbl">${f.label}</span>`}`+
    items.map(([v,n])=>`<button class="chip" data-facet="${f.id}" data-v="${esc(v)}"
      aria-pressed="${!!(state.f[f.id]&&state.f[f.id].has(v))}">${esc(v)}<span class="n">${n}</span></button>`).join("")+
    (cut && f.over ? `<span class="fg-over">${esc(f.over(cut))}</span>` : "")+
    `</span>`;
}
function renderFacets(){
  /* En el juego los filtros no filtran nada: la pregunta sale de su propio fondo, con
     cuota por compositor. Dejarlos puestos invita a tocarlos y no pasa nada, que es la
     peor respuesta que puede dar un control. */
  if(state.lens==="game"){ document.getElementById("facets").innerHTML=""; return; }
  const pool=WORKS.filter(w=>isWork(w)&&(state.comp.size===0||w.composer_slugs.some(s2=>state.comp.has(s2))));
  /* UN EJE CADA VEZ, Y LOS SIETE NOMBRES SIEMPRE A LA VISTA.
     Se dibujaban los siete carriles a la vez: **9 363 px de chips en una ventana de 1 024**,
     o sea 8 339 px escondidos a la derecha sin nada que dijera que estaban ahí. Entraba el
     primero y medio, y los otros cinco ejes no existían para quien no arrastrara.

     Recortar chips no era la respuesta, porque el problema no es ningún carril (el mayor
     son 2 292 px) sino que están los siete. Así que los NOMBRES de los ejes van siempre en
     una línea, que cabe de sobra, y debajo van los valores del que esté abierto. No se
     esconde nada: se deja de enseñar todo a la vez. 2026-09-15. */
  const shown=FACETS.filter(f=>!f.hidden);
  if(!shown.some(f=>f.id===state.axis)) state.axis=shown[0].id;
  const tabs=shown.map(f=>{
    const on=state.f[f.id]&&state.f[f.id].size;
    return `<button class="axis${f.id===state.axis?" open":""}${on?" has":""}"
      data-axis="${f.id}">${esc(f.label)}${on?`<span class="n">${on}</span>`:""}</button>`;
  }).join("");
  const f=shown.find(x=>x.id===state.axis);
  let html=`<span class="axes">${tabs}</span><span class="chip-sep"></span>`
         + (railFor(f,pool)||`<span class="fg-over">${t("nothing on this axis for what is on screen")}</span>`);
  /* el subeje solo tiene sentido con su eje abierto y algo elegido en él */
  const g=state.f.form_group;
  if(state.axis==="form_group" && g && g.size){
    const sub=railFor(SUBFACET, pool.filter(w=>g.has(w.form_group)));
    if(sub) html += `<span class="chip-sep"></span>` + sub;
  }
  document.getElementById("facets").innerHTML=html;
}
/* EVERY active filter is visible and removable from wherever you are.
   Filtering by key inside the "By key" lens and then going back to the catalogue
   left the table silently narrowed with nothing on screen saying so, the worst
   kind of filter, because the corpus looks smaller than it is and you cannot tell
   why. artatlas solves the same problem with its removable museum chip; this is
   that, generalised to every filter, and it lives in the sub-bar, which is on
   screen in all three lenses. */
function activeFilters(){
  const out=[];
  if(state.comp.size && !state.comp.has("∅"))
    [...state.comp].forEach(s=>{ const c=COMPOSERS.find(x=>x.slug===s);
      out.push({k:"comp",v:s,label:c?c.name:s,dot:compColour(s)}); });
  if(state.comp.has("∅")) out.push({k:"comp",v:"∅",label:"no composer"});
  if(state.q) out.push({k:"q",v:"",label:`“${document.getElementById("q").value}”`});
  (state.f.key?[...state.f.key]:[]).forEach(k=>out.push({k:"key",v:k,label:k,sw:keyColour(k)}));
  /* A facet may know how to print its own values: the place filter holds a QID, and
     "first heard at: Q1145326" is not a chip anybody can read. */
  [...FACETS, SUBFACET].forEach(f=>(state.f[f.id]?[...state.f[f.id]]:[]).forEach(v=>
    out.push({k:f.id,v,label:`${f.label.toLowerCase()}: ${f.name?f.name(v):v}`})));
  if(state.year!=null) out.push({k:"year",v:"",label:`year ${state.year}`});
  if(state.doubt) out.push({k:"doubt",v:"",label:"only where sources disagree"});
  if(state.parts) out.push({k:"parts",v:"",label:"individual pieces shown"});
  return out;
}
function renderActive(){
  const host=document.getElementById("clear"), fs=activeFilters();
  host.innerHTML = fs.length
    ? fs.map(f=>`<span class="chip mchip">${f.dot?`<span class="dot" style="background:${f.dot}"></span>`:""}${f.sw?`<span class="sw" style="background:${f.sw}"></span>`:""}${esc(f.label)}<button data-drop="${esc(f.k)}" data-dv="${esc(f.v)}" title="remove">×</button></span>`).join("")
      + `<button class="chip" id="reset">Clear all</button>`
    : "";
}
/* La URL se escribe AQUÍ y no en draw(), porque abrir una ficha, cambiar de vista y
   ordenar pasan por renderStage y no por draw: con la llamada solo en draw, abrir una
   obra no dejaba entrada en el historial y el primer atrás se saltaba la ficha entera.
   Es idempotente: si el hash no cambia (ordenar, desplegar una fila, pedir más filas),
   no anota nada. */
/* QUÉ ES ESTO, DICHO EN ALGÚN SITIO.
   Hasta hoy no había ni una línea que lo explicara. Alguien que llegaba se encontraba una
   tabla de 15 080 filas, siete pestañas y siete carriles de filtros, y la idea que
   distingue al atlas entero (que cada dato dice quién lo sostiene, y que los desacuerdos
   se publican en vez de resolverse a escondidas) vivía en un `hover` sobre un punto de
   cuatro píxeles y en una línea gris del pie.

   Los números se cuentan aquí, en vivo. Escribirlos a mano en un texto es exactamente cómo
   envejece mal un documento, y este proyecto ya ha tropezado con eso. 2026-09-15. */
function aboutHTML(){
  const w = WORKS.filter(isWork);
  const dis = w.filter(inDoubt).length;
  const bare = w.filter(x=>x.nk).length;
  const twice = w.filter(x=>x.xc).length;
  const scores = w.filter(x=>(x.media||{}).scores).length;
  const play = w.filter(x=>x.au||x.ar).length;
  const n = x => x.toLocaleString("en");
  return `<div id="about"><div class="ab">
    <button class="ab-x" data-about="close" aria-label="Close">×</button>
    <h2>${t("What this is")}</h2>
    <p class="ab-lead">${t("A catalogue of")} <b>${n(w.length)}</b> ${t("works by")}
       <b>${COMPOSERS.length}</b> ${t("composers, built from IMSLP, Wikidata and MusicBrainz. What it tries to do is not hold the most works: it is to be clear about where each fact comes from.")}</p>
    <h4>${t("Every fact says who says it")}</h4>
    <p>${t("The dot beside a value is its provenance. Hover it and you see which sources spoke and what each one wrote, in its own words.")}</p>
    <h4>${t("When the sources disagree, you see both")}</h4>
    <p>${n(dis)} ${t("works carry a disagreement, and not one of them has been quietly resolved. The reading we did not take stays on the record, with the name of the source that made it.")}
       <button class="ab-go" data-about="doubt">${t("show me those")}</button></p>
    <h4>${t("What we do not know is marked, not hidden")}</h4>
    <p>${n(bare)} ${t("works are a name and nothing else: a catalogue has an entry for them and then says nothing more. They are kept because they exist, not because we know anything about them.")}
       <button class="ab-go" data-about="bare">${t("show me those")}</button></p>
    <h4>${t("What you can do with it")}</h4>
    <p>${n(scores)} ${t("works have a free score and")} ${n(play)} ${t("something to listen to. There is a map of where works were first heard, a graph of who knew whom, and a game.")}
       ${n(twice)} ${t("works have at least one fact that two independent sources agreed on, which is the number worth trusting.")}</p>
    <p class="ab-foot">${t("Nothing here is copied: scores and recordings are linked where they live, at IMSLP, Wikimedia Commons and the Internet Archive.")}</p>
  </div></div>`;
}
function showAbout(){
  document.getElementById("instrument").insertAdjacentHTML("beforebegin", aboutHTML());
}
function hideAbout(){ const a=document.getElementById("about"); if(a) a.remove(); }
document.addEventListener("click", e=>{
  if(e.target.closest("#whatis")){ hideAbout(); return showAbout(); }
  const g=e.target.closest("[data-about]");
  if(!g) return;
  const k=g.dataset.about;
  hideAbout();
  if(k==="close") return;
  /* Cada "enséñame esas" parte de cero. La primera versión las sumaba, así que pulsar
     "en duda" y luego "solo un nombre" pedía las dos cosas a la vez y contestaba **0
     obras**, que es la peor respuesta posible a un botón que promete enseñarte algo. */
  state.f={}; state.q=""; state.qw=[]; state.doubt=false; state.year=null;
  document.getElementById("q").value="";
  const dt=document.getElementById("t-doubt");
  if(k==="doubt"){ state.doubt=true; dt.setAttribute("aria-pressed", true); }
  else { dt.setAttribute("aria-pressed", false); }
  if(k==="bare") state.f.flag=new Set(["a name and nothing else"]);
  state.lens="table"; state.sub="works";
  document.querySelectorAll("#view-tabs button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.lens==="table"));
  return draw();
});

/* LA TABLA SE ALARGA SOLA AL LLEGAR ABAJO.
   Dibuja 300 filas de 15 080, y el botón de "más" quedaba **a 14 274 px de scroll**: nadie
   baja eso, así que para casi todo el mundo el catálogo tenía 300 obras. Ahora se pide el
   siguiente tramo cuando quedan 600 px por bajar, que es antes de que el lector llegue al
   final y sin que tenga que hacer nada.

   El botón se queda igualmente, porque un teclado y un lector de pantalla no "se acercan al
   final", y porque dice cuántas faltan, que es una información que el scroll no da.
   2026-09-15. */
function watchScroll(){
  const sc=document.getElementById("scroll");
  if(!sc || sc.dataset.watched) return;
  sc.dataset.watched="1";
  sc.addEventListener("scroll", () => {
    if(state.lens!=="table" || state.sub!=="works") return;
    if(sc.scrollTop + sc.clientHeight < sc.scrollHeight - 600) return;
    const more=document.getElementById("more");
    if(!more || more.dataset.busy) return;
    more.dataset.busy="1";
    state.limit += 300;
    renderStage();
  }, {passive:true});
}

function renderStage(){
  /* salir de "Play" retira el permiso: al volver, se vuelve a avisar y a esperar. */
  if(state.lens!=="game"){ GREADY=false; gStop(); }
  document.body.classList.toggle("lens-game", state.lens==="game");
  document.body.classList.toggle("lens-acq", state.lens==="acq");
  (state.sub==="composers"?renderComposers:renderWorks)(); writeHash(); }
function draw(){
  state.limit=300; renderPicker(); renderFacets(); renderInstrument(); renderStage();
  const v=visible(), all=WORKS.filter(isWork).length;
  document.getElementById("totals").innerHTML=
    /* Say what is measured. This read "triple-checked" off the number of catalogues
       that hold an entry for the work, which is not what a reader hears and is not the
       more interesting fact: a source can list a work without contributing anything we
       published. `xc` counts fields where two or more sources actually spoke. */
    `<b>${all}</b> works · <b>${COMPOSERS.length}</b> composers · <b>${WORKS.filter(w=>isWork(w)&&w.xc).length}</b> with a fact confirmed twice`;
  document.getElementById("count").innerHTML= state.sub==="composers"
    ? `<b>${COMPOSERS.length}</b> composers`
    : `<b>${v.length}</b>${v.length!==all?` of ${all}`:""} works · <b>${v.filter(inDoubt).length}</b> with a disagreement`;
  renderActive();
  writeHash();
}
/* ATRÁS DESHACE, NO SE SALE.
   La URL ya llevaba el estado, pero con `replaceState`, que NO crea entrada de
   historial: el lector se filtraba por Chopin, abría una obra, daba a atrás y **se iba
   de la web**. La gente da mucho a atrás, y en una página así atrás significa "quita lo
   último que hice", no "sácame de aquí". Copiado de Batalla de Flores.

   Cada cambio de navegación empuja una entrada: la vista, el compositor, un filtro, la
   búsqueda y la obra abierta. Lo que no es navegación se queda fuera a propósito (las
   filas desplegadas, cuántas se dibujan, los anchos de columna): llenarían el historial
   de pasos que nadie querría deshacer. 2026-09-15. */
let BACK = false;                  // mientras el navegador nos mueve, no escribimos
function hashNow(){
  const p=[state.lens];
  if(state.sub!=="works") p.push("sub="+state.sub);
  if(state.comp.size) p.push("c="+[...state.comp].join(","));
  if(state.q) p.push("q="+encodeURIComponent(state.q));
  Object.entries(state.f).forEach(([k,s])=>{ if(s&&s.size) p.push(k+"="+[...s].join(",")); });
  if(state.sel) p.push("w="+state.sel);
  if(state.person) p.push("p="+state.person);
  return "#"+p.join("/");
}
function writeHash(){
  if(BACK) return;                 // el cambio viene del historial: no lo re-anotamos
  const h=hashNow();
  if(h===location.hash) return;    // mismo estado, ninguna entrada nueva
  history.pushState(null,"",h);
}
/* El primer dibujo no debe dejar una entrada vacía delante del estado inicial. */
function writeHashFirst(){ history.replaceState(null,"",hashNow()); }
window.addEventListener("popstate",()=>{
  BACK=true;
  try{
    state.comp=new Set(); state.f={}; state.q=""; state.qw=[]; state.sel=null;
    state.person=null;
    state.sub="works"; state.lens="table"; state.limit=300; state.open=new Set();
    document.getElementById("q").value="";
    readHash();
    if(state.sel) openRec(state.sel);
    else if(state.person) openComposer(state.person);
    else { document.body.classList.remove("rec-open","rec-paged"); remapSoon(); }
    renderPicker(); renderFacets(); renderInstrument(); renderStage();
  } finally { BACK=false; }
});
function readHash(){
  const h=decodeURIComponent(location.hash.slice(1)); if(!h) return;
  h.split("/").forEach((p,i)=>{
    if(i===0&&["table","fifths","graph","time","map","game","acq"].includes(p)) state.lens=p;
    const m=p.match(/^(\w+)=(.*)$/); if(!m) return;
    if(m[1]==="q"){ state.q=fold(m[2]); state.qw=state.q.split(/\s+/).filter(Boolean);
                    document.getElementById("q").value=m[2]; }
    else if(m[1]==="c") state.comp=new Set(m[2].split(","));
    else if(m[1]==="sub") state.sub=m[2];
    else if(m[1]==="w") state.sel=m[2];
    else if(m[1]==="p") state.person=m[2];
    else state.f[m[1]]=new Set(m[2].split(","));
  });
  document.querySelectorAll("#view-tabs button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.lens===state.lens));
  document.querySelectorAll("#subtabs button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.sub===state.sub));
}
/* ARROW KEYS, because a reader paging through records reaches for them before the mouse.
   Not while typing: the filter box and the search field own their own arrow keys, and
   stealing them would move the card while somebody is correcting a word. Escape closes,
   which is what every other panel here already does. */
document.addEventListener("keydown", e => {
  if(!document.body.classList.contains("rec-open")) return;
  const el = document.activeElement, tag = (el && el.tagName || "").toLowerCase();
  if(tag === "input" || tag === "textarea" || tag === "select" || (el && el.isContentEditable)) return;
  if(e.metaKey || e.ctrlKey || e.altKey) return;
  if(e.key === "ArrowLeft"){ e.preventDefault(); moveRec(-1); }
  else if(e.key === "ArrowRight"){ e.preventDefault(); moveRec(1); }
  else if(e.key === "Escape"){ document.querySelector("#rec .close").click(); }
});
document.addEventListener("click",e=>{
  const t=e.target;
  const ax=t.closest("[data-axis]");
  if(ax){ state.axis=ax.dataset.axis; return renderFacets(); }
  const chip=t.closest("#facets .chip");
  if(chip){ const f=chip.dataset.facet,v=chip.dataset.v; state.f[f]=state.f[f]||new Set();
    state.f[f].has(v)?state.f[f].delete(v):state.f[f].add(v); return draw(); }
  const lens=t.closest("#view-tabs button");
  if(lens){ state.lens=lens.dataset.lens;
    document.querySelectorAll("#view-tabs button").forEach(b=>b.setAttribute("aria-pressed",b===lens));
    return draw(); }
  const sub=t.closest("#subtabs button");
  if(sub){ state.sub=sub.dataset.sub;
    document.querySelectorAll("#subtabs button").forEach(b=>b.setAttribute("aria-pressed",b===sub));
    return draw(); }
  if(t.id==="t-parts"){ state.parts=!state.parts; t.setAttribute("aria-pressed",state.parts); return draw(); }
  if(t.id==="t-doubt"){ state.doubt=!state.doubt; t.setAttribute("aria-pressed",state.doubt); return draw(); }
  if(t.dataset && t.dataset.grip) return;      // the grip resizes, it never sorts
  const th=t.closest("th[data-sort]");
  if(th){ state.dir=state.sort===th.dataset.sort?-state.dir:1; state.sort=th.dataset.sort; return renderStage(); }
  const car=t.closest("[data-toggle]");
  if(car){ e.stopPropagation(); const id=car.dataset.toggle;
    state.open.has(id)?state.open.delete(id):state.open.add(id); return renderStage(); }
  const tl=t.closest("[data-tl]");
  if(tl){ state.tlMode=tl.dataset.tl; return draw(); }
  const zoom=t.closest("[data-zoom]");
  if(zoom){ state.tlZoom=Math.max(.4,Math.min(6, state.tlZoom*(zoom.dataset.zoom==="+"?1.5:1/1.5)));
    return renderInstrument(); }
  const bar=t.closest(".tbar");
  if(bar){ state.year=+bar.dataset.y;
    if(state.tlMode==="composer") state.comp=new Set([bar.dataset.g]);
    else if(state.tlMode==="family"){ state.f.family=new Set([bar.dataset.g]); }
    else if(state.tlMode==="period"){
      state.comp=new Set(COMPOSERS.filter(c=>periodOf(c)===bar.dataset.g).map(c=>c.slug)); }
    return draw(); }
  const seg=t.closest(".seg");
  if(seg){ const k=seg.dataset.key; state.f.key=state.f.key||new Set();
    state.f.key.has(k)?state.f.key.delete(k):state.f.key.add(k); return draw(); }
  const drop=t.closest("[data-drop]");
  if(drop){ const k=drop.dataset.drop, v=drop.dataset.dv;
    if(k==="comp"){ state.comp.delete(v); if(state.comp.size===0) state.comp=new Set(); }
    else if(k==="q"){ state.q=""; state.qw=[]; document.getElementById("q").value=""; }
    else if(k==="doubt"){ state.doubt=false; document.getElementById("t-doubt").setAttribute("aria-pressed",false); }
    else if(k==="parts"){ state.parts=false; document.getElementById("t-parts").setAttribute("aria-pressed",false); }
    else if(k==="year"){ state.year=null; }
    else if(state.f[k]) state.f[k].delete(v);
    return draw(); }
  const pl=t.closest(".pl");
  if(pl && t.closest(".pl-play, .pl-bar")){
    if(t.closest(".pl-bar") && PLAYING===pl && AUDIO.duration){
      const r=t.closest(".pl-bar").getBoundingClientRect();
      AUDIO.currentTime=((e.clientX-r.left)/r.width)*AUDIO.duration; return; }
    return bindPlayer(pl); }
  const play=t.closest("[data-play]");
  if(play){ e.stopPropagation(); return openRec(play.dataset.play); }
  if(t.id==="more"){ state.limit+=300; return renderStage(); }
  if(t.id==="reset"){ state.f={}; state.q=""; state.qw=[]; state.comp=new Set();
    state.doubt=false; state.year=null;
    document.getElementById("q").value=""; document.getElementById("t-doubt").setAttribute("aria-pressed",false);
    return draw(); }
  const step=t.closest("#rec .rec-step");
  if(step){ e.stopPropagation(); return moveRec(+step.dataset.step); }
  if(t.closest("#rec .close")){ document.body.classList.remove("rec-open"); remapSoon();
    if(PLAYING){ AUDIO.pause(); PLAYING.classList.remove("on"); PLAYING=null; }
    state.sel=null; state.person=null; return renderStage(); }
  /* THE GRAPH LED NOWHERE. Hovering a name lit its links and clicking it did nothing,
     so the one lens that shows composers borrowing from each other was a picture rather
     than a way in. A name on the left is a composer in the atlas: clicking it filters
     the catalogue to their works, the same thing a row in the Composers tab does. A name
     on the right is somebody we do not hold, so it searches for them instead, which is
     the honest equivalent: we cannot show you their catalogue because we do not have one. */
  const node=t.closest("#graph .node");
  if(node){
    /* Clicking a name is "take me to this", so a search typed before coming here is
       dropped. Carrying it across sent the first test straight to "0 of 15083 works":
       Buxtehude, correctly, has nothing matching "bwv 1014". A click that lands on an
       empty table is a dead end however honest the two filter chips above it are. */
    if(node.dataset.slug){ clearQuery(); state.comp=new Set([node.dataset.slug]);
      state.sub="works"; state.lens="table"; return draw(); }
    if(node.dataset.o){ clearQuery(); const q=node.dataset.o;
      state.q=q; state.qw=fold(q).split(/\s+/).filter(Boolean);
      const box=document.getElementById("q"); if(box) box.value=q;
      state.lens="table"; state.sub="works"; return draw(); }
  }
  const goto=t.closest("[data-goto]"); if(goto) return openRec(goto.dataset.goto);
  const copen=t.closest("[data-comp-open]");
  if(copen) return openComposer(copen.dataset.compOpen);
  const conly=t.closest("[data-conly]");
  if(conly){ state.comp=new Set([conly.dataset.conly]); state.sub="works"; state.sel=null;
    document.body.classList.remove("rec-open","rec-paged");
    document.querySelectorAll("#subtabs button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.sub==="works"));
    return draw(); }
  const crow=t.closest("tr[data-comp]");
  if(crow) return openComposer(crow.dataset.comp);
  const row=t.closest("tr[data-id]"); if(row) return openRec(row.dataset.id);
});
document.getElementById("q").addEventListener("input",e=>{
  state.q=fold(e.target.value.trim());
  state.qw=state.q.split(/\s+/).filter(Boolean);
  draw(); });
document.addEventListener("mouseover",e=>{
  const tip=document.getElementById("tip");
  const bar=e.target.closest(".tbar");
  if(bar){ tip.innerHTML=`<b>${esc(bar.dataset.label)}</b><br>${bar.dataset.y}, `
      + `${bar.dataset.n} work${bar.dataset.n==="1"?"":"s"}`;
    const r=bar.getBoundingClientRect();
    tip.style.left=Math.max(6,Math.min(innerWidth-352,r.left-10))+"px";
    tip.style.top=(r.bottom+8)+"px"; tip.classList.add("on"); return; }
  const cc=e.target.closest(".cc[data-w]");
  if(cc){ const w=BYID.get(cc.dataset.w);
    if(w){ tip.innerHTML=tipHTML(w,cc.dataset.f); const r=cc.getBoundingClientRect();
      tip.style.left=Math.max(6,Math.min(innerWidth-352,r.left-10))+"px";
      tip.style.top=(r.bottom+8)+"px"; tip.classList.add("on"); } }
  else tip.classList.remove("on");
  const n=e.target.closest("#graph .node");
  document.querySelectorAll("#graph .edge").forEach(p=>p.classList.toggle("hot",
    !!n && (p.dataset.o===n.dataset.o || p.dataset.h===n.dataset.h)));
});
/* The divider. Its width is remembered, because a table of catalogue numbers and a
   record with seven players want different amounts of room. */
(function(){
  const d=document.getElementById("divider"), main=document.getElementById("main");
  if(!d||!main) return;
  const saved=parseInt(localStorage.getItem("musicatlas.recw")||"",10);
  if(saved>280 && saved<900) document.documentElement.style.setProperty("--rec-w", saved+"px");
  let on=false;
  d.addEventListener("mousedown", e=>{ on=true; d.classList.add("dragging");
    document.body.classList.add("resizing"); e.preventDefault(); });
  addEventListener("mousemove", e=>{ if(!on) return;
    const w=Math.round(main.getBoundingClientRect().right - e.clientX);
    if(w>280 && w<Math.min(900, innerWidth-360))
      document.documentElement.style.setProperty("--rec-w", w+"px"); });
  addEventListener("mouseup", ()=>{ if(!on) return; on=false;
    d.classList.remove("dragging"); document.body.classList.remove("resizing");
    const w=parseInt(getComputedStyle(document.documentElement).getPropertyValue("--rec-w"),10);
    if(w) try{ localStorage.setItem("musicatlas.recw", String(w)); }catch(_){}
    remapSoon();            // the divider resizes the map's box too
    renderStage(); });      // ...y cambia cuántas columnas caben en lo que queda
})();

document.querySelector(".brand").addEventListener("click",e=>{
  e.preventDefault(); history.replaceState(null,"",location.pathname); location.reload(); });

Promise.all([
  fetch(`core.json?v=${DATA_V}`).then(r=>r.json()),
  fetch(`arrangements.json?v=${DATA_V}`).then(r=>r.json()).catch(()=>[]),
  fetch(`composers.json?v=${DATA_V}`).then(r=>r.json()).catch(()=>({})),
  fetch(`places.json?v=${DATA_V}`).then(r=>r.json()).catch(()=>({})),
  fetch(`people.json?v=${DATA_V}`).then(r=>r.json()).catch(()=>({people:{},links:[]}))
]).then(([w,e,c,p,ppl])=>{
  PLACES=p||{};
  PEOPLE=(ppl&&ppl.people)||{}; PLINKS=(ppl&&ppl.links)||[];
  buildAcquaintance();
  COMPOSERS=Object.entries(c).map(([slug,v])=>({slug,...v})).sort((a,b)=>(a.born||0)-(b.born||0));
  const byslug=Object.fromEntries(COMPOSERS.map(x=>[x.slug,x]));
  WORKS=w.map(r=>hydrate(r,byslug)); EDGES=e;
  BYID=new Map(WORKS.map(x=>[x.id,x]));
  document.getElementById("build").textContent=`v${DATA_V} · ${BUILD_AT}`;
  readHash(); draw(); watchScroll();
  /* Cambiar el ancho de la ventana cambia cuántas columnas caben, así que la tabla se
     rehace. Con retardo: redibujar 300 filas en cada píxel de un arrastre es un derroche
     y se nota. */
  let rz;
  addEventListener("resize", () => { clearTimeout(rz); rz=setTimeout(renderStage, 180); });
  /* el estado inicial SUSTITUYE la entrada en blanco con la que llega el navegador, en
     vez de añadirse detrás: si no, el primer atrás no hacía nada visible. */
  writeHashFirst();
  /* una obra pedida en la URL se abre al cargar, para que un enlace compartido a una
     ficha lleve a la ficha y no solo al catálogo filtrado */
  if(state.sel) openRec(state.sel);
});

/* ---------- lens: el juego ----------
   Víctor pidió un juego de escuchar diez segundos y acertar, en dos modos: quién lo
   escribió y qué obra es. La máquina de preguntas es la misma y solo cambian el enunciado
   y de dónde salen las respuestas falsas.

   LO QUE HACE QUE SEA UN JUEGO Y NO UN TEST DE CULTURA GENERAL, heredado de artatlas, que
   a su vez lo sacó de Batalla de Flores: **la dificultad no está en la pregunta, está en
   las respuestas falsas**. En fácil los distractores son lejanos (Bach contra Ravel); en
   difícil, vecinos (Bach contra Telemann, dos barrocos de teclado). Un distractor lejano
   se descarta sin escuchar, y entonces el juego mide otra cosa.

   Y dos cosas medidas antes de escribir una línea:
     * el fondo está sesgado (Bach 211 ficheros, Scarlatti 151, y diez compositores con
       menos de 10), así que cada compositor entra con CUOTA: sin eso, ante la duda se
       responde Bach y se acierta.
     * los ficheros van de 25 s a 20 min, así que el trozo se toma entre el 15 % y el 70 %
       de la pieza: los primeros segundos suelen ser silencio o aplauso, y el final, una
       caída. Se transmite desde Commons con salto por rango (probado: responde 206), no
       se descarga ni se copia nada. */
const G_OPTS = {facil:4, medio:4, dificil:5};
const G_SEC = 10;
let GAME = null, GPOOL = [], GAUDIO = null, GTIMER = null;
/* false hasta que el lector pulsa "escuchar" por primera vez: hasta entonces el juego
   está mudo. Ver gDraw(). */
let GSOUND = false;
const gstash = {facil:null, medio:null, dificil:null};

function gLoadPool(){
  if(GPOOL.length) return Promise.resolve();
  return fetch(`game.json?v=${DATA_V}`).then(r=>r.json()).then(p=>{ GPOOL=p||[]; });
}
const gShuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const gPick = a => a[Math.floor(Math.random()*a.length)];

/* CUOTA POR COMPOSITOR. Bach tiene 211 fragmentos y Purcell 1: sin topar, cuatro de cada
   diez preguntas serían de Bach y el jugador aprendería el bombo en vez de la música. El
   tope es la mediana de los que tienen algo, así que nadie desaparece y nadie manda. */
/* CADA MODO USA LO QUE PUEDE AFIRMAR.
   306 de los 880 fragmentos están ligados a su obra porque **la fuente lo dice** (`P51`
   de Wikidata); los otros 574, porque encontramos el número de catálogo en el nombre del
   fichero, que es una inferencia nuestra y cada registro lo declara.

   El COMPOSITOR es seguro en los dos casos: la cosecha de Commons va por compositor. La
   OBRA no. Así que "¿quién?" juega con los 880 y "¿qué obra?" solo con los 306, porque un
   juego que le dice a alguien que ha fallado cuando ha acertado no es un juego difícil,
   es un juego que miente. Quedan 229 obras y 23 compositores, que llega de sobra.
   2026-09-15. */
function gBalanced(){
  const pool=GAME.mode==="obra" ? GPOOL.filter(g=>!g.m) : GPOOL;
  const by=new Map();
  pool.forEach(g=>{ if(!by.has(g.c)) by.set(g.c,[]); by.get(g.c).push(g); });
  const sizes=[...by.values()].map(v=>v.length).sort((a,b)=>a-b);
  const cap=Math.max(6, sizes[Math.floor(sizes.length/2)]);
  const out=[];
  by.forEach(v=>out.push(...gShuffle(v).slice(0,cap)));
  return out;
}
/* Cerca o lejos, con los ejes que el atlas ya tiene: período (por las fechas del
   compositor) y plantilla. Dos del mismo período y la misma plantilla son vecinos. */
const gPeriod = slug => { const c=COMPOSERS.find(x=>x.slug===slug); return c?period(c):"?"; };
function gTiers(target, all, keyOf){
  const tp=gPeriod(target.c), tf=target.fc||"";
  const near=[], mid=[], far=[];
  all.forEach(g=>{ const k=keyOf(g); if(k===keyOf(target)) return;
    const sp=gPeriod(g.c)===tp, sf=(g.fc||"")===tf;
    (sp&&sf?near:sp||sf?mid:far).push(g); });
  return GAME.diff==="dificil"?[near,mid,far]:GAME.diff==="medio"?[mid,near,far]:[far,mid,near];
}
function gTake(tiers,n,keyOf){
  const out=[], seen=new Set();
  for(const t of tiers){ for(const g of gShuffle(t)){
      if(out.length>=n) break;
      const k=keyOf(g); if(seen.has(k)) continue; seen.add(k); out.push(g); }
    if(out.length>=n) break; }
  return out;
}
function gNewQuestion(){
  const pool=gBalanced();
  if(!pool.length){ GAME.q=null; return; }
  const target=gPick(pool);
  const n=G_OPTS[GAME.diff]-1;
  let opts, prompt, answer;
  if(GAME.mode==="quien"){
    const keyOf=g=>g.c;
    opts=gTake(gTiers(target,pool,keyOf),n,keyOf).map(g=>({text:gName(g.c),correct:false}));
    opts.push({text:gName(target.c),correct:true});
    prompt=t("Who wrote this?");
    answer=gName(target.c);
  }else{
    const keyOf=g=>g.i;
    /* para "qué obra" los vecinos son del MISMO compositor: preguntar entre obras de
       cuatro autores distintos es preguntar el autor otra vez, con más pasos. */
    const same=pool.filter(g=>g.c===target.c&&g.i!==target.i);
    const tiers=GAME.diff==="facil"?[pool.filter(g=>g.c!==target.c),same]
               :GAME.diff==="medio"?[same,pool.filter(g=>g.c!==target.c)]
               :[same.filter(g=>(g.fo||"")===(target.fo||"")),same,pool];
    opts=gTake(tiers,n,keyOf).map(g=>({text:g.t||g.i,correct:false}));
    opts.push({text:target.t||target.i,correct:true});
    prompt=t("Which work is this?");
    answer=target.t||target.i;
  }
  const from=Math.floor(target.s*(0.15+Math.random()*0.55));
  GAME.q={target, opts:gShuffle(opts), prompt, answer, from};
  GAME.answered=false; GAME.picked=null;
}
const gName = slug => (COMPOSERS.find(x=>x.slug===slug)||{}).name||slug;

function gStop(){ if(GTIMER){clearTimeout(GTIMER); GTIMER=null;}
  if(GAUDIO){ GAUDIO.pause(); GAUDIO=null; } }
function gPlay(){
  const q=GAME&&GAME.q; if(!q) return;
  gStop();
  const a=new Audio(q.target.u); GAUDIO=a; a.preload="auto";
  const start=()=>{ try{ a.currentTime=q.from; }catch(e){} a.play().catch(()=>{}); };
  a.addEventListener("loadedmetadata",start,{once:true});
  if(a.readyState>=1) start();
  GTIMER=setTimeout(()=>{ if(GAUDIO===a){ a.pause(); } }, G_SEC*1000+400);
  const b=document.getElementById("g-play"); if(b) b.textContent="▮▮ "+t("playing");
  setTimeout(()=>{ const x=document.getElementById("g-play"); if(x) x.textContent="▶ "+t("again"); },
             G_SEC*1000+400);
}

/* Cada nivel guarda SU partida, con su pregunta a medias. Si no, cambiar de nivel y
   volver re-sorteaba la pregunta sin contestar, que es una forma de esquivarla: lo
   encontró una jugadora en artatlas y aquí habría pasado igual. */
function gSave(){ gstash[GAME.diff]={right:GAME.right,total:GAME.total,q:GAME.q,
  answered:GAME.answered,picked:GAME.picked,streak:GAME.streak}; }
function gRestore(d){ const s=gstash[d];
  GAME.right=s?s.right:0; GAME.total=s?s.total:0; GAME.q=s?s.q:null;
  GAME.answered=s?s.answered:false; GAME.picked=s?s.picked:null; GAME.streak=s?s.streak:0; }
function gBest(){ try{ return JSON.parse(localStorage.getItem("ma-game")||"{}"); }catch(e){ return {}; } }
function gSaveBest(){ try{ const b=gBest(); const k=GAME.mode+"-"+GAME.diff;
  b[k]=Math.max(b[k]||0, GAME.streak); localStorage.setItem("ma-game",JSON.stringify(b)); }catch(e){} }

/* SE AVISA DE QUE VA A SONAR, Y HAY QUE ACEPTARLO. CADA VEZ.
   Que el juego arrancara mudo no bastaba: el lector seguía sin saber que esto hace ruido
   hasta que lo hacía. Ahora entrar en "Play" enseña primero lo que va a pasar y espera a
   que pulse. Víctor, 2026-09-15.

   CADA VEZ QUE SE ENTRA, no una vez y ya: no se guarda en el navegador a propósito. Quien
   vuelve mañana, o abre el enlace en otro sitio, puede estar en otra habitación y con otra
   gente al lado; una aceptación de hace un mes no dice nada sobre eso. Cuesta una pulsación
   y evita el susto. */
let GREADY = false;
function renderGame(host){
  if(!GAME) GAME={mode:"quien", diff:"medio", right:0, total:0, streak:0, q:null, answered:false, picked:null};
  if(!GREADY){ gGate(host); return; }
  gLoadPool().then(()=>{
    if(!GAME.q) gNewQuestion();
    gDraw(host);
  });
  host.innerHTML=`<div id="game"><p class="g-load">${t("loading the audio pool…")}</p></div>`;
}
function gGate(host){
  host.innerHTML=`<div id="game"><div class="g-gate">
    <h2>${t("Name that music")}</h2>
    <p class="g-gate-warn">🔊 ${t("This game plays sound.")}</p>
    <p>${t("You will hear a ten-second clip and guess who wrote it, or which work it is. Nothing plays until you press the button below, and nothing is downloaded: the audio is streamed from Wikimedia Commons.")}</p>
    <p class="why">${t("Headphones are a kind thought if you are not alone.")}</p>
    <p><button id="g-accept" class="g-play">${t("I'm ready, play sound")}</button></p>
  </div></div>`;
}
function gDraw(host){
  const q=GAME.q;
  if(!q){ host.innerHTML=`<div id="game"><p class="g-load">${t("No playable audio.")}</p></div>`; return; }
  const best=gBest()[GAME.mode+"-"+GAME.diff]||0;
  const pct=GAME.total?Math.round(100*GAME.right/GAME.total):0;
  const w=BYID.get(q.target.i);
  host.innerHTML=`<div id="game">
    <div class="g-bar">
      <span class="g-seg" id="g-mode">${["quien","obra"].map(m=>
        `<button class="gbtn${GAME.mode===m?" on":""}" data-gmode="${m}">${m==="quien"?t("Who?"):t("Which work?")}</button>`).join("")}</span>
      <span class="g-seg" id="g-diff">${["facil","medio","dificil"].map(d=>
        `<button class="gbtn${GAME.diff===d?" on":""}" data-gdiff="${d}">${t({facil:"easy",medio:"medium",dificil:"hard"}[d])}</button>`).join("")}</span>
      <span class="g-score">${GAME.right} ${t("of")} ${GAME.total}${GAME.total?` · ${pct} %`:""}
        · ${t("streak")} <b>${GAME.streak}</b>${best?` · ${t("best")} ${best}`:""}</span>
      <button class="gbtn" id="g-reset">${t("start again")}</button>
    </div>
    <p class="g-prompt">${esc(q.prompt)}</p>
    <p><button id="g-play" class="g-play">▶ ${t("listen")} ${G_SEC} s</button>
       <span class="why">${GSOUND
         ? t("streamed from Wikimedia Commons, nothing is downloaded")
         : t("the game starts silent: press to hear the clip")}</span></p>
    <div class="g-opts">${q.opts.map((o,i)=>{
        let cls=""; if(GAME.answered){ if(o.correct) cls=" ok"; else if(GAME.picked===i) cls=" no"; }
        return `<button class="gopt${cls}" data-gopt="${i}"${GAME.answered?" disabled":""}>`
             + `<span class="gnum">${i+1}</span>${esc(o.text)}</button>`;
      }).join("")}</div>
    ${GAME.answered?`<div class="g-after">
      <p class="g-verdict ${GAME.picked!=null&&q.opts[GAME.picked].correct?"ok":"no"}">
        ${GAME.picked!=null&&q.opts[GAME.picked].correct?t("Correct"):t("It was")+" "+esc(q.answer)}</p>
      <p class="g-what">${esc(gName(q.target.c))} · ${esc(q.target.t||"")}
        ${q.target.fo?` · ${esc(q.target.fo)}`:""}
        <span class="why">${t("clip from")} ${Math.floor(q.from/60)}:${String(q.from%60).padStart(2,"0")}
        ${t("of")} ${Math.floor(q.target.s/60)}:${String(q.target.s%60).padStart(2,"0")}${q.target.l?` · ${esc(q.target.l)}`:" · "+t("the source declares no licence")}</span>
        ${q.target.m?`<span class="why">${t("How we know which work this is")}: ${esc(q.target.m)}. ${t("The composer is certain either way: the harvest runs composer by composer.")}</span>`:""}</p>
      <p>${w?`<button class="gbtn" data-goto="${esc(q.target.i)}">${t("open its card")}</button>`:""}
         <button class="gbtn g-next" id="g-next">${t("next")} ▸</button></p>
    </div>`:""}
    <p class="g-note"><b>${t("Keyboard")}:</b> ${t("1-N answer, space replays the clip, Enter moves on.").replace("N", q.opts.length)}<br>
      ${t("The difficulty is not in the question, it is in the wrong answers: on <b>easy</b> they come from another period and another scoring, on <b>hard</b> they are neighbours. Every composer enters with a quota, so you cannot win by always naming whoever has the most recordings.")}<br>
      ${GAME.mode==="obra"
        ? t("This mode plays only the recordings the <b>source ties to their work</b>: in the others we worked the work out from the file name, and with that the game could tell you that you got it wrong when you got it right.")
        : t("This mode plays every recording: the composer is certain in all of them, because the harvest runs composer by composer.")}</p>
  </div>`;
  /* EL JUEGO NO SUENA SOLO AL ENTRAR.
     Arrancaba el audio en cuanto se dibujaba la pregunta, y eso es empezar por lo peor:
     al lector le suena música sin haberla pedido, el navegador puede bloquearla de todas
     formas (autoplay), y si está en una oficina o con alguien al lado, le acabas de
     fastidiar. La primera pregunta espera a que pulse.
     A partir de ahí SÍ suena sola, porque ya lo pidió una vez y el juego va de escuchar:
     hacer clic dos veces por pregunta sería el gesto que sobra. Víctor, 2026-09-15. */
  if(!GAME.answered && GSOUND) gPlay();
}
document.addEventListener("click", e=>{
  const host=document.getElementById("instrument");
  const m=e.target.closest("[data-gmode]");
  if(m){ gSave(); GAME.mode=m.dataset.gmode; GAME.q=null; gNewQuestion(); return gDraw(host); }
  const d=e.target.closest("[data-gdiff]");
  if(d){ gSave(); GAME.diff=d.dataset.gdiff; gRestore(GAME.diff);
         if(!GAME.q) gNewQuestion(); return gDraw(host); }
  if(e.target.closest("#g-accept")){
    GREADY=true; GSOUND=true;          // aceptado: ya puede sonar sin pedirlo otra vez
    return renderGame(document.getElementById("instrument"));
  }
  if(e.target.closest("#g-play")){ GSOUND=true; return gPlay(); }
  if(e.target.closest("#g-next")){ gNewQuestion(); return gDraw(host); }
  if(e.target.closest("#g-reset")){ GAME.right=0; GAME.total=0; GAME.streak=0;
    gNewQuestion(); return gDraw(host); }
  const o=e.target.closest("[data-gopt]");
  if(o && GAME && !GAME.answered){
    const i=+o.dataset.gopt, ok=GAME.q.opts[i].correct;
    GAME.answered=true; GAME.picked=i; GAME.total++;
    if(ok){ GAME.right++; GAME.streak++; gSaveBest(); } else GAME.streak=0;
    gStop();
    return gDraw(host);
  }
});

/* ---------- grafo: quién trató a quién ----------
   Víctor pidió "un grafo de todos con todos". Con las 365 personas que hacen falta para
   conectarlos sería ilegible, y con solo nuestros 31 habría ocho aristas. Así que: los 31
   en un eje de año de nacimiento, y un arco entre dos cuando se alcanzan por relaciones
   documentadas, con el número de pasos encima. El eje hace visible lo que importa, que es
   que casi nadie pudo tratar a nadie de otro siglo: los arcos cortos son maestros y
   alumnos, y los largos pasan por gente que no está en el atlas.

   No dice "se conocieron". Dice qué consta, y el camino entero está en el tooltip para
   que se pueda comprobar. Ver harvest_people.py. */
function renderAcq(host){
  const live=COMPOSERS.filter(c=>c.qid&&chosen(c.slug)&&ADJ.has(c.qid));
  if(live.length<2){ host.innerHTML=`<p class="hint">${t("At least two composers with a recorded relation are needed. Try clearing the composer filter.")}</p>`; return; }
  const pairs=[];
  for(let i=0;i<live.length;i++) for(let j=i+1;j<live.length;j++){
    const p=acqPath(live[i].qid,live[j].qid);
    if(p) pairs.push({a:live[i],b:live[j],path:p,steps:p.length-1});
  }
  if(!pairs.length){ host.innerHTML=`<p class="hint">${t("No pair among the chosen composers is reachable by recorded relations.")}</p>`; return; }
  const ys=live.map(c=>c.born||0).filter(Boolean);
  const y0=Math.min(...ys), y1=Math.max(...ys);
  const W=980, PAD=70, BASE=330, span=Math.max(1,y1-y0);
  const X=c=>PAD+((c.born||y0)-y0)/span*(W-2*PAD);
  const maxS=Math.max(...pairs.map(p=>p.steps));
  const arcs=pairs.sort((a,b)=>b.steps-a.steps).map(p=>{
    const x1=X(p.a), x2=X(p.b), h=40+((p.steps-1)/Math.max(1,maxS-1))*210;
    const names=p.path.map(q=>(PEOPLE[q]||{}).label||q).join(" → ");
    return `<path class="acq s${Math.min(p.steps,5)}" data-a="${esc(p.a.slug)}" data-b="${esc(p.b.slug)}"
      d="M${x1} ${BASE} Q${(x1+x2)/2} ${BASE-h} ${x2} ${BASE}"><title>${esc(p.a.name)} y ${esc(p.b.name)}: ${p.steps} paso${p.steps>1?"s":""}
${esc(names)}</title></path>`;}).join("");
  /* LOS NOMBRES SE PISABAN. El eje es de años y los compositores se amontonan justo donde
     está lo interesante: entre 1800 y 1850 caben quince. Mover los puntos a un reparto
     regular haría legible el dibujo y mentiría sobre las fechas, que es lo que el eje
     existe para contar, así que los puntos se quedan donde están y las ETIQUETAS se
     escalonan en dos alturas, con una guía hasta su punto cuando la etiqueta se ha bajado. */
  const order=live.slice().sort((a,b)=>X(a)-X(b));
  const rank=new Map(order.map((c,i)=>[c.slug,i]));
  /* tres alturas, no dos: entre 1800 y 1850 hay doce compositores y con dos filas los
     nombres seguían pisándose. */
  const nodes=live.map(c=>{const x=X(c), lvl=rank.get(c.slug)%3, low=lvl>0, dy=14+lvl*20;
    return `<g class="anode" data-comp-open="${esc(c.slug)}">
      ${low?`<line x1="${x}" y1="${BASE+4}" x2="${x}" y2="${BASE+dy-6}" stroke="#d8c7a6" stroke-dasharray="1 2"/>`:""}
      <circle cx="${x}" cy="${BASE}" r="5" fill="${compColour(c.slug)}"/>
      <text x="${x}" y="${BASE+dy}" text-anchor="end" transform="rotate(-55 ${x} ${BASE+dy})">${esc(lastName(c.name))}</text>
      <title>${esc(c.name)} ${c.born||"?"}-${c.died||"?"}</title></g>`;}).join("");
  const ticks=[];
  for(let y=Math.ceil(y0/50)*50; y<=y1; y+=50){
    const x=PAD+(y-y0)/span*(W-2*PAD);
    ticks.push(`<line x1="${x}" y1="${BASE}" x2="${x}" y2="${BASE+5}" stroke="#d8c7a6"/>
      <text class="tick" x="${x}" y="${BASE+-6}" text-anchor="middle">${y}</text>`);
  }
  const direct=pairs.filter(p=>p.steps===1).length;
  host.innerHTML=`<div class="acqwrap">
    <p class="hint">${pairs.length} ${t("of the")} ${live.length*(live.length-1)/2}
      ${t("possible pairs are reachable by relations on record: teacher, student, sibling, spouse, employer.")}
      <b>${direct}</b> ${t("are direct. The height of the arc is the number of steps; hover to see the whole path. This does <b>not</b> say they knew each other: it says what is on record.")}</p>
    <svg viewBox="0 0 ${W} ${BASE+120}" class="acqsvg">
      <line x1="${PAD-10}" y1="${BASE}" x2="${W-PAD+10}" y2="${BASE}" stroke="#e5e0d6"/>
      ${ticks.join("")}${arcs}${nodes}
    </svg></div>`;
}

/* TECLADO EN EL JUEGO. Un juego de escuchar y responder se juega con las manos quietas:
   1-5 contestan, espacio vuelve a poner el fragmento, Enter pasa a la siguiente. Sin esto
   hay que ir con el ratón de la respuesta al botón de siguiente en cada vuelta.
   No mientras se escribe en el filtro, por lo mismo que las flechas de la ficha. */
document.addEventListener("keydown", e => {
  if(state.lens!=="game" || !GAME || !GAME.q) return;
  const el=document.activeElement, tag=(el&&el.tagName||"").toLowerCase();
  if(tag==="input"||tag==="textarea"||tag==="select"||(el&&el.isContentEditable)) return;
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  const host=document.getElementById("instrument");
  if(e.key===" "){ e.preventDefault(); return gPlay(); }
  if((e.key==="Enter"||e.key==="ArrowRight") && GAME.answered){
    e.preventDefault(); gNewQuestion(); return gDraw(host); }
  const n=parseInt(e.key,10);
  if(n>=1 && n<=GAME.q.opts.length && !GAME.answered){
    e.preventDefault();
    const b=document.querySelector(`[data-gopt="${n-1}"]`);
    if(b) b.click();
  }
});
