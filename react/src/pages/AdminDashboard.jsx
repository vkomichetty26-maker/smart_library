import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '../utils/auth';
import { usersAPI, booksAPI, issuesAPI, statsAPI, settingsAPI, notificationsAPI, backupAPI } from '../utils/api';
import { useToast } from '../context/ToastContext';

const categories = ['Programming','Computer Science','AI / Machine Learning','Databases','Mathematics','Systems','Networking','Algorithms','Software Engineering','Physics','Chemistry','Other'];

function Pill({ text, type }) {
  return <span className={`pill pill-${type}`}>{text}</span>;
}

function Modal({ id, title, open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{maxWidth:'560px'}}>
        <div className="modal-title">{title}</div>
        {children}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const session = getSession();
  const [activeSection, setActiveSection] = useState('overview');
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [settings, setSettings] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [seenNotifs, setSeenNotifs] = useState(new Set());
  const [dbNotifications, setDbNotifications] = useState([]);

  const [userSearch, setUserSearch] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [txFilter, setTxFilter] = useState('all');

  // Modals
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);
  const [showEditBook, setShowEditBook] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState({});
  const [editUser, setEditUser] = useState({});
  const [editBook, setEditBook] = useState({});
  const [newUser, setNewUser] = useState({ name:'',username:'',password:'',role:'student',email:'',phone:'',department:'' });
  const [newBook, setNewBook] = useState({ title:'',author:'',isbn:'',category:'Programming',publisher:'',edition:'',year:'',copies:1,location:'' });

  useEffect(() => {
    if (!session || session.role !== 'admin') { navigate('/login'); return; }
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [s, u, b, i, stg, notifs] = await Promise.all([
        statsAPI.get(), usersAPI.getAll(), booksAPI.getAll(), issuesAPI.getAll(), settingsAPI.get(), notificationsAPI.getByUser(session?.id)
      ]);
      setStats(s.data); setUsers(u.data); setBooks(b.data); setIssues(i.data); setSettings(stg.data || {}); setDbNotifications(notifs.data);
    } catch { toast('Failed to load data. Is the backend running?', 'err'); }
  }

  function logout() { clearSession(); navigate('/'); }
  function go(s) { setActiveSection(s); setSidebarOpen(false); }

  const today = new Date().toISOString().slice(0,10);

  function calcFine(issue, overrideReturnDate) {
    if (!issue) return 0;
    const u = users.find(x => x._id === (issue.user?._id || issue.user));
    if (u && u.role === 'faculty') return 0;
    const fpd = settings.finePerDay || 5;
    const due = new Date(issue.dueDate);
    const ret = new Date(overrideReturnDate || issue.returnDate || today);
    if (ret <= due) return 0;
    return Math.ceil((ret - due) / 86400000) * fpd;
  }

  function getStatusPill(issue) {
    if (issue.returnDate) return <Pill text="Returned" type="ok"/>;
    if (issue.dueDate < today) return <Pill text="Overdue" type="err"/>;
    return <Pill text="Active" type="warn"/>;
  }

  function getUserName(id) { const u = users.find(x => x._id === id); return u?.name || '?'; }
  function getBookTitle(id) { const b = books.find(x => x._id === id); return b?.title || '?'; }

  // ── USERS ──
  const filteredUsers = users.filter(u =>
    (u.name||'').toLowerCase().includes(userSearch.toLowerCase()) ||
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.includes(userSearch.toLowerCase()) ||
    (u.department||'').toLowerCase().includes(userSearch.toLowerCase())
  );

  async function handleAddUser() {
    if (!newUser.name || !newUser.username || !newUser.password) { toast('Fill Name, Username & Password','err'); return; }
    try {
      await usersAPI.create(newUser);
      toast(`User "${newUser.name}" created!`, 'ok');
      setShowAddUser(false);
      setNewUser({ name:'',username:'',password:'',role:'student',email:'',phone:'',department:'' });
      loadAll();
    } catch(e) { toast(e.response?.data?.message || 'Error creating user','err'); }
  }

  async function handleEditUser() {
    try {
      await usersAPI.update(editUser._id, editUser);
      toast('User updated!','ok'); setShowEditUser(false); loadAll();
    } catch(e) { toast(e.response?.data?.message || 'Error','err'); }
  }

  async function handleDeleteUser(u) {
    setConfirmData({ title:'Delete User', msg:`Delete "${u.name}"? This cannot be undone.`, action: async () => {
      try { await usersAPI.delete(u._id); toast('User deleted','ok'); loadAll(); setShowConfirm(false); }
      catch(e) { toast(e.response?.data?.message || 'Error','err'); setShowConfirm(false); }
    }});
    setShowConfirm(true);
  }

  // ── BOOKS ──
  const filteredBooks = books.filter(b =>
    b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
    b.author.toLowerCase().includes(bookSearch.toLowerCase()) ||
    (b.isbn && b.isbn.includes(bookSearch))
  );

  async function handleAddBook() {
    if (!newBook.title || !newBook.author || !newBook.isbn) { toast('Fill Title, Author & ISBN','err'); return; }
    try {
      await booksAPI.create(newBook);
      toast('Book added!','ok'); setShowAddBook(false);
      setNewBook({ title:'',author:'',isbn:'',category:'Programming',publisher:'',edition:'',year:'',copies:1,location:'' });
      loadAll();
    } catch(e) { toast(e.response?.data?.message || 'Error','err'); }
  }

  async function handleEditBook() {
    try {
      await booksAPI.update(editBook._id, editBook);
      toast('Book updated!','ok'); setShowEditBook(false); loadAll();
    } catch(e) { toast(e.response?.data?.message || 'Error','err'); }
  }

  async function handleDeleteBook(b) {
    setConfirmData({ title:'Delete Book', msg:`Delete "${b.title}"? This cannot be undone.`, action: async () => {
      try { await booksAPI.delete(b._id); toast('Book deleted','ok'); loadAll(); setShowConfirm(false); }
      catch(e) { toast(e.response?.data?.message || 'Error','err'); setShowConfirm(false); }
    }});
    setShowConfirm(true);
  }

  // ── TRANSACTIONS ──
  const filteredIssues = [...issues].reverse().filter(i => {
    const u = getUserName(i.user?._id || i.user); const b = getBookTitle(i.book?._id || i.book);
    const q = txSearch.toLowerCase();
    const matchQ = !q || u.toLowerCase().includes(q) || b.toLowerCase().includes(q);
    const matchF = txFilter === 'all' ? true : txFilter === 'active' ? !i.returnDate : txFilter === 'returned' ? !!i.returnDate : (!i.returnDate && (i.dueDate||'') < today);
    return matchQ && matchF;
  });

  // ── SETTINGS ──
  async function saveSettings() {
    try {
      await settingsAPI.update(settings);
      toast('Settings saved!','ok');
    } catch { toast('Error saving settings','err'); }
  }

  // ── REPORTS ──
  function genReport(type) {
    let csv = '', title = '';
    if (type === 'users') {
      title = 'Users Report'; csv = 'Name,Username,Role,Email,Department,Status\n' + users.map(u => `"${u.name}",${u.username},${u.role},"${u.email||''}","${u.department||''}",${u.active!==false?'Active':'Inactive'}`).join('\n');
    } else if (type === 'books') {
      title = 'Books Report'; csv = 'Title,Author,ISBN,Category,Copies,Available\n' + books.map(b => `"${b.title}","${b.author}",${b.isbn},"${b.category||''}",${b.copies},${b.available}`).join('\n');
    } else if (type === 'transactions') {
      title = 'Transactions'; csv = 'User,Book,IssueDate,DueDate,ReturnDate,Fine\n' + issues.map(i => `"${getUserName(i.user?._id||i.user)}","${getBookTitle(i.book?._id||i.book)}",${(i.issueDate||'').slice(0,10)},${(i.dueDate||'').slice(0,10)},${i.returnDate?(i.returnDate+'').slice(0,10):''},${calcFine(i, i.returnDate||today)}`).join('\n');
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download = `${type}_report.csv`; a.click();
    toast(`${title} downloaded!`, 'ok');
  }

  const pageTitles = { overview:['Overview','Library at a glance'], users:['User Management','Manage accounts'], books:['Book Inventory','Manage the catalog'], issues:['Transactions','All issue & return records'], reports:['Reports & Export','Generate and export data'], backup:['Backup & Restore','Database backup'], settings:['Settings','Configure library policies'] };
  const [ptitle, psub] = pageTitles[activeSection] || ['',''];

  const notifications = [];
  if (stats.overdueIssues > 0) notifications.push({ id:'ov', icon:'fa-exclamation-circle text-err', title:'System Alert', text:`There are ${stats.overdueIssues} overdue books in the system.`, time:'Alert' });
  if (stats.totalFines > 0) notifications.push({ id:'fine', icon:'fa-coins text-warn', title:'Pending Fines', text:`Total of ₹${stats.totalFines} in pending fines.`, time:'Notice' });
  dbNotifications.forEach(n => {
    notifications.push({ id: n._id, icon: n.icon, title: n.title, text: n.text, time: (n.createdAt||'').slice(0,10), isRead: n.isRead, isDb: true });
  });

  function InputField({label, ...props}) {
    return (
      <div className="form-group">
        <label>{label}</label>
        <input className="inp" {...props} />
      </div>
    );
  }

  function SelectField({label, children, ...props}) {
    return (
      <div className="form-group">
        <label>{label}</label>
        <select className="inp" {...props}>{children}</select>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen?'open':''}`} id="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon"><i className="fas fa-book-open-reader"></i></div>
          <div className="brand-text">Smart<span>Lib</span></div>
        </div>
        <nav className="sidebar-nav">
          <span className="nav-label">Main</span>
          {[['overview','fa-chart-pie','Overview'],['users','fa-users','User Management'],['books','fa-book','Book Inventory'],['issues','fa-exchange-alt','Transactions']].map(([s,ic,lb]) => (
            <button key={s} className={`nav-item ${activeSection===s?'active':''}`} onClick={() => go(s)}><i className={`fas ${ic}`}></i>{lb}</button>
          ))}
          <div className="nav-divider"></div>
          <span className="nav-label">Reports</span>
          {[['reports','fa-chart-bar','Reports & Export'],['backup','fa-database','Backup & Restore']].map(([s,ic,lb]) => (
            <button key={s} className={`nav-item ${activeSection===s?'active':''}`} onClick={() => go(s)}><i className={`fas ${ic}`}></i>{lb}</button>
          ))}
          <div className="nav-divider"></div>
          <span className="nav-label">System</span>
          <button className={`nav-item ${activeSection==='settings'?'active':''}`} onClick={() => go('settings')}><i className="fas fa-cog"></i>Settings</button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar" style={{background:'linear-gradient(135deg,#1e40af,#3b82f6)',color:'#fff'}}>{(session?.name||'A')[0]}</div>
            <div className="user-meta"><div className="name">{session?.name||'Admin'}</div><div className="role">Super Admin</div></div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        {/* Topbar */}
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
                    <div className="notif-empty"><i className="fas fa-bell-slash"></i> System looking good!</div>
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

          {/* ══ OVERVIEW ══ */}
          {activeSection === 'overview' && (
            <div>
              <div className="stats-row">
                <div className="stat-box"><div className="stat-ico blue"><i className="fas fa-users"></i></div><div className="stat-info"><div className="value">{stats.totalUsers||0}</div><div className="label">Total Users</div></div></div>
                <div className="stat-box"><div className="stat-ico green"><i className="fas fa-book"></i></div><div className="stat-info"><div className="value">{stats.totalBooks||0}</div><div className="label">Book Titles</div></div></div>
                <div className="stat-box"><div className="stat-ico amber"><i className="fas fa-hand-holding"></i></div><div className="stat-info"><div className="value">{stats.activeIssues||0}</div><div className="label">Active Issues</div></div></div>
                <div className="stat-box"><div className="stat-ico red"><i className="fas fa-exclamation-circle"></i></div><div className="stat-info"><div className="value">{stats.overdueIssues||0}</div><div className="label">Overdue</div></div></div>
                <div className="stat-box"><div className="stat-ico blue"><i className="fas fa-clone"></i></div><div className="stat-info"><div className="value">{stats.totalCopies||0}</div><div className="label">Total Copies</div></div></div>
                <div className="stat-box"><div className="stat-ico red"><i className="fas fa-coins"></i></div><div className="stat-info"><div className="value">₹{stats.totalFines||0}</div><div className="label">Pending Fines</div></div></div>
              </div>
              <div className="card">
                <div className="card-header"><span className="card-title"><i className="fas fa-history"></i> Recent Transactions</span></div>
                <div className="card-body" style={{padding:0}}>
                  <div className="tbl-wrap">
                    <table>
                      <thead><tr><th>User</th><th>Book</th><th>Issue Date</th><th>Due Date</th><th>Status</th><th>Fine</th></tr></thead>
                      <tbody>
                        {[...issues].reverse().slice(0,10).map((i, idx) => {
                          const fine = calcFine(i.dueDate, i.returnDate || today);
                          return (
                            <tr key={idx}>
                              <td><strong>{i.user?.name || getUserName(i.user)}</strong></td>
                              <td>{(i.book?.title || getBookTitle(i.book))?.substring(0,28)}</td>
                              <td>{(i.issueDate||'').slice(0,10)}</td>
                              <td>{(i.dueDate||'').slice(0,10)}</td>
                              <td>{getStatusPill(i)}</td>
                              <td className={fine>0?'text-err':''}>{fine > 0 ? `₹${fine}` : '—'}</td>
                            </tr>
                          );
                        })}
                        {issues.length === 0 && <tr><td colSpan={6}><div className="empty-state"><i className="fas fa-inbox"></i><p>No transactions yet</p></div></td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ USERS ══ */}
          {activeSection === 'users' && (
            <div>
              <div className="section-hd">
                <h2><i className="fas fa-users" style={{color:'#2563eb',marginRight:'8px'}}></i>User Management</h2>
                <button className="btn btn-primary" onClick={() => setShowAddUser(true)}><i className="fas fa-user-plus"></i> Add User</button>
              </div>
              <div className="card mb-2">
                <div className="card-header">
                  <span className="card-title">All Users <span style={{background:'#f1f5f9',borderRadius:'20px',padding:'.15rem .6rem',fontSize:'.78rem',marginLeft:'6px',fontWeight:600}}>{filteredUsers.length} users</span></span>
                  <div className="search-wrap" style={{margin:0,width:'280px'}}><i className="fas fa-search"></i><input className="search-inp" placeholder="Search name, role…" value={userSearch} onChange={e => setUserSearch(e.target.value)} /></div>
                </div>
                <div className="card-body" style={{padding:0}}>
                  <div className="tbl-wrap">
                    <table>
                      <thead><tr><th>#</th><th>User</th><th>Username</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
                      <tbody>
                        {filteredUsers.map((u, i) => (
                          <tr key={u._id}>
                            <td className="text-muted">{i+1}</td>
                            <td><div className="flex-center gap-sm"><div className="avatar" style={{width:'34px',height:'34px',background:'linear-gradient(135deg,#1e3a8a,#3b82f6)',color:'#fff',fontSize:'.8rem'}}>{(u.name||'?')[0]}</div><div><div className="fw-700" style={{fontSize:'.88rem'}}>{u.name||'—'}</div><div style={{fontSize:'.75rem',color:'var(--muted)'}}>{u.email||''}</div></div></div></td>
                            <td><code style={{background:'#f1f5f9',padding:'.2rem .5rem',borderRadius:'6px',fontSize:'.82rem'}}>{u.username}</code></td>
                            <td><Pill text={u.role} type={u.role}/></td>
                            <td style={{fontSize:'.83rem'}}>{u.department||'—'}</td>
                            <td><span style={{fontSize:'.8rem',fontWeight:600,color:u.active!==false?'var(--ok)':'var(--err)'}}>{u.active!==false?'● Active':'○ Inactive'}</span></td>
                            <td><div className="flex gap-sm">
                              <button className="btn btn-warn btn-sm btn-icon" title="Edit" onClick={() => { setEditUser({...u}); setShowEditUser(true); }}><i className="fas fa-pen"></i></button>
                              <button className="btn btn-danger btn-sm btn-icon" title="Delete" onClick={() => handleDeleteUser(u)}><i className="fas fa-trash"></i></button>
                            </div></td>
                          </tr>
                        ))}
                        {filteredUsers.length === 0 && <tr><td colSpan={7}><div className="empty-state"><i className="fas fa-inbox"></i><p>No users found</p></div></td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ BOOKS ══ */}
          {activeSection === 'books' && (
            <div>
              <div className="section-hd">
                <h2><i className="fas fa-book" style={{color:'#059669',marginRight:'8px'}}></i>Book Inventory</h2>
                <button className="btn btn-primary" onClick={() => setShowAddBook(true)}><i className="fas fa-plus"></i> Add Book</button>
              </div>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">All Books <span style={{background:'#f1f5f9',borderRadius:'20px',padding:'.15rem .6rem',fontSize:'.78rem',marginLeft:'6px',fontWeight:600}}>{filteredBooks.length} books</span></span>
                  <div className="search-wrap" style={{margin:0,width:'300px'}}><i className="fas fa-search"></i><input className="search-inp" placeholder="Search title, author, ISBN…" value={bookSearch} onChange={e => setBookSearch(e.target.value)} /></div>
                </div>
                <div className="card-body" style={{padding:0}}>
                  <div className="tbl-wrap">
                    <table>
                      <thead><tr><th>#</th><th>Title & Author</th><th>ISBN</th><th>Category</th><th>Copies</th><th>Available</th><th>Location</th><th>Actions</th></tr></thead>
                      <tbody>
                        {filteredBooks.map((b, i) => (
                          <tr key={b._id}>
                            <td className="text-muted">{i+1}</td>
                            <td><div className="fw-700" style={{fontSize:'.88rem'}}>{b.title}</div><div style={{fontSize:'.75rem',color:'var(--muted)'}}>{b.author} {b.edition?`· ${b.edition} ed.`:''}</div></td>
                            <td><code style={{fontSize:'.8rem'}}>{b.isbn}</code></td>
                            <td><Pill text={b.category||'—'} type="info"/></td>
                            <td className="fw-700">{b.copies}</td>
                            <td><span className={`fw-700 ${b.available>0?'text-ok':'text-err'}`}>{b.available}</span><span style={{color:'var(--muted)',fontSize:'.8rem'}}>/{b.copies}</span></td>
                            <td style={{fontSize:'.83rem'}}>{b.location||'—'}</td>
                            <td><div className="flex gap-sm">
                              <button className="btn btn-warn btn-sm btn-icon" onClick={() => { setEditBook({...b}); setShowEditBook(true); }}><i className="fas fa-pen"></i></button>
                              <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDeleteBook(b)}><i className="fas fa-trash"></i></button>
                            </div></td>
                          </tr>
                        ))}
                        {filteredBooks.length === 0 && <tr><td colSpan={8}><div className="empty-state"><i className="fas fa-inbox"></i><p>No books found</p></div></td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ TRANSACTIONS ══ */}
          {activeSection === 'issues' && (
            <div>
              <div className="section-hd">
                <h2><i className="fas fa-exchange-alt" style={{color:'#d97706',marginRight:'8px'}}></i>All Transactions</h2>
                <select className="inp" style={{width:'160px',borderRadius:'30px'}} value={txFilter} onChange={e => setTxFilter(e.target.value)}>
                  <option value="all">All</option><option value="active">Active</option><option value="returned">Returned</option><option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Transaction Log</span>
                  <div className="search-wrap" style={{margin:0,width:'260px'}}><i className="fas fa-search"></i><input className="search-inp" placeholder="Search user or book…" value={txSearch} onChange={e => setTxSearch(e.target.value)} /></div>
                </div>
                <div className="card-body" style={{padding:0}}>
                  <div className="tbl-wrap">
                    <table>
                      <thead><tr><th>Member</th><th>Book</th><th>Issued</th><th>Due</th><th>Returned</th><th>Fine</th><th>Status</th></tr></thead>
                      <tbody>
                        {filteredIssues.map((i, idx) => {
                          const uName = i.user?.name || getUserName(i.user); const bTitle = i.book?.title || getBookTitle(i.book);
                          const fine = calcFine(i.dueDate, i.returnDate || today);
                          const isOv = !i.returnDate && (i.dueDate||'') < today;
                          return (
                            <tr key={idx}>
                              <td className="fw-700" style={{fontSize:'.85rem'}}>{uName}</td>
                              <td style={{fontSize:'.83rem'}}>{bTitle?.substring(0,24)}</td>
                              <td>{(i.issueDate||'').slice(0,10)}</td>
                              <td style={{color:isOv?'var(--err)':'',fontWeight:isOv?700:400}}>{(i.dueDate||'').slice(0,10)}</td>
                              <td>{i.returnDate?(i.returnDate+'').slice(0,10):'—'}</td>
                              <td className={fine>0?'text-err fw-700':''}>₹{fine}</td>
                              <td>{getStatusPill(i)}</td>
                            </tr>
                          );
                        })}
                        {filteredIssues.length === 0 && <tr><td colSpan={7}><div className="empty-state"><i className="fas fa-inbox"></i><p>No transactions match</p></div></td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ REPORTS ══ */}
          {activeSection === 'reports' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-chart-bar" style={{color:'#7c3aed',marginRight:'8px'}}></i>Reports & Export</h2></div>
              <div className="card-grid grid-2 mb-2">
                {[['users','fa-users','#2563eb','Users Report','All registered users with roles'],['books','fa-book','#059669','Books Report','Full inventory with availability'],['transactions','fa-exchange-alt','#d97706','Transactions Report','All issue/return history'],['fines','fa-coins','#dc2626','Fines Report','Outstanding fines & overdue']].map(([t,ic,col,title,sub]) => (
                  <div key={t} className="card" style={{cursor:'pointer'}} onClick={() => genReport(t)}>
                    <div className="card-body" style={{textAlign:'center',padding:'2rem'}}>
                      <div style={{fontSize:'2rem',color:col,marginBottom:'.75rem'}}><i className={`fas ${ic}`}></i></div>
                      <div className="fw-700">{title}</div>
                      <div className="text-muted" style={{fontSize:'.82rem',marginTop:'.35rem'}}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ BACKUP ══ */}
          {activeSection === 'backup' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-database" style={{color:'#059669',marginRight:'8px'}}></i>Backup & Restore</h2></div>
              <div className="card-grid grid-2">
                <div className="card"><div className="card-body" style={{textAlign:'center',padding:'2.5rem'}}>
                  <div style={{fontSize:'3rem',color:'#059669',marginBottom:'1rem'}}><i className="fas fa-cloud-download-alt"></i></div>
                  <div className="fw-700 mb-1">Download Backup</div>
                  <div className="text-muted mb-2" style={{fontSize:'.88rem'}}>Export all library data as JSON</div>
                  <button className="btn btn-success" onClick={async () => {
                    const data = { users:(await usersAPI.getAll()).data, books:(await booksAPI.getAll()).data, issues:(await issuesAPI.getAll()).data, timestamp:new Date().toISOString() };
                    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); a.download = `smartlib_backup_${today}.json`; a.click();
                    toast('Backup downloaded!','ok');
                  }}><i className="fas fa-download"></i> Download JSON Backup</button>
                </div></div>
                <div className="card"><div className="card-body" style={{textAlign:'center',padding:'2.5rem'}}>
                  <div style={{fontSize:'3rem',color:'#d97706',marginBottom:'1rem'}}><i className="fas fa-cloud-upload-alt"></i></div>
                  <div className="fw-700 mb-1">Restore Backup</div>
                  <div className="text-muted mb-2" style={{fontSize:'.88rem'}}>Restore from a JSON backup file</div>
                  <input type="file" id="restoreFile" style={{display:'none'}} accept=".json" onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    try {
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        try {
                          const data = JSON.parse(ev.target.result);
                          await backupAPI.restore(data);
                          toast('Backup restored successfully!', 'ok');
                          loadAll();
                        } catch (err) {
                          toast('Invalid JSON or restore failed', 'err');
                        }
                        e.target.value = '';
                      };
                      reader.readAsText(file);
                    } catch (e) {
                      toast('Error reading file', 'err');
                      e.target.value = '';
                    }
                  }} />
                  <button className="btn btn-warn" onClick={() => document.getElementById('restoreFile').click()}><i className="fas fa-upload"></i> Choose Backup File</button>
                </div></div>
              </div>
            </div>
          )}

          {/* ══ SETTINGS ══ */}
          {activeSection === 'settings' && (
            <div>
              <div className="section-hd"><h2><i className="fas fa-cog" style={{color:'#7c3aed',marginRight:'8px'}}></i>Library Settings</h2></div>
              <div className="card">
                <div className="card-header"><span className="card-title">Circulation Rules & Fine Policy</span></div>
                <div className="card-body">
                  <div className="form-grid">
                    {[['Institution Name','institution','text'],['Fine Per Day (₹)','finePerDay','number'],['Max Books – Student','maxBooksStudent','number'],['Max Books – Faculty','maxBooksFaculty','number'],['Loan Days – Student','daysStudent','number'],['Loan Days – Faculty','daysFaculty','number']].map(([label, key, type]) => (
                      <div key={key} className="form-group">
                        <label>{label}</label>
                        <input className="inp" type={type} value={settings[key]||''} onChange={e => setSettings(s => ({...s, [key]: type==='number'?parseInt(e.target.value)||0:e.target.value}))} />
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-success" onClick={saveSettings}><i className="fas fa-save"></i> Save Settings</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
      {/* Add User */}
      <Modal title={<><i className="fas fa-user-plus" style={{color:'#2563eb'}}></i> Add New User</>} open={showAddUser} onClose={() => setShowAddUser(false)}>
        <div className="form-grid">
          {[['Full Name *','name','text'],['Username *','username','text'],['Password *','password','password'],['Email','email','email'],['Phone','phone','tel'],['Department','department','text']].map(([label, key, type]) => (
            <div key={key} className="form-group">
              <label>{label}</label>
              <input className="inp" type={type} value={newUser[key]||''} onChange={e => setNewUser(u => ({...u, [key]:e.target.value}))} />
            </div>
          ))}
          <div className="form-group">
            <label>Role</label>
            <select className="inp" value={newUser.role} onChange={e => setNewUser(u => ({...u, role:e.target.value}))}>
              <option value="student">Student</option><option value="faculty">Faculty</option><option value="librarian">Librarian</option><option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={handleAddUser}><i className="fas fa-save"></i> Create User</button>
          <button className="btn btn-outline" onClick={() => setShowAddUser(false)}>Cancel</button>
        </div>
      </Modal>

      {/* Edit User */}
      <Modal title={<><i className="fas fa-user-edit" style={{color:'#d97706'}}></i> Edit User</>} open={showEditUser} onClose={() => setShowEditUser(false)}>
        <div className="form-grid">
          {[['Full Name','name','text'],['Username','username','text'],['Email','email','email'],['Phone','phone','tel'],['Department','department','text']].map(([label, key, type]) => (
            <div key={key} className="form-group">
              <label>{label}</label>
              <input className="inp" type={type} value={editUser[key]||''} onChange={e => setEditUser(u => ({...u, [key]:e.target.value}))} />
            </div>
          ))}
          <div className="form-group"><label>Reset Password</label><input className="inp" type="password" placeholder="Leave blank to keep current" value={editUser.password||''} onChange={e => setEditUser(u => ({...u, password:e.target.value}))} /></div>
          <div className="form-group"><label>Role</label><select className="inp" value={editUser.role||'student'} onChange={e => setEditUser(u => ({...u, role:e.target.value}))}><option value="student">Student</option><option value="faculty">Faculty</option><option value="librarian">Librarian</option><option value="admin">Admin</option></select></div>
          <div className="form-group"><label>Status</label><select className="inp" value={editUser.active !== false ? 'true':'false'} onChange={e => setEditUser(u => ({...u, active:e.target.value==='true'}))}><option value="true">Active</option><option value="false">Inactive</option></select></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={handleEditUser}><i className="fas fa-save"></i> Save Changes</button>
          <button className="btn btn-outline" onClick={() => setShowEditUser(false)}>Cancel</button>
        </div>
      </Modal>

      {/* Add Book */}
      <Modal title={<><i className="fas fa-plus-circle" style={{color:'#059669'}}></i> Add New Book</>} open={showAddBook} onClose={() => setShowAddBook(false)}>
        <div className="form-grid">
          <div className="form-group" style={{gridColumn:'1/-1'}}><label>Book Title *</label><input className="inp" value={newBook.title} onChange={e => setNewBook(b => ({...b, title:e.target.value}))} placeholder="e.g. Introduction to Algorithms"/></div>
          {[['Author *','author','text'],['ISBN *','isbn','text'],['Publisher','publisher','text'],['Edition','edition','text'],['Year','year','number'],['Total Copies *','copies','number'],['Shelf Location','location','text']].map(([label, key, type]) => (
            <div key={key} className="form-group"><label>{label}</label><input className="inp" type={type} value={newBook[key]||''} onChange={e => setNewBook(b => ({...b, [key]:e.target.value}))}/></div>
          ))}
          <div className="form-group"><label>Category</label><select className="inp" value={newBook.category} onChange={e => setNewBook(b => ({...b, category:e.target.value}))}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-success" onClick={handleAddBook}><i className="fas fa-plus"></i> Add Book</button>
          <button className="btn btn-outline" onClick={() => setShowAddBook(false)}>Cancel</button>
        </div>
      </Modal>

      {/* Edit Book */}
      <Modal title={<><i className="fas fa-book-open" style={{color:'#d97706'}}></i> Edit Book</>} open={showEditBook} onClose={() => setShowEditBook(false)}>
        <div className="form-grid">
          <div className="form-group" style={{gridColumn:'1/-1'}}><label>Title</label><input className="inp" value={editBook.title||''} onChange={e => setEditBook(b => ({...b, title:e.target.value}))}/></div>
          {[['Author','author','text'],['ISBN','isbn','text'],['Publisher','publisher','text'],['Copies','copies','number'],['Edition','edition','text'],['Location','location','text']].map(([label, key, type]) => (
            <div key={key} className="form-group"><label>{label}</label><input className="inp" type={type} value={editBook[key]||''} onChange={e => setEditBook(b => ({...b, [key]:e.target.value}))}/></div>
          ))}
          <div className="form-group"><label>Category</label><select className="inp" value={editBook.category||'Other'} onChange={e => setEditBook(b => ({...b, category:e.target.value}))}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={handleEditBook}><i className="fas fa-save"></i> Save Changes</button>
          <button className="btn btn-outline" onClick={() => setShowEditBook(false)}>Cancel</button>
        </div>
      </Modal>

      {/* Confirm */}
      {showConfirm && (
        <div className="modal-overlay open" onClick={e => e.target===e.currentTarget && setShowConfirm(false)}>
          <div className="modal-box" style={{maxWidth:'380px'}}>
            <div className="modal-title">{confirmData.title}</div>
            <p style={{color:'var(--muted)',fontSize:'.9rem'}}>{confirmData.msg}</p>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={confirmData.action}>Yes, Proceed</button>
              <button className="btn btn-outline" onClick={() => setShowConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
