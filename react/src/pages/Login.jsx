import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI, notificationsAPI } from '../utils/api';
import { setSession } from '../utils/auth';
import { useToast } from '../context/ToastContext';

// ── Data (mirrors loginnew.html) ──
const PROGS = [
  { code:'btech', label:'B.Tech', icon:'⚙️', sub:'Engineering'},
  { code:'bsc',   label:'B.Sc',   icon:'🔬', sub:'Science'},
  { code:'bca',   label:'BCA',    icon:'💻', sub:'Comp. Applications'},
  { code:'mtech', label:'M.Tech', icon:'🏗️', sub:'Eng. PG'},
  { code:'msc',   label:'M.Sc',   icon:'🧪', sub:'Science PG'},
  { code:'mca',   label:'MCA',    icon:'🖥️', sub:'Comp. App. PG'},
];

const BRANCH_COLORS = {
  CSE:'#3b82f6',IT:'#6366f1',ECE:'#06b6d4',EEE:'#f59e0b',ME:'#10b981',CE:'#84cc16',CHE:'#f97316',
  'BSC-CS':'#3b82f6','BSC-PH':'#8b5cf6','BSC-MA':'#ec4899','BSC-CH':'#f97316',
  BCA:'#3b82f6',MTCSE:'#3b82f6',MTVL:'#06b6d4',MTSTRUCT:'#10b981',
  'MSC-CS':'#3b82f6','MSC-PH':'#8b5cf6','MSC-MA':'#ec4899',MCA:'#6366f1'
};
const BRANCH_ICONS = {
  CSE:'fas fa-laptop-code',IT:'fas fa-network-wired',ECE:'fas fa-microchip',EEE:'fas fa-bolt',ME:'fas fa-cog',
  CE:'fas fa-building',CHE:'fas fa-flask','BSC-CS':'fas fa-laptop-code','BSC-PH':'fas fa-atom',
  'BSC-MA':'fas fa-square-root-alt','BSC-CH':'fas fa-flask',BCA:'fas fa-laptop-code',MTCSE:'fas fa-robot',
  MTVL:'fas fa-microchip',MTSTRUCT:'fas fa-layer-group','MSC-CS':'fas fa-laptop-code',
  'MSC-PH':'fas fa-atom','MSC-MA':'fas fa-square-root-alt',MCA:'fas fa-laptop-code'
};
const BRANCHES = {
  btech:[{code:'CSE',name:'Computer Science',cats:['Programming','Computer Science','Algorithms','AI / Machine Learning','Databases','Software Engineering','Networking','Systems']},
         {code:'IT',name:'Information Tech',cats:['Programming','Computer Science','Networking','Databases','Software Engineering','Systems']},
         {code:'ECE',name:'Electronics & Comm',cats:['Networking','Systems','Physics','Mathematics','Programming']},
         {code:'EEE',name:'Electrical Engg',cats:['Physics','Mathematics','Systems','Networking']},
         {code:'ME',name:'Mechanical Engg',cats:['Mathematics','Physics']},
         {code:'CE',name:'Civil Engg',cats:['Mathematics','Physics']},
         {code:'CHE',name:'Chemical Engg',cats:['Mathematics','Physics']}],
  bsc:[{code:'BSC-CS',name:'Computer Science',cats:['Programming','Computer Science','Algorithms','Databases']},
       {code:'BSC-PH',name:'Physics',cats:['Physics','Mathematics']},
       {code:'BSC-MA',name:'Mathematics',cats:['Mathematics','Physics']},
       {code:'BSC-CH',name:'Chemistry',cats:['Mathematics','Physics']}],
  bca:[{code:'BCA',name:'Computer Applications',cats:['Programming','Computer Science','Databases','Software Engineering','Networking']}],
  mtech:[{code:'MTCSE',name:'Computer Science',cats:['Programming','AI / Machine Learning','Algorithms','Databases','Software Engineering']},
         {code:'MTVL',name:'VLSI Design',cats:['Systems','Networking','Physics']},
         {code:'MTSTRUCT',name:'Structural Engg',cats:['Mathematics','Physics']}],
  msc:[{code:'MSC-CS',name:'Computer Science',cats:['Programming','Algorithms','Databases','AI / Machine Learning']},
       {code:'MSC-PH',name:'Physics',cats:['Physics','Mathematics']},
       {code:'MSC-MA',name:'Mathematics',cats:['Mathematics','Physics']}],
  mca:[{code:'MCA',name:'Computer Applications',cats:['Programming','Computer Science','Databases','Networking','Software Engineering','Algorithms']}],
};
const GROUPS = {btech:['A','B','C','D'],bsc:['A','B','C'],bca:['A','B'],mtech:['A','B'],msc:['A','B'],mca:['A']};
const YEARS = {
  btech:[{n:'1st',lbl:'First Year'},{n:'2nd',lbl:'Second Year'},{n:'3rd',lbl:'Third Year'},{n:'4th',lbl:'Fourth Year'}],
  bsc:[{n:'1st',lbl:'First Year'},{n:'2nd',lbl:'Second Year'},{n:'3rd',lbl:'Third Year'}],
  bca:[{n:'1st',lbl:'First Year'},{n:'2nd',lbl:'Second Year'},{n:'3rd',lbl:'Third Year'}],
  mtech:[{n:'1st',lbl:'First Year'},{n:'2nd',lbl:'Second Year'}],
  msc:[{n:'1st',lbl:'First Year'},{n:'2nd',lbl:'Second Year'}],
  mca:[{n:'1st',lbl:'First Year'},{n:'2nd',lbl:'Second Year'}],
};

