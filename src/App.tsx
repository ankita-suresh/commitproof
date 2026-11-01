import { normalizeDeadlines, displayDeadline, validDate } from './deadlinePolicy.mjs';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Mic, Square, Play, Layers, Check, ArrowRight, FileText, ShieldCheck,
  LayoutGrid, HelpCircle, X, Upload, Send, Trash2, Lock,
  CheckCircle2, ChevronRight, Clock, Link2,
} from 'lucide-react';
import {
  approve, eligible, merge, plain, sampleSources, sampleCandidates,
  sampleRevisions, type Task, type Source, type Card, type Candidate,
} from './domain';

type Session = { unlocked: boolean; available: boolean };
type Analysis = { tasks: Candidate[]; notice: string };

async function api<T>(path: string, body: object | FormData): Promise<T> {
  const isForm = body instanceof FormData;
  const response = await fetch(path, {
    method: 'POST',
    headers: isForm ? {} : { 'Content-Type': 'application/json' },
    body: isForm ? body : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Please try again.');
  return result as T;
}

export default function App() {
  const [view, setView] = useState<'Meeting' | 'Board' | 'Activity'>('Meeting');
  const [sources, setSources] = useState<Source[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const [approval, setApproval] = useState<Task | null>(null);
  const [help, setHelp] = useState(false);
  const [unlock, setUnlock] = useState(false);
  const [code, setCode] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [date, setDate] = useState('');
  const [zone, setZone] = useState('');
  const [paste, setPaste] = useState('');
  const [answer, setAnswer] = useState('');
  const [analyzed, setAnalyzed] = useState('');
  const [mode, setMode] = useState<'live' | 'sample'>('live');
  const [demoStage, setDemoStage] = useState(0);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const objectUrl = useRef('');
  const bytes = useRef(0);
  const uploadInput = useRef<HTMLInputElement>(null);
  const locked = Boolean(busy) || recording;
  const signature = JSON.stringify({ sources, speaker, date, zone });
  const dirty = signature !== analyzed;
  const task = tasks.find(item => item.id === selected) || tasks[0];
  const old = cards.find(card => card.id === task?.id);

  function event(text: string) {
    setEvents(previous => [...previous, `${new Date().toLocaleTimeString()} · ${text}`]);
  }

  useEffect(() => {
    fetch('/api/session')
      .then(response => response.json())
      .then((session: Session) => {
        setUnlocked(session.unlocked);
        setAvailable(session.available);
      })
      .catch(() => {});
    return () => {
      if (recorder.current?.state === 'recording') {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      stream.current?.getTracks().forEach(track => track.stop());
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  function discardAudio() {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = '';
    setAudio(null);
    setAudioUrl('');
    setConsent(false);
  }

  function keepAudio(blob: Blob) {
    discardAudio();
    objectUrl.current = URL.createObjectURL(blob);
    setAudio(blob);
    setAudioUrl(objectUrl.current);
  }

  function reset() {
    if (locked) return;
    setSources([]);
    setTasks([]);
    setCards([]);
    setEvents([]);
    setSelected('');
    setAnalyzed('');
    setPaste('');
    setAnswer('');
    setMode('live');
    setDemoStage(0);
    setSpeaker('');
    setDate('');
    setZone('');
    setView('Meeting');
    setError('');
    discardAudio();
  }

  function loadDemo() {
    if (locked) return;
    discardAudio();
    const initialSources = [sampleSources[0]];
    setSources(initialSources);
    setTasks(merge([], sampleCandidates));
    setCards([]);
    setEvents(['Guided sample started — prewritten transcript and results']);
    setSelected('CP-1');
    setMode('sample');
    setDemoStage(1);
    setSpeaker('Maya');
    setDate('2026-10-26');
    setZone('UTC');
    setAnalyzed(JSON.stringify({ sources: initialSources, speaker: 'Maya', date: '2026-10-26', zone: 'UTC' }));
    setView('Meeting');
    setError('');
    setAnswer('');
  }

  function revealDemoUpdate() {
    setSources(sampleSources);
    setTasks(previous => merge(previous, sampleRevisions));
    setAnalyzed(JSON.stringify({ sources: sampleSources, speaker, date, zone }));
    setDemoStage(2);
    setSelected('CP-1');
    event('Sample: deadline corrected to Monday, dependent on legal approval');
  }

  function revealDemoClarification() {
    const clarification: Source = {
      id: 'demo-clarify', kind: 'clarification',
      text: 'Jordan: Alex will review the security document by Thursday.',
    };
    const nextSources = [...sources, clarification];
    const revised: Candidate[] = sampleRevisions.map(candidate => candidate.id === 'CP-3'
      ? {
          ...candidate, owner: 'Alex', due: '2026-10-29', questions: [],
          evidence: [...candidate.evidence, { sourceId: clarification.id, quote: clarification.text }],
        }
      : candidate);
    setSources(nextSources);
    setTasks(previous => merge(previous, revised));
    setAnalyzed(JSON.stringify({ sources: nextSources, speaker, date, zone }));
    setSelected('CP-3');
    setDemoStage(3);
    event('Sample: clarification supplied security owner and deadline');
  }

  async function record() {
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Please open this app on a secure connection to use your microphone.');
      }
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm']
        .find(type => MediaRecorder.isTypeSupported(type));
      const nextRecorder = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
      recorder.current = nextRecorder;
      chunks.current = [];
      bytes.current = 0;
      nextRecorder.ondataavailable = received => {
        if (!received.data.size) return;
        chunks.current.push(received.data);
        bytes.current += received.data.size;
        if (bytes.current > 9 * 1024 * 1024 && nextRecorder.state === 'recording') {
          nextRecorder.stop();
        }
      };
      nextRecorder.onstop = () => {
        keepAudio(new Blob(chunks.current, { type: nextRecorder.mimeType || 'audio/webm' }));
        stream.current?.getTracks().forEach(track => track.stop());
        setRecording(false);
        event('Recording saved locally for review');
      };
      nextRecorder.onerror = () => {
        stream.current?.getTracks().forEach(track => track.stop());
        setRecording(false);
        setError('Recording interrupted. Please try again.');
      };
      nextRecorder.start(1000);
      setRecording(true);
      setSeconds(0);
    } catch (reason) {
      stream.current?.getTracks().forEach(track => track.stop());
      setError(reason instanceof Error ? reason.message : 'Microphone access failed.');
    }
  }

  async function transcribe() {
    if (!audio || !consent) return;
    if (!unlocked) { setUnlock(true); return; }
    setBusy('Turning speech into text');
    setError('');
    try {
      const body = new FormData();
      body.append('audio', audio, 'recording');
      body.append('consent', 'true');
      const result = await api<{ text: string }>('/api/transcribe', body);
      setSources(previous => [...previous, {
        id: crypto.randomUUID(), kind: 'recording', text: result.text,
      }]);
      event('Recording transcribed');
      setToast('Transcript ready. Review it below, then find commitments.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Transcription failed.');
    } finally {
      setBusy('');
    }
  }

  function confirmCalendarDeadline(value: string) {
    if (!task || locked || dirty || mode !== 'live' || !validDate(value)) return;
    const confirmation: Source = {id: crypto.randomUUID(), kind: 'clarification', text: `Confirmed calendar deadline for task ${task.id}: ${value}. This calendar date replaces earlier deadline expressions for this task.`};
    const nextSources = [...sources, confirmation];
    const result = normalizeDeadlines({tasks: tasks.map(plain), notice: ''}, nextSources, date);
    setSources(nextSources);
    setTasks(previous => merge(previous, result.tasks));
    setAnalyzed(JSON.stringify({sources: nextSources, speaker, date, zone}));
    event(`${task.id}: reviewer confirmed calendar deadline ${value}`);
    setToast('Calendar date confirmed. Review the revised task before approving.');
  }

  async function analyze(nextSources = sources) {
    if (!nextSources.length) return;
    if (!speaker.trim() || !validDate(date) || !zone) { setError('Enter your Name, Date and Timezone before finding commitments.'); return; }
    if (!unlocked) { setUnlock(true); return; }
    setBusy('Finding commitments and checking evidence');
    setError('');
    try {
      const result = await api<Analysis>('/api/analyze', {
        sources: nextSources, previous: tasks.map(plain), speaker,
        meetingDate: date, timezone: zone,
      });
      setTasks(previous => merge(previous, result.tasks));
      setSources(nextSources);
      setAnalyzed(JSON.stringify({ sources: nextSources, speaker, date, zone }));
      event('Commitments reviewed against source quotes');
      setToast(result.tasks.length
        ? `${result.tasks.length} commitments ready to review.`
        : 'No accepted commitments found in this conversation.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Analysis failed.');
    } finally {
      setBusy('');
    }
  }

  async function submitAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('Checking reviewer access');
    setError('');
    try {
      await api<{ unlocked: boolean }>('/api/session', { code });
      setUnlocked(true);
      setCode('');
      setUnlock(false);
      setToast('You’re ready to try your own conversation.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setBusy('');
    }
  }

  function submitClarification() {
    if (!task || !answer.trim()) return;
    if (!unlocked) { setUnlock(true); return; }
    const nextSources: Source[] = [...sources, {
      id: crypto.randomUUID(), kind: 'clarification',
      text: `Clarification for ${task.id}: ${answer.trim()}`,
    }];
    setSources(nextSources);
    setAnswer('');
    event('Clarification added');
    void analyze(nextSources);
  }

  function confirmApproval() {
    if (!approval) return;
    const current = tasks.find(item => item.id === approval.id);
    if (dirty || !current || current.version !== approval.version || !eligible(current)) {
      setError('This commitment changed. Please review it again.');
      setApproval(null);
      return;
    }
    setCards(previous => approve(previous, approval));
    event(`${approval.id} v${approval.version}: approved to task board`);
    setApproval(null);
    setToast('Approved. Your task board is updated.');
  }

  function status(item: Task): string {
    if (item.withdrawn) return 'Withdrawn';
    if (!eligible(item)) return 'Needs an answer';
    if (cards.some(card => card.id === item.id && card.task.version === item.version)) return 'On your board';
    return 'Ready to approve';
  }

  return (
    <div className="app">
      <aside>
        <div className="brand"><span><Layers size={21} /></span>commitproof</div>
        <div className="workspace"><span className="avatar">C</span><div>Review workspace<small>Conversation → commitment</small></div></div>
        <div className="navlabel">YOUR WORKSPACE</div>
        <button className={`nav ${view === 'Meeting' ? 'active' : ''}`} onClick={() => setView('Meeting')}><Mic size={17} /> Meeting</button>
        <button className={`nav ${view === 'Board' ? 'active' : ''}`} onClick={() => setView('Board')}><LayoutGrid size={17} /> Task board<b>{cards.length}</b></button>
        <button className={`nav ${view === 'Activity' ? 'active' : ''}`} onClick={() => setView('Activity')}><ShieldCheck size={17} /> Activity</button>
        <button className="nav" onClick={() => setHelp(true)}><HelpCircle size={17} /> How it works</button>
        <div className="sidecard"><ShieldCheck /><h3>Evidence before action.</h3><p>Every commitment has a source. Every change gets a review.</p><button onClick={loadDemo} disabled={locked}>Take the 2-minute tour<ArrowRight size={13} /></button></div>
      </aside>
      <main>
        <header><span>Workspace <i>/</i> {view === 'Board' ? 'Task board' : view === 'Activity' ? 'Activity' : 'Meeting review'}</span><div className="headeractions"><button className="icon" title="Help" onClick={() => setHelp(true)}><HelpCircle size={17} /></button></div></header>
        <section className="heading"><div><div className="eyebrow">FROM CONVERSATION TO COMMITMENT</div><h1>Good conversations.<br /><em>Clear next steps.</em></h1><p>See what was promised, resolve what’s missing, and approve what happens next.</p></div><button className="secondary" disabled={locked} onClick={loadDemo}><Play size={14} /> Try guided demo</button></section>
        <div className="steps">
          <span className={!sources.length ? 'current' : ''}><b>1</b> Capture</span><ChevronRight size={14} />
          <span className={sources.length > 0 && !tasks.length ? 'current' : ''}><b>2</b> Review</span><ChevronRight size={14} />
          <span className={tasks.length > 0 && !cards.length ? 'current' : ''}><b>3</b> Clarify & approve</span><ChevronRight size={14} />
          <span className={cards.length > 0 ? 'current' : ''}><b>4</b> Follow through</span>
        </div>
        {error && <div className="error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss"><X size={15} /></button></div>}
        {busy && <div className="busy" role="status"><span className="spinner" />{busy}…</div>}
        {mode === 'sample' && (
          <div className="tour">
            <div><span className="badge">GUIDED SAMPLE · PREWRITTEN RESULTS</span><h3>{demoStage === 1 ? 'First, approve Maya’s proposal.' : demoStage === 2 ? 'A promise changed. See the difference.' : 'A missing owner and deadline, resolved.'}</h3><p>{demoStage === 1 ? 'Select the proposal and approve it. Then reveal a later correction to see why task versions matter.' : demoStage === 2 ? 'Friday became Monday, with legal approval required. The board keeps your earlier decision until you approve the update.' : 'The sample clarification names Alex and Thursday. Review the evidence, approve it, then open your board.'}</p></div>
            <div className="tourbuttons">
              {demoStage === 1 && <button className="primary" disabled={!cards.some(card => card.id === 'CP-1') || locked} onClick={revealDemoUpdate}>Reveal meeting update<ArrowRight size={14} /></button>}
              {demoStage === 2 && <button className="primary" disabled={locked} onClick={revealDemoClarification}>Show sample clarification<ArrowRight size={14} /></button>}
              {demoStage === 3 && <button className="primary" onClick={() => setView('Board')}>Open task board<ArrowRight size={14} /></button>}
              <button className="textbutton" disabled={locked} onClick={reset}>Try your own · starts a new session</button>
            </div>
          </div>
        )}

        {view === 'Meeting' && (
          <>
            {mode === 'live' && (
              <section className="surface capture">
                <div className="sectiontitle"><div><h2><Mic size={17} /> Start with a conversation</h2><p>Record a short voice note, upload audio, or paste meeting text.</p></div>{!unlocked && <button className="secondary" onClick={() => setUnlock(true)}><Lock size={13} /> Reviewer access</button>}</div>
                <div className="metadata">
                  <label>Name<input value={speaker} placeholder="Name" autoComplete="off" disabled={locked} onChange={event => setSpeaker(event.target.value)} /></label>
                  <MeetingDate value={date} onChange={setDate} disabled={locked} />
                  <TimezoneSelect value={zone} onChange={setZone} disabled={locked} />
                </div>
                <div className="recordbar">
                  <div className={`micvisual ${recording ? 'pulse' : ''}`}><Mic size={22} /></div>
                  <div><strong>{recording ? 'Listening to your microphone' : audio ? 'Ready to listen back' : 'Speak naturally. We’ll help with the next steps.'}</strong><small>{recording ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} elapsed` : 'Try: “I’ll send the proposal Friday. Actually, Monday, if legal approves.”'}</small></div>
                  {recording ? <button className="primary" onClick={() => recorder.current?.stop()}><Square size={14} /> Stop recording</button> : <button className="primary" disabled={Boolean(busy)} onClick={() => void record()}><Mic size={15} /> Record</button>}
                  <button className="secondary" disabled={locked} onClick={() => uploadInput.current?.click()}><Upload size={14} /> Upload</button>
                  <input hidden type="file" accept="audio/*" ref={uploadInput} onChange={event => {
                    const file = event.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) setError('Please use an audio file smaller than 10 MB.');
                      else keepAudio(file);
                    }
                    event.target.value = '';
                  }} />
                </div>
                {audio && <div className="audio"><audio controls src={audioUrl} /><button className="icon" disabled={locked} onClick={discardAudio} title="Discard recording"><Trash2 size={16} /></button><label className="consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /> I have permission to record and send this audio for transcription.</label><button className="primary" disabled={locked || !consent} onClick={() => void transcribe()}>Create transcript<ArrowRight size={14} /></button><p className="fine">Nothing is uploaded until you click Create transcript. Processing uses Groq. <button className="textbutton" onClick={() => setHelp(true)}>Privacy details</button></p></div>}
                <details><summary>Paste a transcript instead</summary><textarea value={paste} disabled={locked} onChange={event => setPaste(event.target.value)} placeholder="Paste the conversation here. Names help identify who agreed to what." /><button className="secondary" disabled={locked || !paste.trim()} onClick={() => {
                  setSources(previous => [...previous, { id: crypto.randomUUID(), text: paste.trim(), kind: 'transcript' }]);
                  setPaste('');
                  event('Meeting text added');
                }}>Add meeting text</button></details>
              </section>
            )}
            {sources.length > 0 && <details className="sourcepanel" open={!tasks.length}><summary>Meeting transcript · {sources.length} {sources.length === 1 ? 'source' : 'sources'}</summary>{sources.map((source, index) => <div className="source" key={source.id}><small>SOURCE {index + 1} · {source.kind.toUpperCase()}</small><p>{source.text}</p></div>)}</details>}
            <div className="reviewheading"><h2>Commitments <span>{tasks.length}</span></h2>{mode === 'live' && <button className="primary" disabled={locked || !sources.length} onClick={() => void analyze()}><Layers size={15} /> {tasks.length ? 'Review latest conversation' : 'Find commitments'}</button>}</div>
            {mode === 'live' && sources.length > 0 && <p className="fine">Find commitments sends the meeting text and date to the AI processing service. Review suggestions before approving.</p>}
            {dirty && tasks.length > 0 && <div className="warning">New information is waiting to be reviewed. Refresh commitments before approving.</div>}
            <div className="desk">
              <section className="tasklist">
                {!tasks.length && <div className="empty"><FileText size={25} /><h3>Your next steps start here.</h3><p>{sources.length ? 'Click Find commitments to identify accepted promises.' : 'Add a conversation above or take the guided demo.'}</p>{!sources.length && <button className="secondary" onClick={loadDemo}>Show me an example</button>}</div>}
                {tasks.map(item => <button key={item.id} className={`taskrow ${task?.id === item.id ? 'selected' : ''}`} onClick={() => { setSelected(item.id); setAnswer(''); }}><div className="rowtop"><span>{item.id} · v{item.version}</span><i className={eligible(item) ? 'greenbadge' : 'amberbadge'}>{status(item)}</i></div><strong>{item.title}</strong><p>{item.owner || 'Who owns this?'} · {item.due || 'When is it due?'}</p>{item.dependency && <small>Waiting on {item.dependency.toLowerCase()}</small>}</button>)}
                <div className="listtip"><ShieldCheck size={17} /><p>No guessed owners. No invented deadlines. Your approval is the final step.</p></div>
              </section>
              <section className="detail">
                {task ? <>
                  <div className="eyebrow">COMMITMENT / VERSION {task.version}</div>
                  <h2 className="tasktitle">{task.title}</h2>
                  <div className="properties"><div><small>OWNER</small><strong>{task.owner || 'Needs an answer'}</strong></div><div><small>DUE</small><strong>{displayDeadline(task.due)}</strong></div></div>
                  {task.dependency && <div className="dependency"><Clock size={17} /><div><strong>Waiting on {task.dependency.toLowerCase()}</strong><p>This promise depends on another step. It will stay in Waiting until you confirm that step is complete.</p></div></div>}
                  {task.withdrawn && <div className="warning">This commitment was withdrawn. {old ? 'The previous board item is kept for your review.' : 'It cannot be approved.'}</div>}
                  {task.warnings.map((warning, index) => <div className="warning" key={index}>{warning}</div>)}
                  {old && old.task.version !== task.version && <div className="diff"><div><small>ON YOUR BOARD · v{old.task.version}</small><strong>{displayDeadline(old.task.due)}</strong><p>{old.task.dependency || 'No dependency'}</p></div><ArrowRight size={16} /><div><small>UPDATED PROMISE · v{task.version}</small><strong>{displayDeadline(task.due)}</strong><p>{task.dependency || 'No dependency'}</p></div></div>}
                  {mode === 'live' && <section className="clarify"><h3>Confirm the calendar deadline</h3><p>Choose the intended calendar date, then confirm.</p><CalendarDeadline key={`${task.id}:${task.version}`} initial={task.due || ''} disabled={locked || dirty} onConfirm={confirmCalendarDeadline} /></section>}
                  <h3 className="subheading"><Link2 size={14} /> What supports this?</h3>
                  {task.evidence.map((evidence, index) => <div className="quote" key={index}><small>SOURCE {sources.findIndex(source => source.id === evidence.sourceId) + 1}</small><p>“{evidence.quote}”</p></div>)}
                  {task.questions.length > 0 && <div className="clarify"><h3>One quick clarification</h3>{task.questions.map((question, index) => <p key={index}>{question}</p>)}</div>}
                  {mode === 'live' && <><label className="answerlabel">Add an answer or correction<textarea value={answer} disabled={locked} onChange={event => setAnswer(event.target.value)} placeholder="Alex will review the security document by Thursday." /></label><button className="secondary" disabled={locked || !answer.trim()} onClick={submitClarification}><Send size={14} /> Update with my answer</button></>}
                  <details><summary>See earlier versions · {task.history.length + 1}</summary>{[...task.history, plain(task)].map((version, index) => <p className="history" key={index}>v{index + 1} · {version.owner || 'Owner unknown'} · {version.due || 'Date unknown'} · {version.dependency || 'No dependency'} {version.withdrawn ? '· withdrawn' : ''}</p>)}</details>
                  <div className="approvalbar"><p>{dirty ? 'Review the latest conversation first.' : !eligible(task) ? 'Answer the open questions first.' : old?.task.version === task.version ? 'This version is on your board.' : 'Approve only when the evidence matches.'}</p><button className="primary" disabled={locked || dirty || !eligible(task) || old?.task.version === task.version} onClick={() => setApproval(structuredClone(task))}><Check size={15} /> {old ? 'Approve update' : 'Approve task'}</button></div>
                </> : <div className="empty tall"><Layers size={30} /><h2>From words to follow-through.</h2><p>Evidence on the page. The decision in your hands.</p></div>}
              </section>
            </div>
          </>
        )}

        {view === 'Board' && <section className="boardarea">
          <div className="boardheading"><div><h2>Your task board</h2><p>Approved commitments, with the exact version you reviewed.</p></div><span className="badge">THIS SESSION</span></div>
          {!cards.length && <div className="surface empty"><LayoutGrid size={30} /><h3>No approved tasks yet.</h3><p>Approve a commitment in Meeting to add it here.</p><button className="secondary" onClick={() => setView('Meeting')}>Review commitments<ArrowRight size={14} /></button></div>}
          <div className="columns">{(['waiting', 'todo', 'done'] as const).map(column => <section className="column" key={column}><h3><span className={`colordot ${column}`} />{column === 'waiting' ? 'Waiting' : column === 'todo' ? 'To do' : 'Done'}<b>{cards.filter(card => card.status === column).length}</b></h3>
            {cards.filter(card => card.status === column).map(card => {
              const current = tasks.find(item => item.id === card.id);
              const stale = Boolean(current && (current.version !== card.task.version || current.withdrawn));
              return <article className="boardcard" key={card.id}>
                <small>{card.id} · approved v{card.task.version}</small><h4>{card.task.title}</h4><p>{card.task.owner} · {card.task.due}</p>
                {card.task.dependency && <div className="boarddependency"><Clock size={12} />{card.dependencyClearedAt ? 'Dependency confirmed complete' : `Waiting on ${card.task.dependency.toLowerCase()}`}</div>}
                {stale && <div className="warning">{current?.withdrawn ? 'Withdrawn in the conversation. Review this item.' : 'A newer commitment needs your review.'}<button className="textbutton" onClick={() => { setSelected(card.id); setView('Meeting'); }}>Review change<ArrowRight size={12} /></button></div>}
                {card.status === 'waiting' && <button className="secondary" disabled={stale || dirty || locked} onClick={() => {
                  setCards(previous => previous.map(item => item.id === card.id ? { ...item, status: 'todo', dependencyClearedAt: new Date().toISOString() } : item));
                  event(`${card.id}: reviewer confirmed dependency complete`);
                  setToast('Moved to To do. Dependency confirmed by you.');
                }}><Check size={13} /> Dependency is complete</button>}
                {card.status === 'todo' && <button className="secondary" disabled={stale || dirty || locked} onClick={() => {
                  setCards(previous => previous.map(item => item.id === card.id ? { ...item, status: 'done' } : item));
                  event(`${card.id}: marked done`);
                }}><CheckCircle2 size={14} /> Mark done</button>}
                {card.status === 'done' && <button className="textbutton" disabled={stale || dirty || locked} onClick={() => {
                  setCards(previous => previous.map(item => item.id === card.id ? { ...item, status: item.task.dependency && !item.dependencyClearedAt ? 'waiting' : 'todo' } : item));
                  event(`${card.id}: reopened`);
                }}>Reopen task</button>}
              </article>;
            })}
          </section>)}</div>
          <p className="fine">This is CommitProof’s own board, not a Jira integration. Tasks stay in this open session. Refreshing or closing the page clears them.</p>
        </section>}

        {view === 'Activity' && <section className="surface"><h2 className="surfaceheading">Meeting activity</h2><p className="fine">A readable record of the decisions made in this session.</p>{!events.length && <div className="empty">Your recording, clarification and approval steps will appear here.</div>}{events.map((entry, index) => <div className="auditrow" key={index}><span>{String(index + 1).padStart(2, '0')}</span><p>{entry}</p></div>)}</section>}
        <footer><span><span className="dot" /> Session workspace · changes clear on refresh</span><span>Independent portfolio prototype</span></footer>
      </main>

      {toast && <div className="toast" role="status"><CheckCircle2 size={16} />{toast}</div>}

      {approval && <div className="overlay" onKeyDown={event => { if (event.key === 'Escape') setApproval(null); }}>
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="approvaltitle">
          <button className="close" autoFocus onClick={() => setApproval(null)} aria-label="Close"><X /></button>
          <ShieldCheck className="modalicon" size={34} /><div className="eyebrow">YOUR DECISION / EXACT VERSION</div>
          <h2 id="approvaltitle">{cards.some(card => card.id === approval.id) ? 'Approve this update?' : 'Add this task to your board?'}</h2>
          <p>Check the owner, date, and any dependency before you approve.</p>
          <div className="payload"><strong>{approval.title}</strong><p>{approval.owner} · {approval.due}</p>{approval.dependency && <p>Waiting on {approval.dependency.toLowerCase()}</p>}<small>Version {approval.version} · {mode === 'sample' ? 'Guided sample' : 'Your meeting'}</small></div>
          <div className="bar"><button className="secondary" onClick={() => setApproval(null)}>Go back</button><button className="primary" onClick={confirmApproval}><Check size={15} /> Approve</button></div>
        </section>
      </div>}

      {unlock && <div className="overlay" onKeyDown={event => { if (event.key === 'Escape' && !busy) setUnlock(false); }}>
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="unlocktitle">
          <button className="close" disabled={Boolean(busy)} onClick={() => setUnlock(false)} aria-label="Close"><X /></button>
          <Lock size={30} className="modalicon" /><h2 id="unlocktitle">Try it with your own conversation</h2>
          <p>Enter the access code shared with your invitation. The guided demo is always available without a code.</p>
          <form onSubmit={submitAccess}>
            <label className="answerlabel">Reviewer access code<input autoFocus type="password" value={code} onChange={event => setCode(event.target.value)} autoComplete="off" /></label>
            {error && <p className="inlineerror">{error}</p>}
            <button className="primary" disabled={!code || Boolean(busy)}>Continue<ArrowRight size={14} /></button>
          </form>
          {!available && <p className="fine">Live processing may be unavailable on this deployment. You can still explore the sample.</p>}
        </section>
      </div>}

      {help && <div className="overlay" onKeyDown={event => { if (event.key === 'Escape') setHelp(false); }}>
        <section className="modal helpmodal" role="dialog" aria-modal="true" aria-labelledby="helptitle">
          <button className="close" autoFocus onClick={() => setHelp(false)} aria-label="Close"><X /></button>
          <div className="eyebrow">A QUICK GUIDE</div><h2 id="helptitle">From a meeting to a clear next step.</h2><p>CommitProof helps you review promises—not just collect meeting notes.</p>
          <div className="helpstep"><b>1</b><div><h3>Capture the conversation</h3><p>Record your microphone, upload audio under 10 MB, or paste text. Get permission before recording. Create a transcript, then choose Find commitments.</p></div></div>
          <div className="helpstep"><b>2</b><div><h3>Check the evidence</h3><p>Each task shows its owner, date and supporting quotes. If a deadline changes, the approved version stays on the board until you approve the update.</p></div></div>
          <div className="helpstep"><b>3</b><div><h3>Fill in the missing details</h3><p>Answer a question when an owner or deadline is unclear. “Only if legal approves” becomes a dependency, not an unconditional promise.</p></div></div>
          <div className="helpstep"><b>4</b><div><h3>Approve and follow through</h3><p>Approved tasks appear on this app’s board. Dependencies start in Waiting. Confirm a dependency is complete to move the task to To do, then mark it Done.</p></div></div>
          <details><summary>What is the guided demo?</summary><p>A prewritten example demonstrating approval, a changed promise and a clarification. It makes no AI calls. Trying your own starts a new session.</p></details>
          <details><summary>Where does my recording go?</summary><p>Audio stays in your browser until Create transcript. Submitted audio and meeting text are processed by Groq through this app’s server. Nothing is sent to Jira. The app does not save recordings to disk or guarantee zero retention by the provider. Use synthetic or consented data.</p></details>
          <details><summary>What should I know before sharing?</summary><p>This is an independent prototype. AI can misinterpret speech, owners or dates. Quotes are checked for literal presence, not truth. Your name is not verified speaker identification. The app records your microphone, not other applications. Review suggestions before approving.</p></details>
          <details><summary>Are my tasks saved?</summary><p>Tasks, transcript, and activity stay in memory for this session. Refreshing clears them. There is no external task-tool connection.</p></details>
          <div className="bar"><button className="primary" onClick={() => setHelp(false)}>Got it<Check size={14} /></button></div>
        </section>
      </div>}
    </div>
  );
}

function CalendarDeadline({initial,disabled,onConfirm}:{initial:string;disabled:boolean;onConfirm:(value:string)=>void}) {
  const [value,setValue]=useState(initial);
  return <div><input aria-label="Calendar deadline" type="date" value={value} disabled={disabled} onChange={event=>setValue(event.target.value)} style={{border:'1px solid #dfe8d4',borderRadius:6,padding:10,background:'#fff',color:'#526e43',margin:'10px 10px 10px 0'}}/>{validDate(value)&&<p>{displayDeadline(value)}</p>}<button className="secondary" disabled={disabled||!validDate(value)} onClick={()=>onConfirm(value)}>Use this date</button></div>;
}

function MeetingDate({value,onChange,disabled}:{value:string;onChange:(date:string)=>void;disabled:boolean}) {
  return <div style={{minWidth:0}}><label htmlFor="meeting-date" style={{display:'block',fontSize:8,letterSpacing:'.8px',color:'#92a080',textTransform:'uppercase'}}>Date</label>
    <div style={{position:'relative',marginTop:7}}>
      <input id="meeting-date" aria-label="Date" type="date" value={value} disabled={disabled} onChange={event=>onChange(event.target.value)} style={{display:'block',width:'100%',border:'1px solid #e2e8db',borderRadius:6,padding:'9px 10px',background:'#fafcf7',color:value?'#6e835d':'transparent',fontSize:11,marginTop:0}}/>
      {!value&&<span aria-hidden="true" style={{position:'absolute',left:11,top:10,pointerEvents:'none',fontSize:11,color:'#8f9c80',background:'#fafcf7',paddingRight:8}}>Date</span>}
    </div>
  </div>;
}

type ZoneOption={value:string;label:string;search:string};
function timezoneOptions():ZoneOption[] {
  // Fixed offsets, not location-based automatic daylight-saving rules.
  const names:Record<number,string>={[-12]:'UTC−12',[-11]:'SST',[-10]:'HST',[-9]:'AKST',[-8]:'PST',[-7]:'MST / PDT',[-6]:'CST (US) / MDT',[-5]:'EST / CDT',[-4]:'AST / EDT',[-3]:'BRT',[-2]:'UTC−02',[-1]:'UTC−01',[0]:'UTC / GMT',[1]:'CET',[2]:'EET / CEST',[3]:'EAT / AST (Arabia)',[4]:'GST',[5]:'PKT',[6]:'BST (Bangladesh)',[7]:'ICT',[8]:'SGT / CST (China)',[9]:'JST / KST',[10]:'AEST',[11]:'AEDT',[12]:'NZST',[13]:'NZDT',[14]:'UTC+14'};
  const options:ZoneOption[]=[];
  for(let offset=-12;offset<=14;offset++) {
    const value=offset===0?'UTC':`Etc/GMT${offset>0?'-':'+'}${Math.abs(offset)}`;
    const utc=offset===0?'UTC+00:00':`UTC${offset<0?'−':'+'}${String(Math.abs(offset)).padStart(2,'0')}:00`;
    options.push({value,label:`${names[offset]} — ${utc}`,search:`${names[offset]} ${utc} UTC${offset>=0?'+':''}${offset} ${offset>=0?'+':''}${offset}`});
  }
  options.push(
    {value:'Asia/Tehran',label:'IRST — UTC+03:30',search:'IRST Iran Tehran UTC+03:30 +3:30'},
    {value:'Asia/Kabul',label:'AFT — UTC+04:30',search:'AFT Afghanistan Kabul UTC+04:30 +4:30'},
    {value:'Asia/Kolkata',label:'IST (India) — UTC+05:30',search:'IST India Kolkata Calcutta UTC+05:30 +5:30'},
    {value:'Asia/Kathmandu',label:'NPT — UTC+05:45',search:'NPT Nepal Kathmandu UTC+05:45 +5:45'},
    {value:'Asia/Yangon',label:'MMT — UTC+06:30',search:'MMT Myanmar Yangon UTC+06:30 +6:30'},
    {value:'Australia/Darwin',label:'ACST — UTC+09:30',search:'ACST Australia Darwin UTC+09:30 +9:30'},
    {value:'Pacific/Marquesas',label:'MART — UTC−09:30',search:'MART Marquesas UTC-09:30 -9:30'}
  );
  return options;
}

function TimezoneSelect({value,onChange,disabled}:{value:string;onChange:(value:string)=>void;disabled:boolean}) {
  const options=timezoneOptions();
  const selected=options.find(option=>option.value===value);
  const [query,setQuery]=useState(selected?.label||'');
  const [open,setOpen]=useState(false);
  const [active,setActive]=useState(0);
  const root=useRef<HTMLDivElement>(null);
  const normalize=(s:string)=>s.toLowerCase().replaceAll('−','-').replace(/\s+/g,' ').trim();
  const terms=normalize(query).split(' ').filter(Boolean);
  const matches=options.filter(option=>terms.every(term=>normalize(option.label+' '+option.search).includes(term)));
  useEffect(()=>{setQuery(timezoneOptions().find(option=>option.value===value)?.label||'')},[value]);
  useEffect(()=>{if(disabled){setOpen(false);setQuery(timezoneOptions().find(option=>option.value===value)?.label||'')}},[disabled,value]);
  useEffect(()=>{
    function outside(event:PointerEvent){if(!root.current?.contains(event.target as Node)){setOpen(false);setQuery(timezoneOptions().find(option=>option.value===value)?.label||'')}}
    document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);
  },[value]);
  useEffect(()=>{if(open)document.getElementById(`tz-option-${active}`)?.scrollIntoView({block:'nearest'})},[open,active]);
  function choose(option:ZoneOption){onChange(option.value);setQuery(option.label);setOpen(false);setActive(0)}
  function close(){setOpen(false);setQuery(selected?.label||'')}
  return <div ref={root} style={{position:'relative',minWidth:0}}>
    <label htmlFor="meeting-timezone" style={{display:'block',fontSize:8,letterSpacing:'.8px',color:'#92a080',textTransform:'uppercase'}}>Timezone</label>
    <input id="meeting-timezone" role="combobox" aria-expanded={open} aria-controls="timezone-options" aria-autocomplete="list" aria-activedescendant={open&&matches[active]?`tz-option-${active}`:undefined} value={query} disabled={disabled} autoComplete="off" spellCheck={false} placeholder="Timezone"
      onFocus={()=>{setQuery('');setOpen(true);setActive(0)}} onChange={event=>{setQuery(event.target.value);setOpen(true);setActive(0)}} onBlur={close}
      onKeyDown={event=>{
        if(event.key==='ArrowDown'){event.preventDefault();if(!open){setQuery('');setOpen(true);setActive(0)}else setActive(index=>Math.min(index+1,Math.max(0,matches.length-1)))}
        else if(event.key==='ArrowUp'){event.preventDefault();if(!open){setQuery('');setOpen(true);setActive(0)}else setActive(index=>Math.max(0,index-1))}
        else if(event.key==='Enter'&&open){event.preventDefault();if(matches[active])choose(matches[active])}
        else if(event.key==='Escape'){event.preventDefault();close()}
      }} style={{display:'block',width:'100%',marginTop:7,border:'1px solid #dfe8d4',borderRadius:6,padding:'9px 10px',background:'#fafcf7',color:'#6e835d',fontSize:11}}/>
    {open&&<div style={{position:'absolute',zIndex:50,top:57,left:0,width:'max(100%, 260px)',maxWidth:'min(360px,75vw)',background:'#fff',border:'1px solid #d9e5cb',borderRadius:9,boxShadow:'0 12px 28px #243a2520',overflow:'hidden'}}>
      <div style={{padding:'10px 12px',fontSize:9,color:'#91a17f',background:'#f6f9f1'}}>Search EST, PST, IST, +5 or UTC. Offsets are fixed; choose daylight time when applicable.</div>
      <ul id="timezone-options" role="listbox" aria-label="Timezones" style={{listStyle:'none',padding:5,margin:0,maxHeight:250,overflowY:'auto'}}>
        {matches.map((option,index)=><li id={`tz-option-${index}`} key={option.value} role="option" aria-selected={option.value===value} onPointerDown={event=>event.preventDefault()} onMouseMove={()=>setActive(index)} onClick={()=>choose(option)} style={{padding:'10px 9px',borderRadius:5,cursor:'pointer',fontSize:11,color:'#607c4e',background:index===active?'#eef5e5':'transparent',display:'flex',gap:8}}><span style={{flex:1}}>{option.label}</span>{option.value===value&&<span aria-hidden="true">✓</span>}</li>)}
      </ul>
      {!matches.length&&<p style={{padding:'10px 12px',fontSize:10,color:'#98a88a'}}>No matching timezone. Try EST, IST, or +5.</p>}
    </div>}
  </div>;
}
