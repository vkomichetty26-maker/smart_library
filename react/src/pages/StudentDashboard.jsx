import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '../utils/auth';
import { booksAPI, issuesAPI, requestsAPI, feedbackAPI, settingsAPI, notificationsAPI, usersAPI } from '../utils/api';
import { useToast } from '../context/ToastContext';

function Pill({ text, type }) { return <span className={`pill pill-${type}`}>{text}</span>; }

function Modal({ title, open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{maxWidth:'400px'}}>
        <div className="modal-title" style={{marginBottom:'1rem'}}>{title}</div>
        {children}
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const session = getSession();
  const me = session;
  const [section, setSection] = useState('home');
  const [books, setBooks] = useState([]);
  const [myIssues, setMyIssues] = useState([]);
  const [allIssues, setAllIssues] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [seenNotifs, setSeenNotifs] = useState(new Set());
  const [dbNotifications, setDbNotifications] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [reqQ, setReqQ] = useState('');
  const [fbRating, setFbRating] = useState(5);
  const [fbCat, setFbCat] = useState('General');
  const [fbMsg, setFbMsg] = useState('');
  const [myFeedback, setMyFeedback] = useState([]);
  const [finePerDay, setFinePerDay] = useState(5);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [newPwd, setNewPwd] = useState('');

  async function handleChangePassword() {
    if (!newPwd) { toast('Please enter a new password', 'err'); return; }
    try {
      await usersAPI.update(me.id, { password: newPwd });
      toast('Password changed successfully!', 'ok');
      setShowChangePwd(false);
      setNewPwd('');
    } catch(e) {
      toast('Failed to change password', 'err');
    }
  }

  const branchCats  = me?.branchCats || [];
  const branchCode  = me?.branch || '';
  const branchGroup = me?.group || '';
  const branchYear  = me?.year || '';
  const programme   = me?.programme || '';

  useEffect(() => {
    if (!session || session.role !== 'student') { navigate('/login'); return; }
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [b, iss, reqs, fb, s, notifs] = await Promise.all([booksAPI.getAll(), issuesAPI.getAll(), requestsAPI.getAll(), feedbackAPI.getAll(), settingsAPI.get(), notificationsAPI.getByUser(me?.id)]);
      setBooks(b.data);
      const allI = iss.data; setAllIssues(allI);
      setDbNotifications(notifs.data);
      setMyIssues(allI.filter(i => (i.user?._id || i.user) === me?.id && !i.returnDate));
      setMyRequests(reqs.data.filter(r => (r.user?._id || r.userId) === me?.id));
      setMyFeedback(fb.data.filter(f => (f.user?._id || f.userId) === me?.id));
      if (s.data?.finePerDay) setFinePerDay(s.data.finePerDay);
    } catch { toast('Backend not connected','err'); }
  }

  function logout() { clearSession(); navigate('/'); }
  function go(s) { setSection(s); setSidebarOpen(false); }

  const today = new Date().toISOString().slice(0,10);

  function branchSort(list) {
    if (!branchCats.length) return list;
    return [...list.filter(b => branchCats.includes(b.category)), ...list.filter(b => !branchCats.includes(b.category))];
  }
  function isBranchMatch(b) { return !!(branchCats.length && branchCats.includes(b.category)); }

  const pageMeta = {
    home:['My Dashboard','Your library overview'], search:['Search Books','Browse the full catalog'],
    mybooks:['My Books','Your active borrowings'], request:['Request a Book','Submit a request to librarian'],
    myrequests:['My Requests','Track your request status'], history:['Borrow History','Your borrowing record'],
    feedback:['Feedback','Share your library experience'], profile:['My Profile','Your account details']
  };
  const [ptitle, psub] = pageMeta[section] || [section,''];

  // Stats for home
  const d3 = new Date(); d3.setDate(d3.getDate()+3); const d3s = d3.toISOString().slice(0,10);
  const soon = myIssues.filter(i => (i.dueDate||'') >= today && (i.dueDate||'') <= d3s).length;
  const overdue = myIssues.filter(i => (i.dueDate||'') < today).length;
  const fineTotal = myIssues.reduce((a,i) => {
    const due = new Date(i.dueDate); const now = new Date(today);
    return a + (now > due ? Math.ceil((now-due)/86400000) * finePerDay : 0);
  }, 0);

  const notifications = [];
  if (overdue > 0) notifications.push({ id:'ov', icon:'fa-exclamation-circle text-err', title:'Overdue Books', text:`You have ${overdue} overdue book(s) with ₹${fineTotal} in fines.`, time:'Action Required' });
  if (soon > 0) notifications.push({ id:'soon', icon:'fa-clock text-warn', title:'Books Due Soon', text:`You have ${soon} book(s) due within 3 days.`, time:'Reminder' });
  dbNotifications.forEach(n => {
    notifications.push({ id: n._id, icon: n.icon, title: n.title, text: n.text, time: (n.createdAt||'').slice(0,10), isRead: n.isRead, isDb: true });
  });

  async function sendRequest(bookId) {
    try {
      await requestsAPI.create({ userId: me?.id, bookId });
      toast('Request submitted! Librarian will review it.','ok'); loadAll();
    } catch(e) { toast(e.response?.data?.message || 'Error','err'); }
  }

  async function submitFeedback() {
    if (!fbMsg.trim()) { toast('Please write your feedback','err'); return; }
    try {
      await feedbackAPI.create({ userId: me?.id, rating: fbRating, category: fbCat, message: fbMsg });
      toast('Feedback submitted! Thank you.','ok'); setFbMsg(''); setFbRating(5); loadAll();
    } catch { toast('Error submitting feedback','err'); }
  }

  const filteredSearch = branchSort(books.filter(b => !searchQ || b.title.toLowerCase().includes(searchQ.toLowerCase()) || b.author.toLowerCase().includes(searchQ.toLowerCase()) || (b.isbn && b.isbn.includes(searchQ))));
  const filteredReq = branchSort(books.filter(b => !reqQ || b.title.toLowerCase().includes(reqQ.toLowerCase()) || b.author.toLowerCase().includes(reqQ.toLowerCase())));
  const history = [...allIssues].filter(i => (i.user?._id||i.user) === me?.id).reverse();

  function isAlreadyIssued(bookId) { return myIssues.some(i => (i.book?._id||i.book) === bookId); }
  function hasPendingReq(bookId) { return myRequests.some(r => (r.bookId === bookId || r.book?._id === bookId) && r.status === 'pending'); }

  function branchBadge(b) {
    if (!isBranchMatch(b)) return null;
    return <span style={{background:'#1e40af',color:'#fff',borderRadius:'20px',padding:'.12rem .45rem',fontSize:'.65rem',fontWeight:700,verticalAlign:'middle',marginLeft:'4px'}}><i className="fas fa-star" style={{marginRight:'2px',fontSize:'.6rem'}}></i>{branchCode}</span>;
  }

  function getActionCell(b) {
    const bId = b._id;
    if (isAlreadyIssued(bId)) return <Pill text="Already Issued" type="ok"/>;
    if (hasPendingReq(bId)) return <Pill text="Request Pending" type="warn"/>;
    if (b.available < 1) return <Pill text="Unavailable" type="err"/>;
    return <button className="btn btn-primary btn-sm" onClick={() => sendRequest(bId)}><i className="fas fa-paper-plane"></i> Request</button>;
  }

  const branchImgMap = { CSE:'branch_cse.png',IT:'branch_cse.png',BCA:'branch_cse.png',MCA:'branch_cse.png',MTCSE:'branch_cse.png','MSC-CS':'branch_cse.png','BSC-CS':'branch_cse.png',ECE:'branch_ece.png',EEE:'branch_ece.png',MTVL:'branch_ece.png',ME:'branch_mech.png',CE:'branch_mech.png',CHE:'branch_mech.png',MTSTRUCT:'branch_mech.png','BSC-PH':'branch_math.png','BSC-MA':'branch_math.png','BSC-CH':'branch_math.png','MSC-PH':'branch_math.png','MSC-MA':'branch_math.png' };

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen?'open':''}`} style={{background:'linear-gradient(180deg,#0f172a 0%,#1e3a8a 60%,#1d4ed8 100%)'}}>
        <div className="sidebar-brand"><div className="brand-icon"><i className="fas fa-user-graduate"></i></div><div className="brand-text">Smart<span>Lib</span></div></div>
        <nav className="sidebar-nav">
          <span className="nav-label">Student</span>
          {[['home','fa-home','My Dashboard'],['search','fa-search','Search Books'],['mybooks','fa-book-open','My Books'],['request','fa-paper-plane','Request a Book'],['myrequests','fa-clipboard-list','My Requests']].map(([s,ic,lb]) => (
            <button key={s} className={`nav-item ${section===s?'active':''}`} onClick={() => go(s)}><i className={`fas ${ic}`}></i>{lb}</button>
          ))}
          <div className="nav-divider"></div>
          {[['history','fa-history','Borrow History'],['feedback','fa-star','Feedback'],['profile','fa-user-circle','My Profile']].map(([s,ic,lb]) => (
            <button key={s} className={`nav-item ${section===s?'active':''}`} onClick={() => go(s)}><i className={`fas ${ic}`}></i>{lb}</button>
          ))}
        </nav>
        <div className="sidebar-footer"><div className="user-card">
          <div className="user-avatar" style={{background:'rgba(255,255,255,.25)',color:'#fff'}}>{(me?.name||'S')[0]}</div>
          <div className="user-meta"><div className="name">{me?.name||'Student'}</div><div className="role">Student Member</div></div>
        </div></div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <button className="topbar-btn" onClick={() => setSidebarOpen(!sidebarOpen)}><i className="fas fa-bars"></i></button>
            <div><div className="page-title">{ptitle}</div><div className="page-sub">{psub}</div></div>
          </div>
          <div className="topbar-right">
            <div className="notif-wrapper">
              <button className="topbar-btn" onClick={() => {
                const opening = !showNotif;
                if (opening) {
                    setSeenNotifs(new Set(notifications.filter(n => !n.isDb).map(n => n.id)));
                    const unreadDb = dbNotifications.filter(n => !n.isRead).map(n => n._id);
                    if (unreadDb.length > 0) {
                        notificationsAPI.markRead(unreadDb).catch(()=>{});
                        setDbNotifications(dbNotifications.map(n => ({...n, isRead: true})));
                    }
                }
                setShowNotif(opening);
              }}>
                <i className="fas fa-bell"></i>
                {notifications.filter(n => (n.isDb ? !n.isRead : !seenNotifs.has(n.id))).length > 0 && <span className="notif-badge">{notifications.filter(n => (n.isDb ? !n.isRead : !seenNotifs.has(n.id))).length}</span>}
              </button>
              {showNotif && (
                <div className="notif-dropdown">
                  <div className="notif-header">Notifications <span style={{fontSize:'.75rem',color:'var(--accent)',cursor:'pointer'}} onClick={()=>setShowNotif(false)}>Close</span></div>
                  {notifications.length === 0 ? (
                    <div className="notif-empty"><i className="fas fa-bell-slash"></i> You're all caught up!</div>
                  ) : (
                    <div className="notif-list">
                      {notifications.map((n, idx) => (
                        <div key={n.id||idx} className="notif-item">
                          <div className={`notif-icon ${n.icon.includes('text-err')?'err':n.icon.includes('text-warn')?'warn':n.icon.includes('text-ok')?'ok':'info'}`}><i className={`fas ${n.icon.split(' ')[0]}`}></i></div>
                          <div>
                            <div style={{fontWeight:700,fontSize:'.85rem'}}>{n.title}</div>
                            <div className="notif-text">{n.text}</div>
                            <span className="notif-time">{n.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button className="logout-link" onClick={logout}><i className="fas fa-sign-out-alt"></i> Logout</button>
          </div>
        </div>

        <div className="content">
          {/* HOME */}
          {section === 'home' && (
            <div>
              <div className="hero-banner">
                <div className="hero-avatar-box">{(me?.name||'S')[0]}</div>
                <div className="hero-info">
                  <h2>Welcome back, {me?.name?.split(' ')[0]||'Student'}!</h2>
                  <p>{[me?.rollNo||me?.username, branchCode?`${programme.toUpperCase()} ${branchCode}`:'', branchGroup?`Group ${branchGroup}`:'', branchYear?`${branchYear} Year`:''].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
              {/* Branch image */}
              {branchCode && branchImgMap[branchCode] && (
                <div style={{borderRadius:'18px',overflow:'hidden',marginBottom:'1.25rem',position:'relative',height:'170px',boxShadow:'0 10px 40px rgba(0,0,0,.4)'}}>
                  <img src={`/${branchImgMap[branchCode]}`} alt="branch" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e => e.target.style.display='none'} />
                  <div style={{position:'absolute',inset:0,display:'flex',alignItems:'flex-end',padding:'1.25rem 1.5rem',background:'linear-gradient(to top,rgba(0,0,0,.85) 0%,rgba(0,0,0,.3) 60%,transparent 100%)'}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:'.6rem',flexWrap:'wrap'}}>
                        <span style={{background:'#fbbf24',color:'#1e3a8a',borderRadius:'20px',padding:'.2rem .8rem',fontSize:'.78rem',fontWeight:800}}>{programme.toUpperCase()} · {branchCode}</span>
                        {branchGroup && <span style={{background:'rgba(255,255,255,.15)',color:'#fff',borderRadius:'20px',padding:'.2rem .75rem',fontSize:'.74rem',fontWeight:700}}>Group {branchGroup}</span>}
                        {branchYear && <span style={{background:'rgba(52,211,153,.2)',color:'#34d399',borderRadius:'20px',padding:'.2rem .75rem',fontSize:'.74rem',fontWeight:700}}>{branchYear} Year</span>}
                      </div>
                      {branchCats.length > 0 && <div style={{fontSize:'.75rem',color:'rgba(255,255,255,.6)',marginTop:'.4rem'}}>📚 Recommended: {branchCats.slice(0,4).join(' · ')}{branchCats.length>4?' …':''}</div>}
                    </div>
                  </div>
                </div>
              )}
              {/* Alerts */}
              {overdue > 0 && <div className="info-banner red"><i className="fas fa-exclamation-circle"></i><span>You have <strong>{overdue} overdue book(s)</strong> with ₹{fineTotal} in fines. Please return them immediately!</span></div>}
              {overdue === 0 && soon > 0 && <div className="info-banner amber"><i className="fas fa-clock"></i><span>{soon} book(s) due within 3 days.</span></div>}
              {overdue === 0 && soon === 0 && myIssues.length > 0 && <div className="info-banner green"><i className="fas fa-check-circle"></i><span>No overdue books! Keep it up.</span></div>}
              {/* Stats */}
              <div className="stats-row">
                <div className="stat-box"><div className="stat-ico blue"><i className="fas fa-book"></i></div><div className="stat-info"><div className="value">{myIssues.length}</div><div className="label">Books Issued</div></div></div>
                <div className="stat-box"><div className="stat-ico amber"><i className="fas fa-calendar-alt"></i></div><div className="stat-info"><div className="value">{soon}</div><div className="label">Due in 3 Days</div></div></div>
                <div className="stat-box"><div className="stat-ico red"><i className="fas fa-exclamation-circle"></i></div><div className="stat-info"><div className="value">{overdue}</div><div className="label">Overdue</div></div></div>
                <div className="stat-box"><div className="stat-ico red"><i className="fas fa-coins"></i></div><div className="stat-info"><div className="value">₹{fineTotal}</div><div className="label">Total Fine</div></div></div>
              </div>
              <div className="card">
                <div className="card-header"><span className="card-title"><i className="fas fa-book-open" style={{color:'#2563eb'}}></i> Currently Issued Books</span></div>
                <div className="card-body" style={{padding:0}}>
                  <div className="tbl-wrap"><table>
                    <thead><tr><th>Book</th><th>Author</th><th>Issue Date</th><th>Due Date</th><th>Status</th><th>Fine</th></tr></thead>
                    <tbody>
                      {myIssues.map((i, idx) => {
                        const b = books.find(x => x._id === (i.book?._id||i.book)) || {title:'?',author:''};
                        const isOv = (i.dueDate||'') < today;
                        const due = new Date(i.dueDate); const now = new Date(today);
                        const fine = now > due ? Math.ceil((now-due)/86400000) * finePerDay : 0;
                        return <tr key={idx}>
                          <td className="fw-700" style={{fontSize:'.87rem'}}>{b.title}</td><td style={{fontSize:'.83rem'}}>{b.author}</td>
                          <td>{(i.issueDate||'').slice(0,10)}</td><td style={{color:isOv?'var(--err)':'',fontWeight:isOv?700:400}}>{(i.dueDate||'').slice(0,10)}</td>
                          <td>{isOv?<Pill text="Overdue" type="err"/>:<Pill text="Active" type="warn"/>}</td>
                          <td className={fine>0?'text-err fw-700':''}>₹{fine}</td>
                        </tr>;
                      })}
                      {myIssues.length === 0 && <tr><td colSpan={6}><div className="empty-state"><i className="fas fa-inbox"></i><p>No books currently issued. Use "Request a Book"!</p></div></td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </div>
            </div>
          )}

          {/* SEARCH */}
          {section === 'search' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-search" style={{color:'#2563eb',marginRight:'8px'}}></i>Search Library Catalog</h2></div>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">All Books</span>
                  <div className="search-wrap" style={{margin:0,width:'320px'}}><i className="fas fa-search"></i><input className="search-inp" placeholder="Title, author, ISBN, subject…" value={searchQ} onChange={e => setSearchQ(e.target.value)}/></div>
                </div>
                {branchCats.length > 0 && <div style={{padding:'.6rem 1.2rem',fontSize:'.78rem',color:'#1d4ed8',background:'rgba(37,99,235,.07)',borderBottom:'1px solid rgba(37,99,235,.15)'}}><i className="fas fa-star" style={{marginRight:'5px'}}></i><strong>{branchCode}</strong> branch books shown first — {branchCats.join(', ')}</div>}
                <div className="card-body" style={{padding:0}}>
                  <div className="tbl-wrap"><table>
                    <thead><tr><th>Title & Author</th><th>Category</th><th>ISBN</th><th>Available</th><th>Action</th></tr></thead>
                    <tbody>
                      {filteredSearch.map(b => <tr key={b._id} style={{background:isBranchMatch(b)?'rgba(37,99,235,.05)':''}}>
                        <td><div className="fw-700" style={{fontSize:'.87rem'}}>{b.title}{branchBadge(b)}</div><div style={{fontSize:'.75rem',color:'var(--muted)'}}>{b.author}{b.edition?` · ${b.edition} ed.`:''}</div></td>
                        <td><Pill text={b.category||'—'} type="info"/></td>
                        <td><code style={{fontSize:'.8rem'}}>{b.isbn}</code></td>
                        <td><span className={`fw-700 ${b.available>0?'text-ok':'text-err'}`}>{b.available}</span><span style={{color:'var(--muted)',fontSize:'.8rem'}}>/{b.copies}</span></td>
                        <td>{getActionCell(b)}</td>
                      </tr>)}
                      {filteredSearch.length === 0 && <tr><td colSpan={5}><div className="empty-state"><i className="fas fa-inbox"></i><p>No books found.</p></div></td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </div>
            </div>
          )}

          {/* MY BOOKS */}
          {section === 'mybooks' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-book-open" style={{color:'#059669',marginRight:'8px'}}></i>My Issued Books</h2></div>
              <div className="card"><div className="card-header"><span className="card-title">Active Borrowings</span></div>
                <div className="card-body" style={{padding:0}}>
                  <div className="tbl-wrap"><table>
                    <thead><tr><th>Book</th><th>Author</th><th>Issued</th><th>Due Date</th><th>Days Left</th><th>Fine</th></tr></thead>
                    <tbody>
                      {myIssues.map((i, idx) => {
                        const b = books.find(x => x._id === (i.book?._id||i.book)) || {title:'?',author:''};
                        const isOv = (i.dueDate||'') < today;
                        const due = new Date(i.dueDate); const now = new Date(today);
                        const fine = now > due ? Math.ceil((now-due)/86400000)*finePerDay : 0;
                        const dLeft = isOv ? <span className="text-err fw-700">Overdue</span> : `${Math.ceil((due - now)/86400000)} days`;
                        return <tr key={idx}>
                          <td className="fw-700" style={{fontSize:'.87rem'}}>{b.title}</td><td style={{fontSize:'.83rem'}}>{b.author}</td>
                          <td>{(i.issueDate||'').slice(0,10)}</td><td style={{color:isOv?'var(--err)':'',fontWeight:isOv?700:400}}>{(i.dueDate||'').slice(0,10)}</td>
                          <td>{dLeft}</td><td className={fine>0?'text-err fw-700':''}>₹{fine}</td>
                        </tr>;
                      })}
                      {myIssues.length === 0 && <tr><td colSpan={6}><div className="empty-state"><i className="fas fa-inbox"></i><p>No active borrowings.</p></div></td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </div>
            </div>
          )}

          {/* REQUEST */}
          {section === 'request' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-paper-plane" style={{color:'#d97706',marginRight:'8px'}}></i>Request a Book</h2></div>
              <div className="info-banner blue"><i className="fas fa-info-circle"></i><span>Browse available books and submit a request. A librarian will review and issue the book to you.</span></div>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Available Books</span>
                  <div className="search-wrap" style={{margin:0,width:'280px'}}><i className="fas fa-search"></i><input className="search-inp" placeholder="Filter books…" value={reqQ} onChange={e => setReqQ(e.target.value)}/></div>
                </div>
                {branchCats.length > 0 && <div style={{padding:'.6rem 1.2rem',fontSize:'.78rem',color:'#1d4ed8',background:'rgba(37,99,235,.07)',borderBottom:'1px solid rgba(37,99,235,.15)'}}><i className="fas fa-star" style={{marginRight:'5px'}}></i>Showing <strong>{branchCode}</strong> branch books first</div>}
                <div className="card-body" style={{padding:0}}>
                  <div className="tbl-wrap"><table>
                    <thead><tr><th>Title & Author</th><th>Category</th><th>Available</th><th>Action</th></tr></thead>
                    <tbody>
                      {filteredReq.map(b => <tr key={b._id} style={{background:isBranchMatch(b)?'rgba(37,99,235,.05)':''}}>
                        <td><div className="fw-700" style={{fontSize:'.87rem'}}>{b.title}{branchBadge(b)}</div><div style={{fontSize:'.75rem',color:'var(--muted)'}}>{b.author}{b.publisher?` · ${b.publisher}`:''}</div></td>
                        <td><Pill text={b.category||'—'} type="info"/></td>
                        <td><span className={`fw-700 ${b.available>0?'text-ok':'text-err'}`}>{b.available}</span></td>
                        <td>{getActionCell(b)}</td>
                      </tr>)}
                      {filteredReq.length === 0 && <tr><td colSpan={4}><div className="empty-state"><i className="fas fa-inbox"></i><p>No books match.</p></div></td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </div>
            </div>
          )}

          {/* MY REQUESTS */}
          {section === 'myrequests' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-clipboard-list" style={{color:'#7c3aed',marginRight:'8px'}}></i>My Book Requests</h2></div>
              <div className="card"><div className="card-body" style={{padding:0}}>
                <div className="tbl-wrap"><table>
                  <thead><tr><th>Book</th><th>Requested On</th><th>Note</th><th>Status</th><th>Decision</th></tr></thead>
                  <tbody>
                    {[...myRequests].reverse().map((r, idx) => {
                      const b = books.find(x => x._id === (r.book?._id||r.bookId)) || {title:'?'};
                      const stPill = r.status==='pending'?<Pill text="Pending" type="warn"/>:r.status==='approved'?<Pill text="Approved" type="ok"/>:<Pill text="Rejected" type="err"/>;
                      return <tr key={idx}>
                        <td className="fw-700" style={{fontSize:'.87rem'}}>{b.title}</td>
                        <td>{(r.requestDate||r.createdAt||'').slice(0,10)}</td>
                        <td style={{fontSize:'.82rem'}}>{r.note||'—'}</td>
                        <td>{stPill}{r.message&&<div style={{fontSize:'.75rem',color:'var(--err)',marginTop:'3px'}}>{r.message}</div>}</td>
                        <td>{r.actionDate?(r.actionDate+'').slice(0,10):'Awaiting…'}</td>
                      </tr>;
                    })}
                    {myRequests.length === 0 && <tr><td colSpan={5}><div className="empty-state"><i className="fas fa-inbox"></i><p>No requests yet.</p></div></td></tr>}
                  </tbody>
                </table></div>
              </div></div>
            </div>
          )}

          {/* HISTORY */}
          {section === 'history' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-history" style={{color:'#7c3aed',marginRight:'8px'}}></i>Borrow History</h2></div>
              <div className="card"><div className="card-body" style={{padding:0}}>
                <div className="tbl-wrap"><table>
                  <thead><tr><th>Book</th><th>Issued</th><th>Due</th><th>Returned</th><th>Fine</th><th>Status</th></tr></thead>
                  <tbody>
                    {history.map((i, idx) => {
                      const b = books.find(x => x._id === (i.book?._id||i.book)) || {title:'?'};
                      const retDate = i.returnDate ? (i.returnDate+'').slice(0,10) : today;
                      const due = new Date(i.dueDate); const ret = new Date(retDate);
                      const fine = ret > due ? Math.ceil((ret-due)/86400000)*finePerDay : 0;
                      const st = i.returnDate ? <Pill text="Returned" type="ok"/> : (i.dueDate||'') < today ? <Pill text="Overdue" type="err"/> : <Pill text="Active" type="warn"/>;
                      return <tr key={idx}>
                        <td className="fw-700" style={{fontSize:'.86rem'}}>{b.title}</td>
                        <td>{(i.issueDate||'').slice(0,10)}</td><td>{(i.dueDate||'').slice(0,10)}</td>
                        <td>{i.returnDate?(i.returnDate+'').slice(0,10):'—'}</td>
                        <td className={fine>0?'text-err fw-700':''}>₹{fine}</td><td>{st}</td>
                      </tr>;
                    })}
                    {history.length === 0 && <tr><td colSpan={6}><div className="empty-state"><i className="fas fa-inbox"></i><p>No borrowing history yet.</p></div></td></tr>}
                  </tbody>
                </table></div>
              </div></div>
            </div>
          )}

          {/* FEEDBACK */}
          {section === 'feedback' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-star" style={{color:'#d97706',marginRight:'8px'}}></i>Submit Feedback</h2></div>
              <div className="card">
                <div className="card-header"><span className="card-title">Share Your Experience</span></div>
                <div className="card-body">
                  <div className="info-banner blue"><i className="fas fa-info-circle"></i><span>Your feedback helps us improve library services.</span></div>
                  <div className="form-group">
                    <label>Rating</label>
                    <div className="star-rating">
                      {[1,2,3,4,5].map(v => (
                        <span key={v} className="star" style={{color:v<=fbRating?'#f59e0b':'#94a3b8'}} onClick={() => setFbRating(v)}>{v<=fbRating?'★':'☆'}</span>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select className="inp" value={fbCat} onChange={e => setFbCat(e.target.value)}>
                      {['General','Book Collection','Staff Behaviour','Book Availability','Return Process','Facility','Other'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Your Feedback *</label>
                    <textarea className="inp" rows={4} value={fbMsg} onChange={e => setFbMsg(e.target.value)} placeholder="Write your feedback here…"></textarea>
                  </div>
                  <button className="btn btn-primary" onClick={submitFeedback}><i className="fas fa-paper-plane"></i> Submit Feedback</button>
                </div>
              </div>
              {myFeedback.length > 0 && (
                <div className="card" style={{marginTop:'1.5rem'}}>
                  <div className="card-header"><span className="card-title">My Previous Feedback</span></div>
                  <div className="card-body" style={{padding:0}}>
                    {myFeedback.map((f,i) => (
                      <div key={i} style={{padding:'1rem 1.5rem',borderBottom:'1px solid #f8fafc'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.3rem'}}>
                          <span style={{color:'#f59e0b',fontSize:'1rem'}}>{'★'.repeat(f.rating)+'☆'.repeat(5-f.rating)}</span>
                          <Pill text={f.category||'General'} type="info"/>
                        </div>
                        <div className="feed-text">{f.message}</div>
                        <div className="feed-time">{(f.date||f.createdAt||'').slice(0,10)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PROFILE */}
          {section === 'profile' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-user-circle" style={{marginRight:'8px'}}></i>My Profile</h2></div>
              <div className="card">
                <div className="card-body">
                  <div style={{display:'flex',alignItems:'center',gap:'1.5rem',marginBottom:'2rem',flexWrap:'wrap'}}>
                    <div style={{width:'88px',height:'88px',borderRadius:'50%',background:'linear-gradient(135deg,#1e3a8a,#3b82f6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2.2rem',fontWeight:800,color:'#fff'}}>{(me?.name||'S')[0]}</div>
                    <div><h2 style={{fontSize:'1.5rem'}}>{me?.name||'Student'}</h2><p className="text-muted" style={{marginTop:'4px'}}>{me?.email||'No email set'}</p></div>
                  </div>
                  <div className="form-grid">
                    {[['Roll Number', me?.rollNo||me?.username],['Department', me?.department||'—'],['Phone', me?.phone||'—'],['Role', 'Student']].map(([label, val]) => (
                      <div key={label} style={{background:'var(--bg)',borderRadius:'12px',padding:'1rem'}}>
                        <div style={{fontSize:'.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.04em'}}>{label}</div>
                        <div className="fw-700 mt-1">{val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:'1.5rem'}}>
                    <button className="btn btn-primary" onClick={() => setShowChangePwd(true)}><i className="fas fa-key"></i> Change Password</button>
                  </div>
                  <div className="stats-row" style={{marginTop:'1.5rem'}}>
                    <div className="stat-box"><div className="stat-ico blue"><i className="fas fa-book"></i></div><div className="stat-info"><div className="value">{history.length}</div><div className="label">Total Borrowed</div></div></div>
                    <div className="stat-box"><div className="stat-ico green"><i className="fas fa-check"></i></div><div className="stat-info"><div className="value">{history.filter(i => i.returnDate).length}</div><div className="label">Returned</div></div></div>
                    <div className="stat-box"><div className="stat-ico amber"><i className="fas fa-clock"></i></div><div className="stat-info"><div className="value">{myIssues.length}</div><div className="label">Active</div></div></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal title={<><i className="fas fa-key" style={{color:'#d97706'}}></i> Change Password</>} open={showChangePwd} onClose={() => setShowChangePwd(false)}>
        <div className="form-group">
          <label>New Password</label>
          <input className="inp" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Enter new password" />
        </div>
        <div className="modal-footer" style={{marginTop:'1.5rem',display:'flex',gap:'10px',justifyContent:'flex-end'}}>
          <button className="btn btn-outline" onClick={() => setShowChangePwd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleChangePassword}><i className="fas fa-save"></i> Save</button>
        </div>
      </Modal>

    </div>
  );
}