function ProgressBar({ step, total, labels }) {
  return (
    <div style={{marginBottom:'1.75rem'}}>
      <div className="progress-steps">
        {labels.map((lb, i) => {
          const n = i + 1;
          const cls = n < step ? 'done' : n === step ? 'active' : '';
          return (
            <React.Fragment key={i}>
              <div className="ps">
                <div className={`ps-dot ${cls}`}>{n < step ? <i className="fas fa-check" style={{fontSize:'.72rem'}}></i> : n}</div>
                <div className={`ps-label ${cls}`}>{lb}</div>
              </div>
              {i < labels.length - 1 && <div className={`ps-line ${n < step ? 'done' : ''}`}></div>}
            </React.Fragment>
          );
        })}
      </div>
      <div className="progress-title">{['Select Branch','Select Group','Select Year','Sign In'][step-1]}</div>
      <div style={{height:'1px',background:'rgba(255,255,255,.07)',margin:'1rem 0'}}></div>
    </div>
  );
}

function Modal({ title, open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay open" style={{zIndex: 9999}} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{maxWidth:'400px', background:'#0f172a', border:'1px solid rgba(255,255,255,0.1)', color:'#fff'}}>
        <div className="modal-title" style={{marginBottom:'1rem', color:'#fff'}}>{title}</div>
        {children}
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const [role, setRole] = useState('student');
  const [step, setStep] = useState(1);
  const [selProg, setSelProg] = useState('');
  const [selBranch, setSelBranch] = useState(null);
  const [selGroup, setSelGroup] = useState('');
  const [selYear, setSelYear] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [branchWarn, setBranchWarn] = useState(false);
  const [showForgotBox, setShowForgotBox] = useState(false);
  const [forgotType, setForgotType] = useState('password');
  const [forgotInput, setForgotInput] = useState('');
  const [forgotSending, setForgotSending] = useState(false);

  async function handleForgotSubmit() {
    if (!forgotInput.trim()) { toast('Please enter the required information', 'err'); return; }
    setForgotSending(true);
    try {
      await notificationsAPI.create({
        role: 'admin',
        title: forgotType === 'password' ? 'Password Reset Request' : 'Username Retrieval Request',
        text: `A user is requesting a ${forgotType} assistance. Provided info: ${forgotInput}`,
        icon: 'fa-solid fa-life-ring text-warn'
      });
      toast('Request sent to admin!', 'ok');
      setShowForgotBox(false);
      setForgotInput('');
    } catch (e) {
      toast('Error sending request.', 'err');
    }
    setForgotSending(false);
  }

  const isStudent = role === 'student';

  function handleRoleChange(r) {
    setRole(r);
    setError('');
    if (r === 'student') setStep(1);
  }

  async function doLogin(u, p, r) {
    const uname = u || username;
    const pwd = p || password;
    const rl = r || role;
    if (!uname || !pwd) { setError('Please enter username and password.'); return; }
    if (rl === 'student' && (!selBranch || !selGroup || !selYear)) { setError('Please complete all selection steps.'); return; }
    setLoading(true);
    try {
      const res = await authAPI.login({ username: uname, password: pwd });
      const user = res.data;
      if (user.role !== rl) { setError(`This is a "${user.role}" account. Select the correct role.`); setLoading(false); return; }
      
      if (user.role === 'student') {
        const pMatch = !user.programme || user.programme.toLowerCase() === selProg.toLowerCase();
        const dMatch = !user.department || user.department.toLowerCase() === selBranch.code.toLowerCase();
        const gMatch = !user.group || user.group.toLowerCase() === selGroup.toLowerCase();
        const yMatch = !user.year || user.year.toLowerCase() === selYear.toLowerCase();
        
        if (!pMatch || !dMatch || !gMatch || !yMatch) {
          setError('Login failed! Selected Programme/Branch/Year does not match your registered profile.');
          setLoading(false);
          return;
        }
      }

      const sess = { ...user };
      if (rl === 'student') {
        sess.programme = selProg; sess.branch = selBranch.code; sess.branchName = selBranch.name;
        sess.branchCats = selBranch.cats; sess.group = selGroup; sess.year = selYear;
      }
      setSession(sess);
      navigate(`/dashboard/${user.role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid username or password.');
    }
    setLoading(false);
  }

  const labels = ['Branch','Group','Year','Sign In'];

  return (
    <>
      <div className="login-bg">
        <div className="login-orb login-orb1"></div>
        <div className="login-orb login-orb2"></div>
        <div className="login-orb login-orb3"></div>
      </div>
      <div className="login-wrap">
        <div className="login-card">
          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-icon"><i className="fas fa-book-open"></i></div>
            <div><h1 style={{fontSize:'1.7rem',fontWeight:900,color:'#fff'}}>SmartLib</h1><p style={{fontSize:'.82rem',color:'rgba(255,255,255,.45)'}}>Intelligent Library Management System</p></div>
          </div>

          {/* Role Pills */}
          <div className="role-row">
            {[{r:'admin',icon:'fa-shield-alt',label:'Admin'},{r:'librarian',icon:'fa-book-reader',label:'Librarian'},{r:'student',icon:'fa-user-graduate',label:'Student'},{r:'faculty',icon:'fa-chalkboard-teacher',label:'Faculty'}].map(p => (
              <button key={p.r} className={`role-btn-pill ${role===p.r?'active':''}`} onClick={() => handleRoleChange(p.r)}>
                <i className={`fas ${p.icon}`}></i>{p.label}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && <div className="login-alert"><i className="fas fa-exclamation-circle"></i><span>{error}</span></div>}

          {/* Student Steps */}
          {isStudent && step === 1 && (
            <>
              <ProgressBar step={1} labels={labels} />
              {branchWarn && (
                <div style={{background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.35)',borderRadius:'12px',padding:'.75rem 1rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'.6rem',color:'#fca5a5',fontSize:'.85rem',fontWeight:600,animation:'shake .4s ease'}}>
                  <i className="fas fa-exclamation-triangle" style={{color:'#ef4444'}}></i>
                  {!selProg ? 'Please select your Programme first.' : 'Please select your Branch / Department to continue.'}
                </div>
              )}
              <div className="prog-select-wrap">
                <div className="field-label"><i className="fas fa-graduation-cap"></i> Select Your Programme <span style={{color:'#ef4444',marginLeft:'3px'}}>*</span></div>
                <div className="prog-grid">
                  {PROGS.map(pr => (
                    <div key={pr.code} className={`prog-card ${selProg===pr.code?'active':''}`} onClick={() => { setSelProg(pr.code); setSelBranch(null); setBranchWarn(false); }}>
                      <div className="pc-icon">{pr.icon}</div>
                      <div className="pc-code">{pr.label}</div>
                      <div className="pc-name">{pr.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
              {selProg && (
                <>
                  <div className="login-divider"></div>
                  <div className="field-label"><i className="fas fa-code-branch"></i> Select Branch / Department <span style={{color:'#ef4444',marginLeft:'3px'}}>*</span></div>
                  <div className="branch-grid">
                    {(BRANCHES[selProg]||[]).map(b => {
                      const color = BRANCH_COLORS[b.code]||'#6366f1';
                      const ico = BRANCH_ICONS[b.code]||'fas fa-book';
                      return (
                        <div key={b.code} className={`branch-card ${selBranch?.code===b.code?'active':''}`} onClick={() => { setSelBranch(b); setBranchWarn(false); }}>
                          <i className="fas fa-check-circle check-ico"></i>
                          <div className="bc-ico" style={{background:`${color}22`,color}}><i className={ico}></i></div>
                          <div><div className="bc-code">{b.code}</div><div className="bc-name">{b.name}</div></div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              <button
                className="btn-next-step"
                style={!selBranch ? {opacity: 0.65, cursor:'not-allowed'} : {}}
                onClick={() => {
                  if (!selProg || !selBranch) { setBranchWarn(true); setTimeout(() => setBranchWarn(false), 3500); return; }
                  setBranchWarn(false); setStep(2);
                }}
              >
                <i className="fas fa-arrow-right"></i> Continue to Group Selection
              </button>
            </>
          )}

          {isStudent && step === 2 && (
            <>
              <ProgressBar step={2} labels={labels} />
              {selBranch && (
                <div style={{display:'flex',alignItems:'center',gap:'.75rem',background:`${BRANCH_COLORS[selBranch.code]||'#6366f1'}18`,border:`1px solid ${BRANCH_COLORS[selBranch.code]||'#6366f1'}40`,borderRadius:'14px',padding:'.85rem 1rem',marginBottom:'1.1rem'}}>
                  <div style={{width:'42px',height:'42px',borderRadius:'12px',background:`${BRANCH_COLORS[selBranch.code]}25`,color:BRANCH_COLORS[selBranch.code],display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',flexShrink:0}}><i className={BRANCH_ICONS[selBranch.code]||'fas fa-book'}></i></div>
                  <div><div style={{fontWeight:800,color:'#fff'}}>{selBranch.code} — {selBranch.name}</div><div style={{fontSize:'.73rem',color:'rgba(255,255,255,.4)',marginTop:'2px'}}>{selProg.toUpperCase()} Programme selected</div></div>
                </div>
              )}
              <div className="field-label"><i className="fas fa-users"></i> Select Your Class Group / Section</div>
              <div className="group-grid">
                {(GROUPS[selProg]||['A','B','C']).map(g => (
                  <div key={g} className={`group-card ${selGroup===g?'active':''}`} onClick={() => setSelGroup(g)}>
                    {g}<div className="group-label">Section</div>
                  </div>
                ))}
              </div>
              <button className="btn-next-step" disabled={!selGroup} onClick={() => setStep(3)} style={{marginTop:'1.1rem'}}>
                <i className="fas fa-arrow-right"></i> Continue to Year Selection
              </button>
              <button className="btn-back-step" onClick={() => setStep(1)}><i className="fas fa-arrow-left"></i> Back to Branch</button>
            </>
          )}

          {isStudent && step === 3 && (
            <>
              <ProgressBar step={3} labels={labels} />
              <div className="field-label"><i className="fas fa-calendar-alt"></i> Select Your Academic Year</div>
              <div className="year-grid">
                {(YEARS[selProg]||[]).map(y => (
                  <div key={y.n} className={`year-card ${selYear===y.n?'active':''}`} onClick={() => setSelYear(y.n)}>
                    <div className="yc-num">{y.n}</div>
                    <div><div className="yc-label">{y.lbl}</div><div className="yc-sub">{selProg.toUpperCase()} · {selBranch?.code}</div></div>
                  </div>
                ))}
              </div>
              <button className="btn-next-step" disabled={!selYear} onClick={() => setStep(4)} style={{marginTop:'1.1rem'}}>
                <i className="fas fa-arrow-right"></i> Continue to Sign In
              </button>
              <button className="btn-back-step" onClick={() => setStep(2)}><i className="fas fa-arrow-left"></i> Back to Group</button>
            </>
          )}

          {/* Sign In Form */}
          {(!isStudent || step === 4) && (
            <>
              {isStudent && <ProgressBar step={4} labels={labels} />}
              {isStudent && selBranch && (
                <div className="summary-chip">
                  <i className="fas fa-check-circle" style={{color:'#10b981',fontSize:'1rem'}}></i>
                  <span className="summary-badge">{selBranch.code}</span>
                  <span className="summary-badge" style={{background:'rgba(167,139,250,.15)',borderColor:'rgba(167,139,250,.3)',color:'#a78bfa'}}>Group {selGroup}</span>
                  <span className="summary-badge" style={{background:'rgba(52,211,153,.12)',borderColor:'rgba(52,211,153,.3)',color:'#34d399'}}>{selYear} Year</span>
                </div>
              )}
              <div className="login-field">
                <label><i className="fas fa-user"></i> Username</label>
                <div className="inp-wrap">
                  <i className="inp-icon fas fa-user"></i>
                  <input className="login-inp" type="text" placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
                </div>
              </div>
              <div className="login-field">
                <label><i className="fas fa-lock"></i> Password</label>
                <div className="inp-wrap">
                  <i className="inp-icon fas fa-lock"></i>
                  <input className="login-inp" type={showPwd?'text':'password'} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter' && doLogin()} />
                  <button className="eye-btn" onClick={() => setShowPwd(!showPwd)} type="button"><i className={`fas ${showPwd?'fa-eye-slash':'fa-eye'}`}></i></button>
                </div>
              </div>
              {role !== 'admin' && (
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:'.5rem', marginBottom:'1.2rem', fontSize:'.85rem' }}>
                  <span style={{color:'rgba(255,255,255,.5)', cursor:'pointer', transition:'.2s'}} onClick={()=>{setForgotType('username');setShowForgotBox(true);}} onMouseOver={e=>e.target.style.color='#f59e0b'} onMouseOut={e=>e.target.style.color='rgba(255,255,255,.5)'}>Forgot Username?</span>
                  <span style={{color:'rgba(255,255,255,.5)', cursor:'pointer', transition:'.2s'}} onClick={()=>{setForgotType('password');setShowForgotBox(true);}} onMouseOver={e=>e.target.style.color='#f59e0b'} onMouseOut={e=>e.target.style.color='rgba(255,255,255,.5)'}>Forgot Password?</span>
                </div>
              )}
              {isStudent && <button className="btn-back-step" onClick={() => setStep(3)} style={{marginBottom:'.75rem'}}><i className="fas fa-arrow-left"></i> Back to Year</button>}
              <button className="btn-login" onClick={() => doLogin()} disabled={loading}>
                {loading ? <><i className="fas fa-spinner fa-spin"></i> Signing In…</> : <><i className="fas fa-sign-in-alt"></i> Sign In to Portal</>}
              </button>
            </>
          )}

          <Link to="/" style={{display:'block',textAlign:'center',marginTop:'1.5rem',color:'rgba(255,255,255,.3)',fontSize:'.82rem',transition:'color .2s'}} className="back-link">
            <i className="fas fa-arrow-left"></i> Back to Home
          </Link>
        </div>
      </div>

      <Modal title={<><i className={`fas ${forgotType === 'password' ? 'fa-lock' : 'fa-user'}`} style={{color:'#f59e0b', marginRight:'8px'}}></i> Forgot {forgotType === 'password' ? 'Password' : 'Username'}</>} open={showForgotBox} onClose={() => setShowForgotBox(false)}>
        <p style={{fontSize:'.85rem', color:'rgba(255,255,255,.7)', marginBottom:'1rem'}}>
          {forgotType === 'password' 
            ? 'Enter your username or email and we will notify the admin to reset your password.'
            : 'Enter your email or phone number and we will notify the admin to retrieve your username.'}
        </p>
        <div className="login-field">
          <label style={{color:'#fff'}}>{forgotType === 'password' ? 'Username / Email' : 'Email / Phone'}</label>
          <div className="inp-wrap" style={{background:'rgba(255,255,255,0.05)'}}>
            <input className="login-inp" style={{paddingLeft:'1rem'}} type="text" placeholder={`Enter your details`} value={forgotInput} onChange={e => setForgotInput(e.target.value)} />
          </div>
        </div>
        <div style={{display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'1.5rem'}}>
          <button style={{margin:0, padding:'.6rem 1.2rem', background:'rgba(255,255,255,.1)', color:'#fff', cursor:'pointer', border:'none', borderRadius:'12px', fontWeight:600}} onClick={() => setShowForgotBox(false)}>Cancel</button>
          <button className="btn-login" style={{margin:0, padding:'.6rem 1.2rem', width:'auto'}} onClick={handleForgotSubmit} disabled={forgotSending}>
            {forgotSending ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>} Send Request
          </button>
        </div>
      </Modal>

    </>
  );
}
