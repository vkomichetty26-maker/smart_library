import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '../utils/auth';
import { booksAPI, issuesAPI, requestsAPI, settingsAPI, notificationsAPI, usersAPI } from '../utils/api';
import { useToast } from '../context/ToastContext';

function Pill({ text, type }) { return <span className={`pill pill-${type}`}>{text}</span>; }

function Modal({ title, open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{maxWidth:'500px'}}>
        <div className="modal-title">{title}</div>
        {children}
      </div>
    </div>
  );
}

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const session = getSession();
  const me = session;
  const [section, setSection] = useState('home');
  const [books, setBooks] = useState([]);
  const [allIssues, setAllIssues] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [seenNotifs, setSeenNotifs] = useState(new Set());
  const [dbNotifications, setDbNotifications] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [reqQ, setReqQ] = useState('');
  const [finePerDay, setFinePerDay] = useState(5);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestBook, setSuggestBook] = useState({ title: '', author: '', note: '' });
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

  useEffect(() => {
    if (!session || session.role !== 'faculty') { navigate('/login'); return; }
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [b, i, r, s, notifs] = await Promise.all([booksAPI.getAll(), issuesAPI.getAll(), requestsAPI.getAll(), settingsAPI.get(), notificationsAPI.getByUser(me?.id)]);
      setBooks(b.data);
      setAllIssues(i.data);
      setDbNotifications(notifs.data);
      setMyRequests(r.data.filter(r => (r.user?._id || r.userId) === me?.id));
      if (s.data?.finePerDay) setFinePerDay(s.data.finePerDay);
    } catch { toast('Backend not connected','err'); }
  }

  function logout() { clearSession(); navigate('/'); }
  function go(s) { setSection(s); setSidebarOpen(false); }

  const today = new Date().toISOString().slice(0,10);
  const myIssues = allIssues.filter(i => (i.user?._id||i.user) === me?.id && !i.returnDate);
  const history  = [...allIssues.filter(i => (i.user?._id||i.user) === me?.id)].reverse();

  const d5 = new Date(); d5.setDate(d5.getDate()+5); const d5s = d5.toISOString().slice(0,10);
  const soon = myIssues.filter(i => (i.dueDate||'') >= today && (i.dueDate||'') <= d5s).length;
  const overdue = myIssues.filter(i => (i.dueDate||'') < today).length;
  const fineTotal = 0; // Faculty do not have fines

  const pageMeta = { home:['Faculty Dashboard','Your library overview'], search:['Search Books','Browse the catalog'], request:['Request Books','Request books to borrow'], myrequests:['My Requests','Track your requests'], history:['Borrow History','Your complete history'], profile:['My Profile','Your academic profile'] };
  const [ptitle, psub] = pageMeta[section] || [section,''];

  const notifications = [];
  if (overdue > 0) notifications.push({ id:'ov', icon:'fa-exclamation-circle text-err', title:'Overdue Books', text:`You have ${overdue} overdue book(s). Please return them as soon as possible.`, time:'Action Required' });
  if (soon > 0) notifications.push({ id:'soon', icon:'fa-clock text-warn', title:'Books Due Soon', text:`You have ${soon} book(s) due within 5 days.`, time:'Reminder' });
  dbNotifications.forEach(n => {
    notifications.push({ id: n._id, icon: n.icon, title: n.title, text: n.text, time: (n.createdAt||'').slice(0,10), isRead: n.isRead, isDb: true });
  });

  async function sendRequest(bookId) {
    try {
      await requestsAPI.create({ userId: me?.id, bookId });
      toast('Request submitted! Librarian will review it.','ok'); loadAll();
    } catch(e) { toast(e.response?.data?.message || 'Error','err'); }
  }

  async function handleSuggestBook() {
    if (!suggestBook.title) { toast('Please provide a title.', 'err'); return; }
    try {
      await notificationsAPI.create({
        role: 'admin',
        title: 'New Book Suggestion',
        text: `Faculty ${me?.name} suggested adding "${suggestBook.title}" by ${suggestBook.author||'Unknown'}. ${suggestBook.note ? 'Note: '+suggestBook.note : ''}`,
        icon: 'fa-solid fa-lightbulb text-info'
      });
      toast('Suggestion sent to admin!', 'ok');
      setShowSuggest(false);
      setSuggestBook({ title: '', author: '', note: '' });
    } catch(e) {
      toast('Error sending suggestion.', 'err');
    }
  }


  function isAlreadyIssued(bookId) { return myIssues.some(i => (i.book?._id||i.book) === bookId); }
  function hasPendingReq(bookId) { return myRequests.some(r => (r.bookId===bookId||r.book?._id===bookId) && r.status==='pending'); }

  const filteredSearch = books.filter(b => !searchQ || b.title.toLowerCase().includes(searchQ.toLowerCase()) || b.author.toLowerCase().includes(searchQ.toLowerCase()));
  const filteredReq = books.filter(b => !reqQ || b.title.toLowerCase().includes(reqQ.toLowerCase()) || b.author.toLowerCase().includes(reqQ.toLowerCase()));

  function getBookObj(id) { return books.find(x => x._id === id) || {title:'?',author:''}; }

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen?'open':''}`} style={{background:'linear-gradient(180deg,#0f172a 0%,#064e3b 60%,#047857 100%)'}}>
        <div className="sidebar-brand"><div className="brand-icon"><i className="fas fa-chalkboard-teacher"></i></div><div className="brand-text">Smart<span>Lib</span></div></div>
        <nav className="sidebar-nav">
          <span className="nav-label">Faculty</span>
          {[['home','fa-home','Dashboard'],['search','fa-search','Search Books'],['request','fa-paper-plane','Request Books'],['myrequests','fa-clipboard-list','My Requests']].map(([s,ic,lb]) => (
            <button key={s} className={`nav-item ${section===s?'active':''}`} onClick={() => go(s)}><i className={`fas ${ic}`}></i>{lb}</button>
          ))}
          <div className="nav-divider"></div>
          {[['history','fa-history','Borrow History'],['profile','fa-user-circle','My Profile']].map(([s,ic,lb]) => (
            <button key={s} className={`nav-item ${section===s?'active':''}`} onClick={() => go(s)}><i className={`fas ${ic}`}></i>{lb}</button>
          ))}
        </nav>
        <div className="sidebar-footer"><div className="user-card">
          <div className="user-avatar" style={{background:'linear-gradient(135deg,#10b981,#047857)',color:'#fff'}}>{(me?.name||'F')[0]}</div>
          <div className="user-meta"><div className="name">{me?.name||'Faculty'}</div><div className="role">Faculty Member</div></div>
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
              <div className="hero-banner" style={{background:'linear-gradient(135deg,#064e3b,#059669)'}}>
                <div className="hero-avatar-box">{(me?.name||'F')[0]}</div>
                <div className="hero-info">
                  <h2>Welcome, Prof. {me?.name?.split(' ').slice(-1)[0]||'Faculty'}!</h2>
                  <p>{me?.department||'Faculty Member'} · {me?.email||me?.username}</p>
                </div>
              </div>
              {overdue > 0 && <div className="info-banner red"><i className="fas fa-exclamation-circle"></i><span>You have <strong>{overdue} overdue book(s)</strong>. Please return ASAP!</span></div>}
              {overdue === 0 && soon > 0 && <div className="info-banner amber"><i className="fas fa-clock"></i><span>{soon} book(s) due within 5 days. Please plan returns.</span></div>}
              <div className="stats-row">
                <div className="stat-box"><div className="stat-ico blue"><i className="fas fa-book"></i></div><div className="stat-info"><div className="value">{myIssues.length}</div><div className="label">Currently Issued</div></div></div>
                <div className="stat-box"><div className="stat-ico amber"><i className="fas fa-calendar-alt"></i></div><div className="stat-info"><div className="value">{soon}</div><div className="label">Due days</div></div></div>
                <div className="stat-box"><div className="stat-ico red"><i className="fas fa-exclamation-circle"></i></div><div className="stat-info"><div className="value">{overdue}</div><div className="label">Overdue</div></div></div>
                <div className="stat-box"><div className="stat-ico green"><i className="fas fa-history"></i></div><div className="stat-info"><div className="value">{history.length}</div><div className="label">Total History</div></div></div>
              </div>
              <div className="card">
                <div className="card-header"><span className="card-title"><i className="fas fa-book-open" style={{color:'#059669'}}></i> Currently Issued Books</span></div>
                <div className="card-body" style={{padding:0}}>
                  <div className="tbl-wrap"><table>
                    <thead><tr><th>Book</th><th>Author</th><th>Issue Date</th><th>Due Date</th><th>Status</th><th>Fine</th></tr></thead>
                    <tbody>
                      {myIssues.map((i, idx) => {
                        const b = getBookObj(i.book?._id||i.book);
                        const isOv = (i.dueDate||'') < today;
                        const due = new Date(i.dueDate); const now = new Date(today);
                        const fine = 0; // Faculty do not have fines
                        return <tr key={idx}>
                          <td className="fw-700" style={{fontSize:'.87rem'}}>{b.title}</td><td style={{fontSize:'.83rem'}}>{b.author}</td>
                          <td>{(i.issueDate||'').slice(0,10)}</td>
                          <td style={{color:isOv?'var(--err)':'',fontWeight:isOv?700:400}}>{(i.dueDate||'').slice(0,10)}</td>
                          <td>{isOv?<Pill text="Overdue" type="err"/>:<Pill text="Active" type="warn"/>}</td>
                          <td className={fine>0?'text-err fw-700':''}>₹{fine}</td>
                        </tr>;
                      })}
                      {myIssues.length === 0 && <tr><td colSpan={6}><div className="empty-state"><i className="fas fa-inbox"></i><p>No books currently issued.</p></div></td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </div>
            </div>
          )}

          {/* SEARCH */}
          {section === 'search' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-search" style={{color:'#059669',marginRight:'8px'}}></i>Search Catalog</h2></div>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">All Books</span>
                  <div className="search-wrap" style={{margin:0,width:'320px'}}><i className="fas fa-search"></i><input className="search-inp" placeholder="Title, author, ISBN…" value={searchQ} onChange={e => setSearchQ(e.target.value)}/></div>
                </div>
                <div className="card-body" style={{padding:0}}>
                  <div className="tbl-wrap"><table>
                    <thead><tr><th>Title & Author</th><th>Category</th><th>Available</th><th>Action</th></tr></thead>
                    <tbody>
                      {filteredSearch.map(b => <tr key={b._id}>
                        <td><div className="fw-700" style={{fontSize:'.87rem'}}>{b.title}</div><div style={{fontSize:'.75rem',color:'var(--muted)'}}>{b.author}</div></td>
                        <td><Pill text={b.category||'—'} type="info"/></td>
                        <td><span className={`fw-700 ${b.available>0?'text-ok':'text-err'}`}>{b.available}</span><span style={{color:'var(--muted)',fontSize:'.8rem'}}>/{b.copies}</span></td>
                        <td>{isAlreadyIssued(b._id)?<Pill text="Already Issued" type="ok"/>:hasPendingReq(b._id)?<Pill text="Request Pending" type="warn"/>:b.available<1?<Pill text="Unavailable" type="err"/>:
                          <button className="btn btn-primary btn-sm" onClick={() => sendRequest(b._id)}><i className="fas fa-paper-plane"></i> Request</button>}
                        </td>
                      </tr>)}
                      {filteredSearch.length===0 && <tr><td colSpan={4}><div className="empty-state"><i className="fas fa-inbox"></i><p>No books found</p></div></td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </div>
            </div>
          )}

          {/* REQUEST */}
          {section === 'request' && (
            <div>
              <div className="section-hd" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h2><i className="fas fa-paper-plane" style={{color:'#d97706',marginRight:'8px'}}></i>Request Books</h2>
                <button className="btn btn-primary" onClick={() => setShowSuggest(true)}><i className="fas fa-lightbulb"></i> Suggest New Book to Admin</button>
              </div>
              <div className="info-banner blue"><i className="fas fa-info-circle"></i><span>Faculty can borrow up to 10 books for up to 30 days. Submit requests and track their status.</span></div>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Available Books</span>
                  <div className="search-wrap" style={{margin:0,width:'280px'}}><i className="fas fa-search"></i><input className="search-inp" placeholder="Filter here…" value={reqQ} onChange={e => setReqQ(e.target.value)}/></div>
                </div>
                <div className="card-body" style={{padding:0}}>
                  <div className="tbl-wrap"><table>
                    <thead><tr><th>Title & Author</th><th>Category</th><th>Available</th><th>Action</th></tr></thead>
                    <tbody>
                      {filteredReq.map(b => <tr key={b._id}>
                        <td><div className="fw-700" style={{fontSize:'.87rem'}}>{b.title}</div><div style={{fontSize:'.75rem',color:'var(--muted)'}}>{b.author}{b.publisher?` · ${b.publisher}`:''}</div></td>
                        <td><Pill text={b.category||'—'} type="info"/></td>
                        <td><span className={`fw-700 ${b.available>0?'text-ok':'text-err'}`}>{b.available}</span></td>
                        <td>{isAlreadyIssued(b._id)?<Pill text="Already Issued" type="ok"/>:hasPendingReq(b._id)?<Pill text="Request Pending" type="warn"/>:b.available<1?<Pill text="Unavailable" type="err"/>:
                          <button className="btn btn-primary btn-sm" onClick={() => sendRequest(b._id)}><i className="fas fa-paper-plane"></i> Request</button>}
                        </td>
                      </tr>)}
                      {filteredReq.length===0 && <tr><td colSpan={4}><div className="empty-state"><i className="fas fa-inbox"></i><p>No books match</p></div></td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </div>
            </div>
          )}

          {/* MY REQUESTS */}
          {section === 'myrequests' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-clipboard-list" style={{color:'#7c3aed',marginRight:'8px'}}></i>My Requests</h2></div>
              <div className="card"><div className="card-body" style={{padding:0}}>
                <div className="tbl-wrap"><table>
                  <thead><tr><th>Book</th><th>Requested On</th><th>Note</th><th>Status</th></tr></thead>
                  <tbody>
                    {[...myRequests].reverse().map((r, idx) => {
                      const b = getBookObj(r.book?._id||r.bookId);
                      const st = r.status==='pending'?<Pill text="Pending" type="warn"/>:r.status==='approved'?<Pill text="Approved" type="ok"/>:<Pill text="Rejected" type="err"/>;
                      return <tr key={idx}>
                        <td className="fw-700" style={{fontSize:'.87rem'}}>{b.title}</td>
                        <td>{(r.requestDate||r.createdAt||'').slice(0,10)}</td>
                        <td style={{fontSize:'.82rem'}}>{r.note||'—'}</td>
                        <td>{st}{r.message&&<div style={{fontSize:'.75rem',color:'var(--err)',marginTop:'3px'}}>{r.message}</div>}</td>
                      </tr>;
                    })}
                    {myRequests.length===0 && <tr><td colSpan={4}><div className="empty-state"><i className="fas fa-inbox"></i><p>No requests submitted yet</p></div></td></tr>}
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
                      const b = getBookObj(i.book?._id||i.book);
                      const retDate = i.returnDate?(i.returnDate+'').slice(0,10):today;
                      const due=new Date(i.dueDate);const ret=new Date(retDate);
                      const fine=0; // Faculty do not have fines
                      const st=i.returnDate?<Pill text="Returned" type="ok"/>:(i.dueDate||'')<today?<Pill text="Overdue" type="err"/>:<Pill text="Active" type="warn"/>;
                      return <tr key={idx}>
                        <td className="fw-700" style={{fontSize:'.86rem'}}>{b.title}</td>
                        <td>{(i.issueDate||'').slice(0,10)}</td><td>{(i.dueDate||'').slice(0,10)}</td>
                        <td>{i.returnDate?(i.returnDate+'').slice(0,10):'—'}</td>
                        <td className={fine>0?'text-err fw-700':''}>₹{fine}</td><td>{st}</td>
                      </tr>;
                    })}
                    {history.length===0 && <tr><td colSpan={6}><div className="empty-state"><i className="fas fa-inbox"></i><p>No history yet</p></div></td></tr>}
                  </tbody>
                </table></div>
              </div></div>
            </div>
          )}

          {/* PROFILE */}
          {section === 'profile' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-user-circle" style={{marginRight:'8px'}}></i>My Profile</h2></div>
              <div className="card"><div className="card-body">
                <div style={{display:'flex',alignItems:'center',gap:'1.5rem',marginBottom:'2rem',flexWrap:'wrap'}}>
                  <div style={{width:'88px',height:'88px',borderRadius:'50%',background:'linear-gradient(135deg,#064e3b,#10b981)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2.2rem',fontWeight:800,color:'#fff'}}>{(me?.name||'F')[0]}</div>
                  <div><h2 style={{fontSize:'1.5rem'}}>{me?.name||'Faculty'}</h2><p className="text-muted">{me?.email||'No email'}</p></div>
                </div>
                <div className="form-grid">
                  {[['Employee ID',me?.employeeId||me?.username],['Department',me?.department||'—'],['Phone',me?.phone||'—'],['Role','Faculty']].map(([l,v]) => (
                    <div key={l} style={{background:'var(--bg)',borderRadius:'12px',padding:'1rem'}}>
                      <div style={{fontSize:'.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.04em'}}>{l}</div>
                      <div className="fw-700 mt-1">{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:'1.5rem'}}>
                  <button className="btn btn-primary" onClick={() => setShowChangePwd(true)}><i className="fas fa-key"></i> Change Password</button>
                </div>
                <div className="stats-row" style={{marginTop:'1.5rem'}}>
                  <div className="stat-box"><div className="stat-ico blue"><i className="fas fa-book"></i></div><div className="stat-info"><div className="value">{history.length}</div><div className="label">Total Borrowed</div></div></div>
                  <div className="stat-box"><div className="stat-ico green"><i className="fas fa-check"></i></div><div className="stat-info"><div className="value">{history.filter(i=>i.returnDate).length}</div><div className="label">Returned</div></div></div>
                  <div className="stat-box"><div className="stat-ico amber"><i className="fas fa-clock"></i></div><div className="stat-info"><div className="value">{myIssues.length}</div><div className="label">Active</div></div></div>
                </div>
              </div></div>
            </div>
          )}
        </div>
      </div>

      <Modal title={<><i className="fas fa-lightbulb" style={{color:'#d97706'}}></i> Suggest Book to Admin</>} open={showSuggest} onClose={() => setShowSuggest(false)}>
        <div className="form-grid">
          <div className="form-group" style={{gridColumn:'1/-1'}}><label>Book Title *</label><input className="inp" value={suggestBook.title} onChange={e => setSuggestBook(b => ({...b, title:e.target.value}))} placeholder="e.g. Clean Code"/></div>
          <div className="form-group" style={{gridColumn:'1/-1'}}><label>Author</label><input className="inp" value={suggestBook.author} onChange={e => setSuggestBook(b => ({...b, author:e.target.value}))}/></div>
          <div className="form-group" style={{gridColumn:'1/-1'}}><label>Reason / Note</label><input className="inp" value={suggestBook.note} onChange={e => setSuggestBook(b => ({...b, note:e.target.value}))} placeholder="Why should library add this?"/></div>
        </div>
        <div className="modal-footer" style={{marginTop:'1.5rem',display:'flex',gap:'10px',justifyContent:'flex-end'}}>
          <button className="btn btn-outline" onClick={() => setShowSuggest(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSuggestBook}><i className="fas fa-paper-plane"></i> Send Suggestion</button>
        </div>
      </Modal>

      <Modal title={<><i className="fas fa-key" style={{color:'#d97706'}}></i> Change Password</>} open={showChangePwd} onClose={() => setShowChangePwd(false)}>
        <div className="form-group" style={{marginTop:'1rem'}}>
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
