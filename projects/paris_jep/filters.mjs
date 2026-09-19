export const minutes = value => {const [h,m]=value.split(':').map(Number);return h*60+m;};
export function scheduleMatches(raw, from, to, includeUnknown=false){
  if(!raw || raw==='?' || raw==='selon visite')return includeUnknown;
  if(raw==='—')return false;
  if(!from && !to)return true;
  const start=from?minutes(from):0,end=to?minutes(to):1440;
  if(start>end)return false;
  const ranges=[...raw.matchAll(/(\d{2}:\d{2})-(\d{2}:\d{2})/g)];
  if(ranges.length)return ranges.some(m=>minutes(m[1])<=end && minutes(m[2])>start);
  // A list of visit start times represents discrete appointments, not opening hours.
  if(/^\d{2}:\d{2}(\/\d{2}:\d{2})+$/.test(raw))return raw.split('/').some(t=>minutes(t)>=start && minutes(t)<=end);
  // "journée", "dès", "+" and "jusqu'à" lack precise bounds.
  return includeUnknown;
}
export function filterPlaces(places,{priorities=[],access='',day='any',from='',to='',includeUnknown=false}={}){
  if(from && to && minutes(from)>minutes(to))return [];
  return places.filter(p=>{
    if(priorities.length && !priorities.includes(p.Priority))return false;
    if(access && p.Access!==access)return false;
    if(day==='any' && !from && !to)return true;
    const match=d=>scheduleMatches(p[d],from,to,includeUnknown);
    if(day==='both')return match('Saturday') && match('Sunday');
    if(day==='any')return match('Saturday') || match('Sunday');
    return match(day);
  });
}
