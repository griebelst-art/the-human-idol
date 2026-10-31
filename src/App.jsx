import React, { useEffect, useMemo, useState } from 'react'
import {
  Crown, Menu, X, ArrowUpRight, Trophy, Users, ScrollText, LockKeyhole,
  LogOut, ShieldCheck, ChevronRight, Star, Sparkles, ClipboardList, Eye,
  EyeOff, Save, LoaderCircle, AlertCircle, CheckCircle2
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from './lib/supabase'

const demoContestants = [
  { id: 'c01', number: '01', name: 'CHAMP CLAWD', country: 'THAILAND', team: 'HOUSE OF ROSE', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=85' },
  { id: 'c02', number: '02', name: 'MARCUS VALE', country: 'UNITED STATES', team: 'HOUSE OF NOIR', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85' },
  { id: 'c03', number: '03', name: 'GARFIELD', country: 'THAILAND', team: 'HOUSE OF ROSE', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85' },
  { id: 'c04', number: '04', name: 'SILA VOSS', country: 'THAILAND', team: 'HOUSE OF GOLD', image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=85' },
  { id: 'c05', number: '05', name: 'EMIL FROST', country: 'SWEDEN', team: 'HOUSE OF NOIR', image: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=900&q=85' },
  { id: 'c06', number: '06', name: 'JADE', country: 'THAILAND', team: 'HOUSE OF GOLD', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85' },
]
const demoEpisodes = [
  { id: 'ep0', code: 'EP.0', title: 'THE FIRST IMPRESSION', status: 'OPEN' },
  { id: 'ep1', code: 'EP.1', title: 'POISONED APPLE', status: 'UPCOMING' },
  { id: 'ep2', code: 'EP.2', title: 'MIRROR, MIRROR', status: 'UPCOMING' },
]
const rubric = [
  { id: 'presentation', label: 'การนำเสนอผลงาน', max: 20 },
  { id: 'concept', label: 'แนวคิดและการตีความ', max: 10 },
  { id: 'execution', label: 'ความคิดสร้างสรรค์', max: 10 },
  { id: 'impact', label: 'ภาพรวมและอิมแพกต์', max: 10 },
]

function App() {
  const [page, setPage] = useState('home')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [contestants, setContestants] = useState(demoContestants)
  const [episodes, setEpisodes] = useState(demoEpisodes)
  const [activeEpisode, setActiveEpisode] = useState('ep0')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const isAdmin = profile?.role === 'admin'
  const isJudge = profile?.role === 'judge' || isAdmin

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || !supabase) { setProfile(null); return }
    // Role is read from server-issued app_metadata, never user-editable user_metadata.
    setProfile({ role: session.user.app_metadata?.role || 'public', email: session.user.email })
  }, [session])

  useEffect(() => {
    if (!supabase) return
    supabase.from('contestants').select('id,number,name,country,team,image_url').eq('published', true).order('number')
      .then(({ data }) => { if (data?.length) setContestants(data.map(c => ({...c, image: c.image_url || ''}))) })
    supabase.from('episodes').select('id,code,title,status').order('sort_order')
      .then(({ data }) => { if (data?.length) { setEpisodes(data); setActiveEpisode(data[0].id) } })
  }, [])

  const go = (next) => { setPage(next); setMobileOpen(false); setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); go('home') }

  return <div className="app-shell">
    <div className="grain" />
    <header className="topbar">
      <button className="brand" onClick={() => go('home')} aria-label="THE HUMAN IDOL home">
        <span className="brand-mark"><Crown size={23}/></span>
        <span><b>THE HUMAN IDOL</b><small>NEW GENERATION</small></span>
      </button>
      <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X/> : <Menu/>}</button>
      <nav className={mobileOpen ? 'nav open' : 'nav'}>
        {[['home','หน้าแรก'],['contestants','ผู้เข้าแข่งขัน'],['results','ผลการแข่งขัน'],['hall','ทำเนียบแชมป์'],['rules','กติกา']].map(([key,label]) =>
          <button key={key} className={page===key?'active':''} onClick={() => go(key)}>{label}</button>)}
        <span className="nav-divider"/>
        <button className={page==='login'?'active':''} onClick={() => go('login')}><LockKeyhole size={14}/> ระบบกรรมการ</button>
      </nav>
    </header>

    <main>
      {page==='home' && <Home go={go} contestants={contestants}/>}
      {page==='contestants' && <Contestants contestants={contestants}/>}
      {page==='results' && <Results episodes={episodes}/>}
      {page==='hall' && <Hall/>}
      {page==='rules' && <Rules/>}
      {page==='login' && <Login go={go} session={session} profile={profile}/>}
      {page==='judge' && <Judge session={session} profile={profile} episodes={episodes} contestants={contestants} activeEpisode={activeEpisode} setActiveEpisode={setActiveEpisode} notice={notice} setNotice={setNotice}/>}
      {page==='admin' && <Admin session={session} profile={profile} episodes={episodes} contestants={contestants} notice={notice} setNotice={setNotice}/>}
    </main>

    <footer className="footer">
      <div className="footer-brand"><Crown size={20}/><span>THE HUMAN IDOL</span></div>
      <p>NEW GENERATION · A STAGE FOR THE UNFORGETTABLE</p>
      <small>© 2026 THE HUMAN IDOL. ALL RIGHTS RESERVED.</small>
    </footer>

    {session && <div className="session-pill"><span className="online-dot"/>{profile?.email || session.user.email}<button onClick={signOut} title="ออกจากระบบ"><LogOut size={14}/></button></div>}
  </div>
}

function SectionHeading({eyebrow,title,sub}) {
  return <div className="section-heading"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{sub && <p>{sub}</p>}<div className="ornament"><i/><Crown size={14}/><i/></div></div>
}
function Home({go,contestants}) {
  return <>
    <section className="hero">
      <div className="hero-backdrop"/>
      <div className="hero-content">
        <div className="eyebrow gold">THE SEARCH FOR THE NEXT ICON</div>
        <h1>THE HUMAN<br/><em>IDOL</em></h1>
        <div className="hero-rule"><span/> SEASON ONE <span/></div>
        <h3>POISONED APPLE</h3>
        <p>BEAUTY IS POWER. PRESENCE IS EVERYTHING.</p>
        <button className="primary-btn" onClick={() => go('contestants')}>MEET THE CONTESTANTS <ArrowUpRight size={16}/></button>
      </div>
      <div className="hero-side-note">A NEW ERA OF ICONS <b>01 / 01</b></div>
      <div className="hero-bottom"><span>EST. 2026</span><span>THE CROWN IS NOT GIVEN. IT IS CLAIMED.</span><span>THAILAND</span></div>
    </section>
    <section className="intro section-wrap">
      <SectionHeading eyebrow="THE LEGACY BEGINS" title="A NEW GENERATION OF ICONS" sub="เวทีแห่งตัวตน ความสามารถ และพลังของการเป็นไอคอน"/>
      <div className="intro-grid">
        <div className="intro-copy"><span className="big-quote">“</span><h3>MORE THAN<br/><em>A BEAUTIFUL FACE.</em></h3><p>การแข่งขันที่มองหาบุคคลผู้มีเอกลักษณ์ ความคิดสร้างสรรค์ ความสามารถในการนำเสนอ และพลังที่ทำให้ทุกสายตาต้องจับจ้อง</p><button className="text-link" onClick={() => go('rules')}>DISCOVER THE RULES <ChevronRight size={15}/></button></div>
        <div className="intro-image"><img src={contestants[1]?.image || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1000&q=85'}/><div className="image-caption">THE FACE OF TOMORROW <span>NO. 02</span></div></div>
      </div>
    </section>
    <section className="featured section-wrap">
      <div className="row-heading"><div><span className="eyebrow">THE CAST</span><h2>MEET THE <em>CONTESTANTS</em></h2></div><button className="text-link" onClick={() => go('contestants')}>VIEW ALL <ArrowUpRight size={15}/></button></div>
      <div className="contestant-grid">{contestants.slice(0,4).map(c=><ContestantCard key={c.id} c={c}/>)}</div>
    </section>
    <section className="cta-band"><div className="cta-inner"><Crown size={28}/><span className="eyebrow gold">THE CROWN AWAITS</span><h2>WHO WILL BECOME<br/><em>THE HUMAN IDOL?</em></h2><button className="outline-btn" onClick={() => go('results')}>EXPLORE THE COMPETITION <ArrowUpRight size={15}/></button></div></section>
  </>
}
function ContestantCard({c}) {
  return <article className="contestant-card"><div className="contestant-photo"><img src={c.image} alt={c.name}/><span className="contestant-number">NO. {c.number}</span><span className="photo-corner"><Crown size={15}/></span></div><div className="contestant-info"><span>{c.team || 'CONTESTANT'}</span><h3>{c.name}</h3><small>{c.country}</small></div></article>
}
function Contestants({contestants}) {
  return <section className="page-section section-wrap"><SectionHeading eyebrow="THE CAST OF SEASON ONE" title="MEET THE CONTESTANTS" sub="ทำความรู้จักผู้เข้าแข่งขันที่พร้อมก้าวสู่การเป็นไอคอน"/><div className="contestant-grid large">{contestants.map(c=><ContestantCard key={c.id} c={c}/>)}</div></section>
}
function Results({episodes}) {
  return <section className="page-section section-wrap"><SectionHeading eyebrow="THE COMPETITION" title="RESULTS & RANKING" sub="ติดตามผลการแข่งขันและอันดับที่ประกาศอย่างเป็นทางการ"/><div className="notice-panel"><Trophy size={27}/><div><h3>OFFICIAL RESULTS</h3><p>ผลคะแนนรวมจะปรากฏเมื่อเจ้าของเว็บไซต์ประกาศผลการแข่งขันแล้วเท่านั้น</p></div></div><div className="episode-list">{episodes.map(e=><div className="episode-row" key={e.id}><span className="episode-code">{e.code}</span><div><b>{e.title}</b><small>{e.status==='OPEN'?'กำลังดำเนินการแข่งขัน':'รอประกาศผล'}</small></div><span className="status">{e.status}</span></div>)}</div></section>
}
function Hall() {
  return <section className="page-section section-wrap"><SectionHeading eyebrow="THE HALL OF FAME" title="LEGENDS NEVER FADE" sub="ทำเนียบผู้ชนะจากทุกซีซันของ THE HUMAN IDOL"/><div className="empty-state"><Crown size={36}/><h3>THE CROWN HOLDERS</h3><p>รายชื่อแชมป์จะถูกเพิ่มโดยผู้ดูแลเว็บไซต์</p></div></section>
}
function Rules() {
  const rules=[['01','SCHEDULE & STRUCTURE','การแข่งขันและภารกิจจะประกาศตามตารางของแต่ละ Episode'],['02','JUDGING & SCORING','กรรมการให้คะแนนตามเกณฑ์ที่กำหนด คะแนนแต่ละหมวดมีคะแนนเต็มแตกต่างกัน'],['03','FAIR PLAY','ห้ามแก้ไขผลคะแนนหรือแทรกแซงระบบโดยไม่ได้รับอนุญาต'],['04','OFFICIAL RESULTS','ผลการแข่งขันที่เผยแพร่ต่อสาธารณะต้องผ่านการยืนยันจากเจ้าของเว็บไซต์']]
  return <section className="page-section section-wrap"><SectionHeading eyebrow="READ BEFORE YOU ENTER" title="RULES & REGULATIONS" sub="กติกาและข้อกำหนดการแข่งขัน"/><div className="rules-list">{rules.map(([n,t,d])=><article key={n}><span>{n}</span><div><h3>{t}</h3><p>{d}</p></div><Crown size={17}/></article>)}</div></section>
}
function Login({go,session,profile}) {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  useEffect(()=>{if(session) go(profile?.role==='admin'?'admin':profile?.role==='judge'?'judge':'home')},[session,profile])
  const submit=async e=>{e.preventDefault();setError('');if(!supabase){setError('ยังไม่ได้ตั้งค่า Supabase กรุณาทำตาม README ก่อนใช้งานระบบเข้าสู่ระบบ');return}setBusy(true);const {error}=await supabase.auth.signInWithPassword({email,password});setBusy(false);if(error)setError('เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน')}
  return <section className="login-page"><div className="login-art"><Crown size={46}/><span className="eyebrow gold">THE INNER CIRCLE</span><h2>BEHIND<br/><em>THE CROWN</em></h2><p>OFFICIAL JUDGING & MANAGEMENT PORTAL</p></div><div className="login-form-wrap"><span className="eyebrow">RESTRICTED ACCESS</span><h2>WELCOME <em>BACK</em></h2><p>เข้าสู่ระบบสำหรับกรรมการและผู้ดูแลเว็บไซต์</p><form onSubmit={submit}><label>EMAIL ADDRESS<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" required/></label><label>PASSWORD<div className="password-field"><input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" required/><button type="button" onClick={()=>setShow(!show)}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>{error&&<div className="error-message"><AlertCircle size={16}/>{error}</div>}<button className="primary-btn full" disabled={busy}>{busy?<LoaderCircle className="spin"/>:'SIGN IN'} <ArrowUpRight size={15}/></button></form><div className="security-note"><ShieldCheck size={16}/> SECURE AUTHENTICATED ACCESS</div><button className="back-link" onClick={()=>go('home')}>← BACK TO PUBLIC WEBSITE</button></div></section>
}
function Judge({session,profile,episodes,contestants,activeEpisode,setActiveEpisode,notice,setNotice}) {
  const [scores,setScores]=useState({}),[busy,setBusy]=useState(false)
  useEffect(()=>{if(!session)return;if(profile?.role==='admin')return;if(profile?.role!=='judge')return},[session,profile])
  if(!session || !['judge','admin'].includes(profile?.role)) return <AccessDenied/>
  const selected=episodes.find(e=>e.id===activeEpisode)
  const change=(cid,rid,val)=>setScores(s=>({...s,[cid]:{...(s[cid]||{}),[rid]:val}}))
  const submit=async()=>{setNotice('');if(!supabase)return;setBusy(true);try{const rows=Object.entries(scores).flatMap(([contestant_id,items])=>Object.entries(items).map(([rubric_id,score])=>({contestant_id,rubric_id,score:Number(score)})));const {data,error}=await supabase.functions.invoke('submit-score',{body:{episode_id:activeEpisode,scores:rows}});if(error)throw error;setNotice('บันทึกคะแนนเรียบร้อย');setScores({})}catch(e){setNotice('บันทึกไม่สำเร็จ: '+(e.message||'กรุณาตรวจสอบการตั้งค่า'))}finally{setBusy(false)}}
  return <section className="dashboard section-wrap"><div className="dash-head"><div><span className="eyebrow">JUDGING PORTAL</span><h2>WELCOME, <em>JUDGE</em></h2><p>กรอกคะแนนตามเกณฑ์ที่ได้รับมอบหมาย</p></div><span className="role-tag"><ShieldCheck size={14}/> JUDGE ACCESS</span></div><div className="episode-tabs">{episodes.map(e=><button className={activeEpisode===e.id?'selected':''} onClick={()=>setActiveEpisode(e.id)} key={e.id}>{e.code}</button>)}</div><div className="scoring-title"><div><span className="eyebrow">{selected?.code || 'EPISODE'}</span><h2>{selected?.title || 'SCORING'}</h2></div><button className="primary-btn" onClick={submit} disabled={busy}>{busy?<LoaderCircle className="spin"/>:<Save size={15}/>} SAVE SCORES</button></div>{notice&&<div className="success-message"><CheckCircle2 size={16}/>{notice}</div>}<div className="score-table-wrap"><table className="score-table"><thead><tr><th>CONTESTANT</th>{rubric.map(r=><th key={r.id}>{r.label}<small>MAX {r.max}</small></th>)}</tr></thead><tbody>{contestants.map(c=><tr key={c.id}><td><b>{c.name}</b><small>{c.country}</small></td>{rubric.map(r=><td key={r.id}><input type="number" min="0" max={r.max} value={scores[c.id]?.[r.id]??''} placeholder="—" onChange={e=>change(c.id,r.id,e.target.value)}/><small>/ {r.max}</small></td>)}</tr>)}</tbody></table></div><p className="privacy-line"><LockKeyhole size={14}/> คะแนนที่ส่งจะถูกเก็บเป็นข้อมูลส่วนตัว กรรมการไม่สามารถเปิดดูคะแนนรวมของผู้เข้าแข่งขันได้</p></section>
}
function AccessDenied() { return <section className="page-section section-wrap"><div className="empty-state"><LockKeyhole size={38}/><h3>ACCESS RESTRICTED</h3><p>กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับอนุญาต</p></div></section> }
function Admin({session,profile,episodes,contestants,notice,setNotice}) {
  const [rows,setRows]=useState([]),[busy,setBusy]=useState(true),[filter,setFilter]=useState('all')
  useEffect(()=>{if(!supabase||profile?.role!=='admin')return;supabase.from('score_submissions').select('id,episode_id,contestant_id,rubric_id,score,submitted_at').order('submitted_at',{ascending:false}).then(({data,error})=>{if(error)setNotice('ไม่สามารถโหลดคะแนนได้: '+error.message);else setRows(data||[]);setBusy(false)})},[profile])
  const getName=id=>contestants.find(c=>c.id===id)?.name||id
  const getEp=id=>episodes.find(e=>e.id===id)?.code||id
  const totalByContestant=useMemo(()=>{const m={};rows.forEach(r=>{const k=r.episode_id+'_'+r.contestant_id;m[k]=(m[k]||0)+Number(r.score)});return m},[rows])
  if(!session||profile?.role!=='admin')return <AccessDenied/>
  return <section className="dashboard section-wrap"><div className="dash-head"><div><span className="eyebrow">OWNER CONTROL CENTER</span><h2>ADMIN <em>DASHBOARD</em></h2><p>ภาพรวมคะแนนและการจัดการการแข่งขัน</p></div><span className="role-tag admin-tag"><Crown size={14}/> OWNER ONLY</span></div><div className="stats-grid"><div><span>SUBMISSIONS</span><b>{rows.length}</b><small>รายการคะแนนทั้งหมด</small></div><div><span>CONTESTANTS</span><b>{contestants.length}</b><small>ผู้เข้าแข่งขัน</small></div><div><span>EPISODES</span><b>{episodes.length}</b><small>ตอนการแข่งขัน</small></div></div><div className="admin-panel"><div className="panel-heading"><div><span className="eyebrow">CONFIDENTIAL DATA</span><h3>ALL SCORE SUBMISSIONS</h3></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">ทุก Episode</option>{episodes.map(e=><option key={e.id} value={e.id}>{e.code}</option>)}</select></div>{busy?<div className="loading"><LoaderCircle className="spin"/> Loading confidential scores...</div>:<div className="score-table-wrap"><table className="score-table admin-table"><thead><tr><th>EPISODE</th><th>CONTESTANT</th><th>RUBRIC</th><th>SCORE</th><th>SUBMITTED</th></tr></thead><tbody>{rows.filter(r=>filter==='all'||r.episode_id===filter).map(r=><tr key={r.id}><td>{getEp(r.episode_id)}</td><td>{getName(r.contestant_id)}</td><td>{r.rubric_id}</td><td><b>{r.score}</b></td><td>{new Date(r.submitted_at).toLocaleString('th-TH')}</td></tr>)}</tbody></table>{rows.length===0&&<div className="empty-inline">ยังไม่มีข้อมูลคะแนน</div>}</div>}</div><div className="privacy-line"><ShieldCheck size={14}/> ข้อมูลนี้แสดงได้เฉพาะบัญชีที่มี role = admin ซึ่งกำหนดโดยผู้ดูแลระบบผ่าน Supabase Auth app_metadata</div></section>
}

export default function AppWithRoute() {
  const [route,setRoute]=useState('home')
  return <AppRouter/>
}
function AppRouter(){ return <App/> }
