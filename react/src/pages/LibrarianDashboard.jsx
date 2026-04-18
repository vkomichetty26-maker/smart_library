import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '../utils/auth';
import { booksAPI, usersAPI, issuesAPI, requestsAPI, feedbackAPI, settingsAPI, statsAPI, notificationsAPI } from '../utils/api';
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

function FeedItem({ color, name, title, sub, subColor }) {
  return (
    <div style={{display:'flex',gap:'.75rem',padding:'.7rem 1.5rem',borderBottom:'1px solid #f8fafc',alignItems:'flex-start'}}>
      <div style={{width:'10px',height:'10px',borderRadius:'50%',background:color,marginTop:'5px',flexShrink:0}}></div>
      <div>
        <div style={{fontSize:'.87rem'}}><strong>{name}</strong> – {title}</div>
        <div style={{fontSize:'.75rem',color:subColor||'var(--muted)',marginTop:'2px',fontWeight:subColor?700:400}}>{sub}</div>
      </div>
    </div>
  );
}

export default function LibrarianDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const session = getSession();
  const [section, setSection] = useState('overview');
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [requests, setRequests] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [settings, setSettings] = useState({ finePerDay:5, daysStudent:14, daysFaculty:30 });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [seenNotifs, setSeenNotifs] = useState(new Set());
  const [dbNotifications, setDbNotifications] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestBook, setSuggestBook] = useState({ title: '', author: '', note: '' });
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [newPwd, setNewPwd] = useState('');

  async function handleChangePassword() {
    if (!newPwd) { toast('Please enter a new password', 'err'); return; }
    try {
      await usersAPI.update(session.id, { password: newPwd });
      toast('Password changed successfully!', 'ok');
      setShowChangePwd(false);
      setNewPwd('');
    } catch(e) {
      toast('Failed to change password', 'err');
    }
  }

  // Issue book
  const [issueUser, setIssueUser] = useState('');
  const [issueBook, setIssueBook] = useState('');
  const [issuePreview, setIssuePreview] = useState('');
  const [bookSearch, setBookSearch] = useState('');

  // Return search
  const [returnSearch, setReturnSearch] = useState('');

  // Catalog search
  const [catSearch, setCatSearch] = useState('');

  // Members search
  const [memSearch, setMemSearch] = useState('');

  // Request filter
  const [reqFilter, setReqFilter] = useState('pending');

  useEffect(() => {
    if (!session || session.role !== 'librarian') { navigate('/login'); return; }
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [b, u, i, r, f, s, notifs] = await Promise.all([
        booksAPI.getAll(), usersAPI.getAll(), issuesAPI.getAll(),
        requestsAPI.getAll(), feedbackAPI.getAll(), settingsAPI.get(), notificationsAPI.getByUser(session?.id)
      ]);
      setBooks(b.data); setUsers(u.data); setIssues(i.data);
      setRequests(r.data); setFeedback(f.data); setDbNotifications(notifs.data);
      if (s.data) setSettings(s.data);
    } catch { toast('Backend not connected', 'err'); }
  }

  function logout() { clearSession(); navigate('/'); }
  function go(s) { setSection(s); setSidebarOpen(false); }

  async function handleSuggestBook() {
    if (!suggestBook.title) { toast('Please provide a title.', 'err'); return; }
    try {
      await notificationsAPI.create({
        role: 'admin',
        title: 'New Book Suggestion',
        text: `Librarian ${session?.name} suggested adding "${suggestBook.title}" by ${suggestBook.author||'Unknown'}. ${suggestBook.note ? 'Note: '+suggestBook.note : ''}`,
        icon: 'fa-solid fa-lightbulb text-info'
      });
      toast('Suggestion sent to admin!', 'ok');
      setShowSuggest(false);
      setSuggestBook({ title: '', author: '', note: '' });
    } catch(e) { toast('Error sending suggestion.', 'err'); }
  }

  const today = new Date().toISOString().slice(0,10);

  function calcFine(issue, overrideReturnDate) {
    if (!issue) return 0;
    const u = getUser(issue.user);
    if (u && u.role === 'faculty') return 0;
    const due = new Date(issue.dueDate); const ret = new Date(overrideReturnDate || issue.returnDate || today);
    if (ret <= due) return 0;
    return Math.ceil((ret - due) / 86400000) * (settings.finePerDay || 5);
  }
  function getName(id) { const u = users.find(x => x._id === (id?._id || id)); return u?.name || '?'; }
  function getTitle(id) { const b = books.find(x => x._id === (id?._id || id)); return b?.title || '?'; }
  function getUser(id) { return users.find(x => x._id === (id?._id || id)); }
  function getBook(id) { return books.find(x => x._id === (id?._id || id)); }

  const activeIssues = issues.filter(i => !i.returnDate);
  const overdueIssues = activeIssues.filter(i => (i.dueDate?.toString().slice(0,10) || '') < today);
  const pendingReqs = requests.filter(r => r.status === 'pending');

  const notifications = [];
  if (pendingReqs.length > 0) notifications.push({ id:'reqs', icon:'fa-clipboard-list text-info', title:'Pending Requests', text:`${pendingReqs.length} book request(s) waiting for approval.`, time:'Action Required' });
  if (overdueIssues.length > 0) notifications.push({ id:'ov', icon:'fa-exclamation-circle text-err', title:'Overdue Issues', text:`There are ${overdueIssues.length} overdue books to follow up on.`, time:'Alert' });
  dbNotifications.forEach(n => {
    notifications.push({ id: n._id, icon: n.icon, title: n.title, text: n.text, time: (n.createdAt||'').slice(0,10), isRead: n.isRead, isDb: true });
  });

  const pageMeta = {
    overview:  ['Dashboard',       'Library circulation overview'],
    requests:  ['Book Requests',   'Member book requests awaiting action'],
    issue:     ['Issue Book',      'Assign book to member'],
    return:    ['Return Book',     'Process book returns'],
    overdue:   ['Overdue Books',   'Track overdue items'],
    catalog:   ['Book Catalog',    'Browse all books'],
    members:   ['Members',         'View member details'],
    feedback:  ['Member Feedback', 'View submitted feedback'],
    profile:   ['My Profile',      'Your account settings'],
  };
  const [ptitle, psub] = pageMeta[section] || [section, ''];

  // ─── ISSUE BOOK ───
  const filteredBooksForIssue = books.filter(b =>
    b.available > 0 && (!bookSearch || b.title.toLowerCase().includes(bookSearch.toLowerCase()) || b.author.toLowerCase().includes(bookSearch.toLowerCase()))
  );

  function onIssueUserChange(uid) {
    setIssueUser(uid); buildPreview(uid, issueBook);
  }
  function onIssueBookChange(bid) {
    setIssueBook(bid); buildPreview(issueUser, bid);
  }
  function buildPreview(uid, bid) {
    if (!uid || !bid) { setIssuePreview(''); return; }
    const u = users.find(x => x._id === uid); const b = books.find(x => x._id === bid);
    if (!u || !b) { setIssuePreview(''); return; }
    const days = u.role === 'faculty' ? (settings.daysFaculty || 30) : (settings.daysStudent || 14);
    const due = new Date(); due.setDate(due.getDate() + days);
    setIssuePreview(`<strong>${u.name}</strong> will receive <strong>${b.title}</strong> — due on <strong>${due.toISOString().slice(0,10)}</strong> (${days} days)`);
  }

  async function handleIssue() {
    if (!issueUser || !issueBook) { toast('Select member and book', 'err'); return; }
    try {
      const u = users.find(x => x._id === issueUser); const role = u?.role || 'student';
      const days = role === 'faculty' ? (settings.daysFaculty||30) : (settings.daysStudent||14);
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + days);
      await issuesAPI.issue({ userId: issueUser, bookId: issueBook, dueDate: dueDate.toISOString().slice(0,10) });
      toast('Book issued successfully!', 'ok');
      setIssueUser(''); setIssueBook(''); setIssuePreview('');
      loadAll();
    } catch(e) { toast(e.response?.data?.message || 'Error issuing book', 'err'); }
  }

  // ─── RETURN ───
  const filteredReturns = activeIssues.filter(i => {
    const q = returnSearch.toLowerCase();
    const uName = i.user?.name || getName(i.user); const bTitle = i.book?.title || getTitle(i.book);
    return !q || uName.toLowerCase().includes(q) || bTitle.toLowerCase().includes(q);
  });

  async function handleReturn(issueId, fine) {
    try {
      await issuesAPI.return(issueId, { fine, returnDate: today });
      toast(`Book returned! Fine: ₹${fine}`, 'ok');
      loadAll();
    } catch(e) { toast(e.response?.data?.message || 'Error', 'err'); }
  }

  // ─── REQUESTS ───
  const filteredReqs = requests.filter(r => reqFilter === 'all' ? true : r.status === reqFilter).reverse();

  async function handleApprove(req) {
    try {
      const u = getUser(req.user?._id || req.userId); const role = u?.role || 'student';
      const days = role === 'faculty' ? (settings.daysFaculty||30) : (settings.daysStudent||14);
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + days);
      await requestsAPI.approve(req._id, { bookId: req.book?._id||req.bookId, userId: req.user?._id||req.userId, dueDate: dueDate.toISOString().slice(0,10), days });
      toast('Request approved & book issued!', 'ok'); loadAll();
    } catch(e) { toast(e.response?.data?.message || 'Error', 'err'); }
  }

  async function handleReject(req) {
    try {
      await requestsAPI.reject(req._id, { message: 'Request rejected by librarian.' });
      toast('Request rejected', 'ok'); loadAll();
    } catch(e) { toast(e.response?.data?.message || 'Error', 'err'); }
  }

  // ─── CATALOG ───
  const filteredCatalog = books.filter(b => {
    const q = catSearch.toLowerCase();
    return !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || (b.isbn&&b.isbn.includes(q)) || (b.category&&b.category.toLowerCase().includes(q));
  });

  // ─── MEMBERS ───
  const filteredMembers = users.filter(u => (u.role==='student'||u.role==='faculty') && (!memSearch || (u.name||'').toLowerCase().includes(memSearch.toLowerCase()) || u.username.toLowerCase().includes(memSearch.toLowerCase())));

  // ─── TODAY's ACTIVITY ───
  const todayActivity = [
    ...issues.filter(i => (i.issueDate?.toString().slice(0,10)||'') === today).map(i => ({...i, act:'Issued'})),
    ...issues.filter(i => (i.returnDate?.toString().slice(0,10)||'') === today).map(i => ({...i, act:'Returned'}))
  ].slice(0,6);

  // ─── OVERDUE FEED (for dashboard) ───
  const overdueFeed = overdueIssues.slice(0,5);

  // ─── RECENT TX ───
  const recentTx = [...issues].reverse().slice(0,8);

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen?'open':''}`} style={{background:'linear-gradient(180deg,#78350f 0%,#92400e 50%,#b45309 100%)'}}>
        <div className="sidebar-brand">
          <div className="brand-icon"><i className="fas fa-book-open-reader"></i></div>
          <div className="brand-text">Smart<span>Lib</span></div>
        </div>
        <nav className="sidebar-nav">
          <span className="nav-label">Librarian</span>
          <button className={`nav-item ${section==='overview'?'active':''}`} onClick={() => go('overview')}><i className="fas fa-chart-pie"></i>Dashboard</button>
          <button className={`nav-item ${section==='requests'?'active':''}`} onClick={() => go('requests')}>
            <i className="fas fa-clipboard-list"></i>Book Requests
            {pendingReqs.length > 0 && <span style={{marginLeft:'auto',background:'#ef4444',color:'#fff',borderRadius:'30px',padding:'.1rem .5rem',fontSize:'.7rem',fontWeight:700}}>{pendingReqs.length}</span>}
          </button>
          <button className={`nav-item ${section==='issue'?'active':''}`} onClick={() => go('issue')}><i className="fas fa-paper-plane"></i>Issue Book</button>
          <button className={`nav-item ${section==='return'?'active':''}`} onClick={() => go('return')}><i className="fas fa-undo-alt"></i>Return Book</button>
          <button className={`nav-item ${section==='overdue'?'active':''}`} onClick={() => go('overdue')}>
            <i className="fas fa-exclamation-circle"></i>Overdue
            {overdueIssues.length > 0 && <span style={{marginLeft:'auto',background:'#ef4444',color:'#fff',borderRadius:'30px',padding:'.1rem .5rem',fontSize:'.7rem',fontWeight:700}}>{overdueIssues.length}</span>}
          </button>
          <div className="nav-divider"></div>
          <span className="nav-label">Catalog</span>
          <button className={`nav-item ${section==='catalog'?'active':''}`} onClick={() => go('catalog')}><i className="fas fa-book"></i>Book Catalog</button>
          <button className={`nav-item ${section==='members'?'active':''}`} onClick={() => go('members')}><i className="fas fa-users"></i>Members</button>
          <button className={`nav-item ${section==='feedback'?'active':''}`} onClick={() => go('feedback')}><i className="fas fa-star"></i>Feedback</button>
          <button className={`nav-item ${section==='profile'?'active':''}`} onClick={() => go('profile')}><i className="fas fa-user-circle"></i>My Profile</button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar" style={{background:'rgba(255,255,255,.25)',color:'#fff'}}>{(session?.name||'L')[0]}</div>
            <div className="user-meta"><div className="name">{session?.name||'Librarian'}</div><div className="role">Library Staff</div></div>
          </div>
        </div>
      </aside>

      {/* Main */}
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
                    <div className="notif-empty"><i className="fas fa-bell-slash"></i> All caught up!</div>
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

          {/* ══ OVERVIEW DASHBOARD ══ */}
          {section === 'overview' && (
            <div>
              {/* Stats */}
              <div className="stats-row">
                <div className="stat-box"><div className="stat-ico amber"><i className="fas fa-hand-holding"></i></div><div className="stat-info"><div className="value">{activeIssues.length}</div><div className="label">Active Issues</div></div></div>
                <div className="stat-box"><div className="stat-ico green"><i className="fas fa-undo-alt"></i></div><div className="stat-info"><div className="value">{issues.filter(i=>(i.returnDate?.toString().slice(0,10)||'')===today).length}</div><div className="label">Returns Today</div></div></div>
                <div className="stat-box"><div className="stat-ico red"><i className="fas fa-exclamation-circle"></i></div><div className="stat-info"><div className="value">{overdueIssues.length}</div><div className="label">Overdue</div></div></div>
                <div className="stat-box"><div className="stat-ico blue"><i className="fas fa-book"></i></div><div className="stat-info"><div className="value">{books.reduce((a,b)=>a+b.available,0)}</div><div className="label">Books Available</div></div></div>
                <div className="stat-box"><div className="stat-ico red"><i className="fas fa-coins"></i></div><div className="stat-info"><div className="value">₹{overdueIssues.reduce((a,i)=>a+calcFine(i),0)}</div><div className="label">Pending Fines</div></div></div>
              </div>

              {/* Today's Activity + Overdue Alerts */}
              <div className="card-grid grid-2 mb-2">
                {/* Today's Activity */}
                <div className="card">
                  <div className="card-header"><span className="card-title"><i className="fas fa-clock" style={{color:'var(--warn)'}}></i> Today's Activity</span></div>
                  <div className="card-body" style={{padding:0}}>
                    {todayActivity.length === 0
                      ? <div className="empty-state"><i className="fas fa-calendar-day"></i><p>No activity today yet</p></div>
                      : todayActivity.map((i, idx) => {
                          const uName = i.user?.name || getName(i.user);
                          const bTitle = (i.book?.title || getTitle(i.book))?.substring(0,24);
                          const type = i.act;
                          return <FeedItem key={idx} color={type==='Returned'?'var(--ok)':'var(--warn)'} name={uName} title={bTitle} sub={type}/>;
                        })
                    }
                  </div>
                </div>

                {/* Overdue Alerts */}
                <div className="card">
                  <div className="card-header"><span className="card-title"><i className="fas fa-fire" style={{color:'var(--err)'}}></i> Overdue Alerts</span></div>
                  <div className="card-body" style={{padding:0}}>
                    {overdueFeed.length === 0
                      ? <div className="empty-state"><i className="fas fa-check-circle"></i><p>No overdue books! 🎉</p></div>
                      : overdueFeed.map((i, idx) => {
                          const uName = i.user?.name || getName(i.user);
                          const bTitle = (i.book?.title || getTitle(i.book))?.substring(0,22);
                          const days = Math.ceil((new Date(today) - new Date(i.dueDate)) / 86400000);
                          const fineAmount = calcFine(i);
                          return <FeedItem key={idx} color="var(--err)" name={uName} title={bTitle} sub={`${days} days overdue${fineAmount>0 ? ` · ₹${fineAmount}` : ''}`} subColor="var(--err)"/>;
                        })
                    }
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="card">
                <div className="card-header"><span className="card-title"><i className="fas fa-list"></i> Recent Transactions</span></div>
                <div className="card-body" style={{padding:0}}>
                  <div className="tbl-wrap"><table>
                    <thead><tr><th>Member</th><th>Book</th><th>Issued</th><th>Due</th><th>Status</th><th>Fine</th></tr></thead>
                    <tbody>
                      {recentTx.map((i, idx) => {
                        const uName = i.user?.name || getName(i.user);
                        const bTitle = (i.book?.title || getTitle(i.book))?.substring(0,26);
                        const fine = calcFine(i);
                        const isOv = !i.returnDate && (i.dueDate?.toString().slice(0,10)||'') < today;
                        const st = i.returnDate ? <Pill text="Returned" type="ok"/> : isOv ? <Pill text="Overdue" type="err"/> : <Pill text="Active" type="warn"/>;
                        return <tr key={idx}>
                          <td className="fw-700" style={{fontSize:'.86rem'}}>{uName}</td>
                          <td style={{fontSize:'.84rem'}}>{bTitle}</td>
                          <td>{(i.issueDate?.toString()||'').slice(0,10)}</td>
                          <td style={{color:isOv?'var(--err)':'',fontWeight:isOv?700:400}}>{(i.dueDate?.toString()||'').slice(0,10)}</td>
                          <td>{st}</td>
                          <td className={fine>0?'text-err fw-700':''}>₹{fine}</td>
                        </tr>;
                      })}
                      {issues.length === 0 && <tr><td colSpan={6}><div className="empty-state"><i className="fas fa-inbox"></i><p>No transactions yet</p></div></td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </div>
            </div>
          )}

          {/* ══ BOOK REQUESTS ══ */}
          {section === 'requests' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-clipboard-list" style={{color:'#7c3aed',marginRight:'8px'}}></i>Book Requests</h2></div>
              {pendingReqs.length > 0 && <div className="info-banner amber"><i className="fas fa-clock"></i><span><strong>{pendingReqs.length} pending request(s)</strong> awaiting your review.</span></div>}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Member Requests</span>
                  <select className="inp" style={{width:'150px',borderRadius:'30px',margin:0}} value={reqFilter} onChange={e => setReqFilter(e.target.value)}>
                    <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All</option>
                  </select>
                </div>
                <div className="card-body" style={{padding:0}}>
                  <div className="tbl-wrap"><table>
                    <thead><tr><th>Member</th><th>Book</th><th>Requested</th><th>Note</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {filteredReqs.map((r, idx) => {
                        const uName = r.user?.name || getName(r.userId||r.user?._id);
                        const uSub  = r.user?.rollNo || r.user?.employeeId || r.user?.username || '';
                        const bTitle = r.book?.title || getTitle(r.bookId||r.book?._id);
                        const bAvail = books.find(x=>x._id===(r.book?._id||r.bookId))?.available || 0;
                        const isPending = r.status === 'pending';
                        const st = r.status==='pending'?<Pill text="Pending" type="warn"/>:r.status==='approved'?<Pill text="Approved" type="ok"/>:<Pill text="Rejected" type="err"/>;
                        return <tr key={idx}>
                          <td><div className="fw-700" style={{fontSize:'.86rem'}}>{uName}</div><div style={{fontSize:'.74rem',color:'var(--muted)'}}>{uSub}</div></td>
                          <td style={{fontSize:'.84rem'}}>{bTitle?.substring(0,28)}<br/><span style={{fontSize:'.75rem',color:bAvail>0?'var(--ok)':'var(--err)'}}>Available: {bAvail}</span></td>
                          <td>{(r.requestDate||r.createdAt||'').toString().slice(0,10)}</td>
                          <td style={{fontSize:'.8rem',color:'var(--muted)'}}>{r.note||'—'}</td>
                          <td>{st}</td>
                          <td>{isPending && <div className="flex gap-sm">
                            <button className="btn btn-success btn-sm" onClick={() => handleApprove(r)} disabled={bAvail<1}><i className="fas fa-check"></i> Approve</button>
                            <button className="btn btn-outline btn-sm" onClick={() => handleReject(r)}><i className="fas fa-times"></i> Reject</button>
                          </div>}</td>
                        </tr>;
                      })}
                      {filteredReqs.length===0 && <tr><td colSpan={6}><div className="empty-state"><i className="fas fa-inbox"></i><p>No requests found.</p></div></td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </div>
            </div>
          )}

          {/* ══ ISSUE BOOK ══ */}
          {section === 'issue' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-paper-plane" style={{color:'#d97706',marginRight:'8px'}}></i>Issue Book</h2></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2rem'}}>
                {/* Left: Form */}
                <div className="card">
                  <div className="card-header"><span className="card-title">Select Member &amp; Book</span></div>
                  <div className="card-body">
                    <div className="form-group">
                      <label>Member</label>
                      <select className="inp" value={issueUser} onChange={e => onIssueUserChange(e.target.value)}>
                        <option value="">— Select Member —</option>
                        {users.filter(u=>u.role==='student'||u.role==='faculty').map(u => (
                          <option key={u._id} value={u._id}>{u.name} ({u.role}) · {u.rollNo||u.username}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Book</label>
                      <div className="search-wrap" style={{marginBottom:'.5rem'}}><i className="fas fa-search"></i><input className="search-inp" placeholder="Search books…" value={bookSearch} onChange={e => setBookSearch(e.target.value)}/></div>
                      <select className="inp" size={5} style={{height:'160px'}} value={issueBook} onChange={e => onIssueBookChange(e.target.value)}>
                        {filteredBooksForIssue.map(b => <option key={b._id} value={b._id}>{b.title} [{b.available} avail.]</option>)}
                      </select>
                    </div>
                    {issuePreview && (
                      <div className="info-banner blue" style={{marginBottom:'1rem'}} dangerouslySetInnerHTML={{__html:'<i class="fas fa-info-circle"></i> <span>'+issuePreview+'</span>'}}/>
                    )}
                    <button className="btn btn-success" onClick={handleIssue} disabled={!issueUser||!issueBook}><i className="fas fa-paper-plane"></i> Issue Book</button>
                  </div>
                </div>

                {/* Right: Recently Issued */}
                <div className="card">
                  <div className="card-header"><span className="card-title"><i className="fas fa-clock"></i> Recently Issued</span></div>
                  <div className="card-body" style={{padding:0}}>
                    <div className="tbl-wrap"><table>
                      <thead><tr><th>Member</th><th>Book</th><th>Due</th><th>Status</th></tr></thead>
                      <tbody>
                        {activeIssues.slice(-5).reverse().map((i, idx) => {
                          const uName = i.user?.name || getName(i.user);
                          const bTitle = (i.book?.title || getTitle(i.book))?.substring(0,22);
                          const isOv = (i.dueDate?.toString().slice(0,10)||'') < today;
                          return <tr key={idx}>
                            <td className="fw-700" style={{fontSize:'.84rem'}}>{uName}</td>
                            <td style={{fontSize:'.83rem'}}>{bTitle}</td>
                            <td style={{color:isOv?'var(--err)':'',fontWeight:isOv?700:400}}>{(i.dueDate?.toString()||'').slice(0,10)}</td>
                            <td>{isOv?<Pill text="Overdue" type="err"/>:<Pill text="Active" type="warn"/>}</td>
                          </tr>;
                        })}
                        {activeIssues.length===0 && <tr><td colSpan={4}><div className="empty-state"><i className="fas fa-inbox"></i><p>No active issues</p></div></td></tr>}
                      </tbody>
                    </table></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ RETURN BOOK ══ */}
          {section === 'return' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-undo-alt" style={{color:'#059669',marginRight:'8px'}}></i>Process Return</h2></div>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Active Borrowings</span>
                  <div className="search-wrap" style={{margin:0,width:'280px'}}><i className="fas fa-search"></i><input className="search-inp" placeholder="Search member or book…" value={returnSearch} onChange={e => setReturnSearch(e.target.value)}/></div>
                </div>
                <div className="card-body" style={{padding:0}}>
                  <div className="tbl-wrap"><table>
                    <thead><tr><th>Member</th><th>Book</th><th>Issued</th><th>Due</th><th>Fine</th><th>Action</th></tr></thead>
                    <tbody>
                      {filteredReturns.reverse().map((i, idx) => {
                        const uName = i.user?.name || getName(i.user);
                        const bTitle = (i.book?.title || getTitle(i.book))?.substring(0,26);
                        const fine = calcFine(i, today);
                        const isOv = (i.dueDate?.toString().slice(0,10)||'') < today;
                        return <tr key={idx}>
                          <td className="fw-700" style={{fontSize:'.86rem'}}>{uName}</td>
                          <td style={{fontSize:'.83rem'}}>{bTitle}</td>
                          <td>{(i.issueDate?.toString()||'').slice(0,10)}</td>
                          <td style={{color:isOv?'var(--err)':'',fontWeight:isOv?700:400}}>{(i.dueDate?.toString()||'').slice(0,10)}{isOv?' ⚠️':''}</td>
                          <td className={fine>0?'text-err fw-700':''}>₹{fine}</td>
                          <td><button className="btn btn-success btn-sm" onClick={() => handleReturn(i._id, fine)}><i className="fas fa-undo"></i> Return</button></td>
                        </tr>;
                      })}
                      {filteredReturns.length===0 && <tr><td colSpan={6}><div className="empty-state"><i className="fas fa-inbox"></i><p>No active borrowings match</p></div></td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </div>
            </div>
          )}

          {/* ══ OVERDUE BOOKS ══ */}
          {section === 'overdue' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-exclamation-circle" style={{color:'var(--err)',marginRight:'8px'}}></i>Overdue Books</h2></div>
              {overdueIssues.length > 0 && <div className="info-banner red"><i className="fas fa-exclamation-circle"></i><span><strong>{overdueIssues.length} overdue book(s)</strong> — total pending fine: ₹{overdueIssues.reduce((a,i)=>a+calcFine(i),0)}</span></div>}
              <div className="card">
                <div className="card-header"><span className="card-title">All Overdue Issues</span></div>
                <div className="card-body" style={{padding:0}}>
                  <div className="tbl-wrap"><table>
                    <thead><tr><th>Member</th><th>Contact</th><th>Book</th><th>Due Date</th><th>Days Overdue</th><th>Fine</th><th>Action</th></tr></thead>
                    <tbody>
                      {[...overdueIssues].sort((a,b) => (a.dueDate?.toString()||'').localeCompare(b.dueDate?.toString()||'')).map((i, idx) => {
                        const u = getUser(i.user?._id || i.user);
                        const bTitle = (i.book?.title || getTitle(i.book))?.substring(0,24);
                        const days = Math.ceil((new Date(today) - new Date(i.dueDate)) / 86400000);
                        const fine = calcFine(i);
                        return <tr key={idx}>
                          <td><div className="fw-700" style={{fontSize:'.86rem'}}>{u?.name||'?'}</div><div style={{fontSize:'.75rem',color:'var(--muted)'}}>{u?.department||''}</div></td>
                          <td style={{fontSize:'.8rem'}}>{u?.email||u?.phone||'—'}</td>
                          <td style={{fontSize:'.83rem'}}>{bTitle}</td>
                          <td className="text-err fw-700">{(i.dueDate?.toString()||'').slice(0,10)}</td>
                          <td className="text-err fw-700">{days} days</td>
                          <td className="text-err fw-700">₹{fine}</td>
                          <td><button className="btn btn-success btn-sm" onClick={() => handleReturn(i._id, fine)}><i className="fas fa-undo"></i> Return</button></td>
                        </tr>;
                      })}
                      {overdueIssues.length===0 && <tr><td colSpan={7}><div className="empty-state"><i className="fas fa-check-circle"></i><p>✅ All books returned on time</p></div></td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </div>
            </div>
          )}

          {/* ══ BOOK CATALOG ══ */}
          {section === 'catalog' && (
            <div>
              <div className="section-hd" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h2><i className="fas fa-book" style={{color:'#2563eb',marginRight:'8px'}}></i>Book Catalog</h2>
                <button className="btn btn-primary" onClick={() => setShowSuggest(true)}><i className="fas fa-lightbulb"></i> Suggest New Book to Admin</button>
              </div>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">All Books <span style={{background:'#f1f5f9',borderRadius:'20px',padding:'.15rem .6rem',fontSize:'.78rem',marginLeft:'6px',fontWeight:600}}>{filteredCatalog.length} books</span></span>
                  <div className="search-wrap" style={{margin:0,width:'300px'}}><i className="fas fa-search"></i><input className="search-inp" placeholder="Title, author, ISBN, category…" value={catSearch} onChange={e => setCatSearch(e.target.value)}/></div>
                </div>
                <div className="card-body" style={{padding:0}}>
                  <div className="tbl-wrap"><table>
                    <thead><tr><th>Title &amp; Author</th><th>ISBN</th><th>Category</th><th>Total</th><th>Available</th><th>Location</th></tr></thead>
                    <tbody>
                      {filteredCatalog.map(b => (
                        <tr key={b._id}>
                          <td><div className="fw-700" style={{fontSize:'.87rem'}}>{b.title}</div><div style={{fontSize:'.75rem',color:'var(--muted)'}}>{b.author}{b.edition?` · ${b.edition} ed.`:''}</div></td>
                          <td><code style={{fontSize:'.8rem'}}>{b.isbn}</code></td>
                          <td><Pill text={b.category||'—'} type="info"/></td>
                          <td className="fw-700">{b.copies}</td>
                          <td><span className={`fw-700 ${b.available>0?'text-ok':'text-err'}`}>{b.available}</span><span style={{color:'var(--muted)',fontSize:'.8rem'}}>/{b.copies}</span></td>
                          <td style={{fontSize:'.83rem'}}>{b.location||'—'}</td>
                        </tr>
                      ))}
                      {filteredCatalog.length===0 && <tr><td colSpan={6}><div className="empty-state"><i className="fas fa-inbox"></i><p>No books found</p></div></td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </div>
            </div>
          )}

          {/* ══ MEMBERS ══ */}
          {section === 'members' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-users" style={{color:'#7c3aed',marginRight:'8px'}}></i>Members</h2></div>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">All Members</span>
                  <div className="search-wrap" style={{margin:0,width:'280px'}}><i className="fas fa-search"></i><input className="search-inp" placeholder="Search members…" value={memSearch} onChange={e => setMemSearch(e.target.value)}/></div>
                </div>
                <div className="card-body" style={{padding:0}}>
                  <div className="tbl-wrap"><table>
                    <thead><tr><th>Member</th><th>ID</th><th>Role</th><th>Dept</th><th>Issued</th><th>Overdue</th><th>Fine</th></tr></thead>
                    <tbody>
                      {filteredMembers.map(u => {
                        const myI = issues.filter(i => (i.user?._id||i.user) === u._id && !i.returnDate);
                        const ov  = myI.filter(i => (i.dueDate?.toString().slice(0,10)||'') < today).length;
                        const fine= myI.reduce((acc,i) => acc + calcFine(i), 0);
                        const bg  = u.role==='faculty'?'linear-gradient(135deg,#065f46,#059669)':'linear-gradient(135deg,#1e3a8a,#3b82f6)';
                        return <tr key={u._id}>
                          <td><div style={{display:'flex',alignItems:'center',gap:'.6rem'}}>
                            <div style={{width:'32px',height:'32px',borderRadius:'50%',background:bg,color:'#fff',fontSize:'.78rem',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,flexShrink:0}}>{(u.name||'?')[0]}</div>
                            <div><div className="fw-700" style={{fontSize:'.86rem'}}>{u.name||'—'}</div><div style={{fontSize:'.73rem',color:'var(--muted)'}}>{u.email||''}</div></div>
                          </div></td>
                          <td style={{fontSize:'.82rem'}}>{u.rollNo||u.employeeId||u.username}</td>
                          <td><Pill text={u.role} type={u.role}/></td>
                          <td style={{fontSize:'.83rem'}}>{u.department||'—'}</td>
                          <td className="fw-700">{myI.length}</td>
                          <td className={ov?'text-err fw-700':''}>{ov}</td>
                          <td className={fine?'text-err fw-700':''}>₹{fine}</td>
                        </tr>;
                      })}
                      {filteredMembers.length===0 && <tr><td colSpan={7}><div className="empty-state"><i className="fas fa-inbox"></i><p>No members found</p></div></td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </div>
            </div>
          )}

          {/* ══ FEEDBACK ══ */}
          {section === 'feedback' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-star" style={{color:'#d97706',marginRight:'8px'}}></i>Member Feedback</h2></div>
              <div className="card">
                <div className="card-header"><span className="card-title">All Submitted Feedback</span></div>
                <div className="card-body" style={{padding:0}}>
                  {feedback.length === 0
                    ? <div className="empty-state"><i className="fas fa-star"></i><p>No feedback submitted yet.</p></div>
                    : [...feedback].reverse().map((f, i) => {
                        const uName = f.user?.name || getName(f.userId||f.user?._id);
                        const uRole = f.user?.role || '';
                        const stars = '★'.repeat(f.rating)+'☆'.repeat(5-f.rating);
                        return (
                          <div key={i} style={{padding:'1rem 1.5rem',borderBottom:'1px solid #f8fafc',display:'flex',gap:'1rem',alignItems:'flex-start'}}>
                            <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#1e3a8a,#3b82f6)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,flexShrink:0}}>{(uName||'?')[0]}</div>
                            <div style={{flex:1}}>
                              <div style={{display:'flex',alignItems:'center',gap:'.5rem',flexWrap:'wrap',marginBottom:'.25rem'}}>
                                <strong style={{fontSize:'.87rem'}}>{uName}</strong>
                                {uRole && <Pill text={uRole} type={uRole}/>}
                                <Pill text={f.category||'General'} type="info"/>
                                <span style={{marginLeft:'auto',fontSize:'.78rem',color:'var(--muted)'}}>{(f.date||f.createdAt||'').toString().slice(0,10)}</span>
                              </div>
                              <div style={{color:'#f59e0b',margin:'3px 0'}}>{stars}</div>
                              <div style={{fontSize:'.88rem'}}>{f.message}</div>
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
              </div>
            </div>
          )}

          {/* ══ PROFILE ══ */}
          {section === 'profile' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-user-circle" style={{marginRight:'8px'}}></i>My Profile</h2></div>
              <div className="card">
                <div className="card-body">
                  <div style={{display:'flex',alignItems:'center',gap:'1.5rem',marginBottom:'2rem',flexWrap:'wrap'}}>
                    <div style={{width:'88px',height:'88px',borderRadius:'50%',background:'linear-gradient(135deg,#1e3a8a,#3b82f6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2.2rem',fontWeight:800,color:'#fff'}}>{(session?.name||'L')[0]}</div>
                    <div><h2 style={{fontSize:'1.5rem'}}>{session?.name||'Librarian'}</h2><p className="text-muted" style={{marginTop:'4px'}}>{session?.email||'No email set'}</p></div>
                  </div>
                  <div className="form-grid">
                    {[['Employee ID', session?.employeeId||session?.username],['Department', session?.department||'Library'],['Phone', session?.phone||'—'],['Role', 'Librarian']].map(([label, val]) => (
                      <div key={label} style={{background:'var(--bg)',borderRadius:'12px',padding:'1rem'}}>
                        <div style={{fontSize:'.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.04em'}}>{label}</div>
                        <div className="fw-700 mt-1">{val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:'1.5rem'}}>
                    <button className="btn btn-primary" onClick={() => setShowChangePwd(true)}><i className="fas fa-key"></i> Change Password</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Suggest Book Modal */}
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
