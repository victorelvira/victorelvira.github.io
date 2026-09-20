export const minutes = value => {const [h,m]=value.split(':').map(Number);return h*60+m;};
// "openAt" answers one question: is there still something here at that hour or later?
// A schedule we cannot read never passes silently: it only counts when includeUnknown is on.
export function scheduleMatches(raw, openAt='', includeUnknown=false){
  if(!raw || raw==='?' || raw==='selon visite')return includeUnknown;
  if(raw==='—')return false;
  if(!openAt)return true;
  const at=minutes(openAt);
  const ranges=[...raw.matchAll(/(\d{2}:\d{2})-(\d{2}:\d{2})/g)];
  if(ranges.length)return ranges.some(m=>minutes(m[2])>at);
  // A list of visit start times represents discrete appointments, not opening hours.
  if(/^\d{2}:\d{2}(\/\d{2}:\d{2})+$/.test(raw))return raw.split('/').some(t=>minutes(t)>=at);
  // "dès 14:00" and "09:30+" open at a known time and close at an unknown one.
  const open=raw.match(/^(?:d[eè]s\s*)?(\d{2}:\d{2})\+?$/);
  if(open)return true;
  // "journée", "jusqu'à" and free text lack usable bounds.
  return includeUnknown;
}
export function filterPlaces(places,{priorities=[],entries=[],hideFull=false,verifiedOnly=false,day='any',openAt='',includeUnknown=false}={}){
  return places.filter(p=>{
    if(priorities.length && !priorities.includes(p.Priority))return false;
    if(entries.length && !entries.includes(p.Entry))return false;
    if(hideFull && p.Full)return false;
    if(verifiedOnly && !p.Verified)return false;
    if(day==='any' && !openAt)return true;
    const match=d=>scheduleMatches(p[d],openAt,includeUnknown);
    if(day==='both')return match('Saturday') && match('Sunday');
    if(day==='any')return match('Saturday') || match('Sunday');
    return match(day);
  });
}
