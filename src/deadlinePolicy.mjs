const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export function validDate(value) {
  if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value+'T12:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10)===value;
}
export function displayDeadline(value) {
  return validDate(value) ? new Intl.DateTimeFormat('en-US',{weekday:'short',year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z')) : 'Not agreed yet';
}
export function nextWeekday(meetingDate, weekday) {
  if(!validDate(meetingDate)) throw Error('Please select a valid meeting date.');
  const d=new Date(meetingDate+'T12:00:00Z');
  d.setUTCDate(d.getUTCDate()+((weekday-d.getUTCDay()+7)%7));
  return d.toISOString().slice(0,10);
}
function lastWeekday(text) {
  const regex=/\b(?:by|on|due(?:\s+(?:on|by))?|make\s+that|deadline(?:\s+(?:is|to|of))?)\s+(?:(?:this|next)\s+)?(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/gi;
  let last=null;
  for(const m of text.matchAll(regex)) {
    const before=text.slice(Math.max(0,m.index-12),m.index);
    if(/\b(?:not|isn't|wasn't)\s*$/i.test(before)) continue;
    last=days.findIndex(d=>d.toLowerCase()===m[1].toLowerCase());
  }
  return last;
}
function related(text) {return /\b(deadline|due|date|when|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(text)}
function preserveOtherQuestions(t) {
  t.questions=t.questions.filter(q=>!related(q));
  t.warnings=t.warnings.filter(w=>!related(w));
  if(!t.owner&&!t.questions.some(q=>/who|owner|assignee/i.test(q))) t.questions.push('Who owns this commitment?');
}
export function normalizeDeadlines(result,sources,meetingDate) {
  if(!validDate(meetingDate)) throw Error('Please select a valid meeting date.');
  return {...result,tasks:result.tasks.map(original=>{
    const t={...original,evidence:[...original.evidence],questions:[...original.questions],warnings:[...original.warnings]};
    const spans=t.evidence.map(e=>({e,index:sources.findIndex(s=>s.id===e.sourceId),offset:sources.find(s=>s.id===e.sourceId)?.text.indexOf(e.quote)??-1})).filter(s=>s.index>=0&&s.offset>=0).sort((a,b)=>a.index-b.index||a.offset-b.offset);
    const prefix=`Confirmed calendar deadline for task ${t.id}: `;
    let confirmed=null;
    sources.forEach((source,index)=>{
      if(source.kind==='clarification'&&source.text.startsWith(prefix)){
        const date=source.text.slice(prefix.length).match(/^(\d{4}-\d{2}-\d{2})\./)?.[1];
        if(date&&validDate(date)) confirmed={source,index,date};
      }
    });
    // Later evidence for this task invalidates its earlier date confirmation.
    if(confirmed && !spans.some(span=>span.index>confirmed.index)) {
      t.due=confirmed.date;
      const quote=prefix+confirmed.date+'.';
      if(!t.evidence.some(e=>e.sourceId===confirmed.source.id&&e.quote===quote)) t.evidence.push({sourceId:confirmed.source.id,quote});
      preserveOtherQuestions(t);
      return t;
    }
    let weekday=null, explicit=null;
    for(const {e} of spans) {
      const w=lastWeekday(e.quote);
      if(w!==null){weekday=w;explicit=null;}
      else {
        const matches=[...e.quote.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map(m=>m[0]).filter(validDate);
        if(matches.length){explicit=matches.at(-1);weekday=null;}
      }
    }
    const hadDate=!!t.due;
    preserveOtherQuestions(t);
    if(weekday!==null) {
      t.due=nextWeekday(meetingDate,weekday);
      t.questions.push(`The final stated weekday is ${days[weekday]}. Confirm the intended calendar date below.`);
      t.warnings.push(`Calendar confirmation required. ${displayDeadline(t.due)} is the first matching weekday on or after the meeting date, not an automatically verified deadline.`);
    } else if(explicit) {
      t.due=explicit;
      t.questions.push('Confirm the intended calendar deadline below.');
      t.warnings.push('Calendar confirmation required before approval.');
    } else {
      t.due=null;
      t.questions.push('What is the exact calendar deadline? Choose a date below.');
      if(hadDate)t.warnings.push('An unsupported model-generated date was removed.');
    }
    return t;
  })};
}
