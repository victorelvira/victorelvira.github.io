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
const DATA_V = "0.26.13";
const BUILD_AT = "2026-09-12 02:42";

let WORKS = [], EDGES = [], COMPOSERS = [], BYID = new Map();
const state = { lens:"table", sub:"works", sel:null, f:{}, comp:new Set(), q:"",
                sort:"work", dir:1, open:new Set(), limit:300, parts:false, doubt:false,
                grouping:"period", tlMode:"composer", tlZoom:1, year:null, qw:[] };

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
function haystack(w){ return w._h || (w._h = fold([w.title,w.composers.join(" "),
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
const FACETS=[
  {id:"form_group",label:"Kind",get:w=>w.form_group?[w.form_group]:[]},
  {id:"forces",label:"Forces",get:w=>w.forces?[w.forces]:[],order:()=>FORCES_ORDER},
  {id:"period",label:"Period",get:PERIOD_OF,order:()=>PERIOD_ORDER},
  {id:"length",label:"Length",get:w=>{const s=seconds(w); if(s==null) return [];
    const b=DURATION_BANDS.find(([,lo,hi])=>s>=lo&&s<hi); return b?[b[0]]:[]},
    order:()=>DURATION_BANDS.map(b=>b[0])},
  {id:"mode",label:"Mode",get:w=>{const k=val(w,"key"); if(!k) return [];
    if(k==="various") return ["several keys"]; const p=keyParts(k); return p?[p.mode]:[]}},
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
    return !want||!want.size||f.get(w).some(v=>want.has(v));});
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

/* ---------- the composer picker (artatlas's painter popover) ---------- */
function renderPicker(){
  const box=document.getElementById("picker");
  if(!box.dataset.built){
    box.innerHTML=`<button id="comp-btn" type="button" aria-expanded="false"></button>
      <div id="comp-pop" hidden>
        <input id="comp-search" class="pop-search" placeholder="Search composers…" autocomplete="off">
        <div class="pop-actions"><button data-act="all">All</button><button data-act="none">None</button></div>
        <ul id="comp-list" class="pop-list"></ul></div>`;
    box.dataset.built="1";
    const btn=box.querySelector("#comp-btn"), pop=box.querySelector("#comp-pop")
          s=box.querySelector("#comp-search");
    btn.addEventListener("click",()=>{ const open=pop.hidden; pop.hidden=!open;
      btn.setAttribute("aria-expanded",String(open));
      if(open){ s.value=""; listComposers(); s.focus(); } });
    document.addEventListener("click",e=>{ if(!pop.hidden&&!box.contains(e.target)){
      pop.hidden=true; btn.setAttribute("aria-expanded","false"); }});
    document.addEventListener("keydown",e=>{ if(e.key==="Escape") pop.hidden=true; });
    s.addEventListener("input",listComposers);
    pop.addEventListener("click",e=>{
      const act=e.target.closest("[data-act]");
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
         <span>${esc(c.name)}</span>
         <span class="pyr">${c.born||""}–${String(c.died||"").slice(2)}</span>
         <span class="pyr">· ${c.n_works||0}</span></label>
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
  {id:"media",label:"Score · audio",cls:"c-media"},
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
function liveCols(){
  const narrow = document.body.classList.contains("rec-open");
  return COLS.filter(c => !(narrow && (c.id==="key" || c.id==="scoring"
                                       || c.id==="date" || c.id==="dur")));
}
const SORTV={ comp:w=>[fold(w.composer)], work:w=>[fold(w.composer),...catSort(w)],
  cat:w=>catSort(w), title:w=>[fold(w.title)],
  key:w=>{const p=keyParts(val(w,"key"));return p?[FIFTHS.indexOf(p.tonic)*2+(p.mode==="minor"?1:0)]:[99]},
  scoring:w=>[fold(ensemble(w)||"~")], date:w=>[year(w)??9999], dur:w=>[seconds(w)??-1],
  src:w=>[-(w.sources||[]).length],
  media:w=>[-((w.media||{}).free_recordings||0), -((w.media||{}).scores||0)] };
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
    const first = esc((w.composers[0]||w.composer_slugs[0]).split(" ").slice(-1)[0]);
    /* one dot, not one per composer: the column is 92px and three dots ate the name */
    return n < 2 ? dot + first
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
  media: w => mediaCell(w),
  src: w => srcDots(w),
};
function rowHTML(w,isPart){
  const cells = liveCols().map(c =>
    `<td class="${c.cls}">${CELL[c.id](w,isPart)}</td>`).join("");
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
function mediaCell(w){
  const bits=[];
  if(w.au) bits.push(`<button class="play" data-play="${esc(w.id)}" title="${w.au} recording${w.au>1?"s":""} you can play here">▶</button>`);
  const m=w.media, u=SRC_URL.imslp(w);
  if(m && u){
    const out=[];
    if(m.scores) out.push(`<span title="${m.scores} free score files on IMSLP">♪${m.scores}</span>`);
    if(m.free_recordings) out.push(`<span class="offsite" title="${m.free_recordings} freely-licensed recordings ON IMSLP, opens there">↗${m.free_recordings}</span>`);
    if(out.length) bits.push(`<a href="${u}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${out.join(" ")}</a>`);
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
    (state.sort===c.id?`<span class="dir"> ${state.dir>0?"▲":"▼"}</span>`:"")+`</th>`).join("");
  const colTags = cols.map(c=>`<col class="k-${c.id==="work"?"cat":c.id}">`).join("");
  document.getElementById("stage").innerHTML = tops.length
    ? `<table class="cat">${colTags}<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`+
      (tops.length>slice.length?`<button id="more">Show more, ${tops.length-slice.length} left</button>`:"")
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
  ({fifths:renderFifths, graph:renderGraph, time:renderTimeline}[state.lens])(host);
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
      hover a name to light its links. In Bach “based on” usually names the chorale a cantata
      grows from, which is why hymn writers sit here beside Liszt.</p>`;
}

/* ---------- record panel ---------- */
const ROWS=[["catalogue","Catalogue"],["form","Form"],["key","Key"],["instrumentation","Scoring"]
  ["date_composed","Composed"],["duration_measured","Measured"],["duration_estimated","Estimated"]
  ["dedication","Dedicated to"],["genre","Form"],["period_style","Style"]];
async function openRec(id){
  const w=BYID.get(id); if(!w) return; state.sel=id;
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
    return `<dt>${l}</dt><dd>${esc(Array.isArray(v)?v.join(", "):v)}${mark(w,f)}</dd>`;}).join("");

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
             + esc(ci.name||(w.composers||[])[i]||s2)
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
     ${audioBlock(w)}
     ${dl?`<h4 class="sec">The facts, and who says them</h4><dl>${dl}</dl>`
        :`<p class="nothing">A name and nothing else. The sources have an entry for this
          and attribute it, and then say no more: no key, no date, no scoring. It is
          kept because it exists, not because we know anything about it.</p>`}
     ${kids?`<h4 class="sec">${(w.tree.children||[]).length} pieces</h4><div class="kids">${kids}</div>`:""}
     ${mediaBlock(w)}
     <div class="links">${links}</div>`;
  document.body.classList.add("rec-open");
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
  pool.forEach(w=>f.get(w).forEach(v=>counts.set(v,(counts.get(v)||0)+1)));
  if(!counts.size) return "";
  let items=[...counts.entries()];
  const order=f.order && f.order();
  items.sort(order ? (a,b)=>order.indexOf(a[0])-order.indexOf(b[0]) : (a,b)=>b[1]-a[1]);
  if(limit) items=items.slice(0,limit);
  return `<span class="fg"><span class="lbl">${f.label}</span>`+
    items.map(([v,n])=>`<button class="chip" data-facet="${f.id}" data-v="${esc(v)}"
      aria-pressed="${!!(state.f[f.id]&&state.f[f.id].has(v))}">${esc(v)}<span class="n">${n}</span></button>`).join("")+
    `</span>`;
}
function renderFacets(){
  const pool=WORKS.filter(w=>isWork(w)&&(state.comp.size===0||w.composer_slugs.some(s2=>state.comp.has(s2))));
  let html=FACETS.map(f=>railFor(f,pool)).filter(Boolean).join(`<span class="chip-sep"></span>`);
  const g=state.f.form_group;
  if(g && g.size){
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
  [...FACETS, SUBFACET].forEach(f=>(state.f[f.id]?[...state.f[f.id]]:[]).forEach(v=>
    out.push({k:f.id,v,label:`${f.label.toLowerCase()}: ${v}`})));
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
function renderStage(){ (state.sub==="composers"?renderComposers:renderWorks)(); }
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
function writeHash(){
  const p=[state.lens];
  if(state.sub!=="works") p.push("sub="+state.sub);
  if(state.comp.size) p.push("c="+[...state.comp].join(","));
  if(state.q) p.push("q="+encodeURIComponent(state.q));
  Object.entries(state.f).forEach(([k,s])=>{ if(s&&s.size) p.push(k+"="+[...s].join(",")); });
  history.replaceState(null,"","#"+p.join("/"));
}
function readHash(){
  const h=decodeURIComponent(location.hash.slice(1)); if(!h) return;
  h.split("/").forEach((p,i)=>{
    if(i===0&&["table","fifths","graph","time"].includes(p)) state.lens=p;
    const m=p.match(/^(\w+)=(.*)$/); if(!m) return;
    if(m[1]==="q"){ state.q=fold(m[2]); state.qw=state.q.split(/\s+/).filter(Boolean);
                    document.getElementById("q").value=m[2]; }
    else if(m[1]==="c") state.comp=new Set(m[2].split(","));
    else if(m[1]==="sub") state.sub=m[2];
    else state.f[m[1]]=new Set(m[2].split(","));
  });
  document.querySelectorAll("#view-tabs button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.lens===state.lens));
  document.querySelectorAll("#subtabs button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.sub===state.sub));
}
document.addEventListener("click",e=>{
  const t=e.target;
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
  if(t.closest("#rec .close")){ document.body.classList.remove("rec-open");
    if(PLAYING){ AUDIO.pause(); PLAYING.classList.remove("on"); PLAYING=null; }
    state.sel=null; return renderStage(); }
  const goto=t.closest("[data-goto]"); if(goto) return openRec(goto.dataset.goto);
  const crow=t.closest("tr[data-comp]");
  if(crow){ state.comp=new Set([crow.dataset.comp]); state.sub="works";
    document.querySelectorAll("#subtabs button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.sub==="works"));
    return draw(); }
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
    if(w) try{ localStorage.setItem("musicatlas.recw", String(w)); }catch(_){} });
})();

document.querySelector(".brand").addEventListener("click",e=>{
  e.preventDefault(); history.replaceState(null,"",location.pathname); location.reload(); });

Promise.all([
  fetch(`core.json?v=${DATA_V}`).then(r=>r.json()),
  fetch(`arrangements.json?v=${DATA_V}`).then(r=>r.json()).catch(()=>[]),
  fetch(`composers.json?v=${DATA_V}`).then(r=>r.json()).catch(()=>({}))
]).then(([w,e,c])=>{
  COMPOSERS=Object.entries(c).map(([slug,v])=>({slug,...v})).sort((a,b)=>(a.born||0)-(b.born||0));
  const byslug=Object.fromEntries(COMPOSERS.map(x=>[x.slug,x]));
  WORKS=w.map(r=>hydrate(r,byslug)); EDGES=e;
  BYID=new Map(WORKS.map(x=>[x.id,x]));
  document.getElementById("build").textContent=`v${DATA_V} · ${BUILD_AT}`;
  readHash(); draw();
});
