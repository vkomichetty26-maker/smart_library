import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { booksAPI, statsAPI } from '../utils/api';
import { getSession } from '../utils/auth';

const BOOK_EMOJIS = {
  'Programming':'💻','Computer Science':'🖥️','AI / Machine Learning':'🤖',
  'Databases':'🗄️','Mathematics':'📐','Systems':'⚙️','Networking':'🌐',
  'Algorithms':'🔢','Software Engineering':'🛠️','Physics':'⚛️','default':'📖'
};

export default function Home() {
  const navigate = useNavigate();
  const session = getSession();
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState({ totalBooks:0, availableCopies:0, totalUsers:0, activeIssues:0, students:0 });
  const [searchQ, setSearchQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef();

  useEffect(() => {
    if (session) navigate(`/dashboard/${session.role}`);
  }, []);

  useEffect(() => {
    booksAPI.getAll().then(r => setBooks(r.data)).catch(() => {});
    statsAPI.get().then(r => setStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchResults = searchQ.trim()
    ? books.filter(b =>
        b.title.toLowerCase().includes(searchQ.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQ.toLowerCase()) ||
        (b.isbn && b.isbn.includes(searchQ))
      ).slice(0, 5)
    : [];

  return (
    <>
      <div className="home-bg">
        <div className="home-orb" style={{width:'700px',height:'700px',background:'radial-gradient(circle,rgba(30,58,138,0.35),transparent)',top:'-200px',left:'-200px'}}></div>
        <div className="home-orb" style={{width:'600px',height:'600px',background:'radial-gradient(circle,rgba(124,58,237,0.25),transparent)',bottom:'-200px',right:'-200px',animationDelay:'-5s'}}></div>
        <div className="home-orb" style={{width:'500px',height:'500px',background:'radial-gradient(circle,rgba(251,191,36,0.15),transparent)',top:'30%',left:'35%',animationDelay:'-2s'}}></div>
      </div>

      {/* Header */}
      <header className="home-header">
        <div className="home-header-inner">
          <div className="home-logo">
            <div className="home-logo-icon"><i className="fas fa-book-open"></i></div>
            Smart<span>Lib</span>
          </div>
          <nav className="home-nav">
            <a href="#features" className="home-nav-link">Features</a>
            <a href="#books" className="home-nav-link">Catalog</a>
            <a href="#portals" className="home-nav-link">Portals</a>
            <Link to="/login" className="btn-nav-login"><i className="fas fa-sign-in-alt"></i> Portal Login</Link>
          </nav>
        </div>
      </header>

      <div className="home-wrap">
        {/* Hero */}
        <section className="hero-section" id="home">
          <div className="hero-inner">
            <div className="hero-content">
              <div className="hero-badge"><span className="hero-dot"></span> Next-Gen Real-Time System</div>
              <h1 className="hero-title">Intelligent Library<br/><span>Management System</span></h1>
              <p className="hero-subtitle">The ultimate platform for universities and colleges. Experience seamless cataloging, real-time tracking, and automated fine management across four dedicated, professional portals.</p>
              <div className="hero-actions">
                <Link to="/login" className="btn-hero-primary"><i className="fas fa-rocket"></i> Launch Portals</Link>
                <a href="#features" className="btn-hero-outline"><i className="fas fa-stream"></i> Explore Features</a>
              </div>
            </div>
            {/* Search Card */}
            <div className="glass-card search-card">
              <h3><i className="fas fa-search" style={{color:'#fbbf24'}}></i> Search Catalog</h3>
              <div className="hero-search-group" ref={searchRef}>
                <i className="fas fa-search hero-search-icon"></i>
                <input
                  className="hero-search-inp" type="text"
                  placeholder="Type a title, author, category..."
                  value={searchQ}
                  onChange={e => { setSearchQ(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                />
                <div className={`search-results-live ${searchOpen && searchQ ? 'open' : ''}`}>
                  {searchQ && searchResults.length === 0 && (
                    <div style={{padding:'1rem',color:'rgba(255,255,255,.5)',textAlign:'center',fontSize:'.9rem'}}>No titles found for "{searchQ}"</div>
                  )}
                  {searchResults.map(b => (
                    <div key={b._id} className="sr-item" onClick={() => navigate('/login')}>
                      <div className="sr-icon"><i className="fas fa-book-open"></i></div>
                      <div>
                        <div style={{fontWeight:700,fontSize:'.95rem',color:'#fff'}}>{b.title}</div>
                        <div style={{fontSize:'.8rem',color:'rgba(255,255,255,.5)',marginTop:'2px'}}>
                          {b.author} &bull; {b.available > 0
                            ? <span style={{color:'#34d399',fontWeight:600}}>Available</span>
                            : <span style={{color:'#fca5a5',fontWeight:600}}>Issued</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hero-quick">
                <div className="hero-stat"><div className="value">{stats.totalBooks}</div><div className="label">Total Books</div></div>
                <div className="hero-stat"><div className="value">{stats.availableCopies}</div><div className="label">Available Now</div></div>
                <div className="hero-stat"><div className="value">{stats.totalUsers}</div><div className="label">Active Users</div></div>
                <div className="hero-stat"><div className="value">{stats.activeIssues}</div><div className="label">Books Issued</div></div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stats-bar-inner">
            <div className="sb-item"><div className="sbi-icon"><i className="fas fa-swatchbook" style={{color:'#60a5fa'}}></i></div><div><div className="sb-value">{stats.totalBooks}</div><div className="sb-label">Unique Titles</div></div></div>
            <div className="sb-item"><div className="sbi-icon"><i className="fas fa-check-double" style={{color:'#34d399'}}></i></div><div><div className="sb-value">{stats.availableCopies}</div><div className="sb-label">Currently Available</div></div></div>
            <div className="sb-item"><div className="sbi-icon"><i className="fas fa-users" style={{color:'#fbbf24'}}></i></div><div><div className="sb-value">{stats.students}</div><div className="sb-label">Registered Students</div></div></div>
            <div className="sb-item"><div className="sbi-icon"><i className="fas fa-exchange-alt" style={{color:'#c084fc'}}></i></div><div><div className="sb-value">{stats.activeIssues}</div><div className="sb-label">Actively Borrowed</div></div></div>
          </div>
        </div>

        {/* Features */}
        <section className="home-section" id="features">
          <div className="home-container">
            <div className="section-header">
              <div className="section-tag"><i className="fas fa-bolt"></i> Core Capabilities</div>
              <h2 className="section-title">Powerful Tools for Everyone</h2>
              <p className="section-sub">Built for scale, speed, and simplicity — every component for a robust academic library.</p>
            </div>
            <div className="features-grid">
              {[
                {icon:'fa-database',color:'yellow',title:'MongoDB Database',desc:'Data persists in MongoDB Atlas — centralized, fast, and accessible from any device.'},
                {icon:'fa-users-cog',color:'blue',title:'Full Administrator Control',desc:'Manage users, books, transactions, and configure fine rules from one dashboard.'},
                {icon:'fa-bell',color:'green',title:'Intelligent Fine System',desc:'Automated due-date tracking and fine generation. Librarians can process returns easily.'},
                {icon:'fa-sitemap',color:'purple',title:'Branch-Aware Personalization',desc:'Students see personalized libraries based on their branch with relevant categories first.'},
                {icon:'fa-clipboard-check',color:'blue',title:'Request Workflow',desc:'Students and faculty can digitally request books. Librarians approve or reject requests.'},
                {icon:'fa-chart-pie',color:'yellow',title:'Advanced Analytics',desc:'Visualize library usage with auto-generated charts. Export data via CSV reports.'},
              ].map((f, i) => (
                <div key={i} className="feature-card">
                  <div className={`feat-icon ${f.color}`}><i className={`fas ${f.icon}`}></i></div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Portals */}
        <section className="home-section" id="portals">
          <div className="home-container">
            <div className="section-header">
              <div className="section-tag"><i className="fas fa-lock"></i> Dedicated Portals</div>
              <h2 className="section-title">Secure Role-Based Access</h2>
              <p className="section-sub">Four customized dashboards tailored precisely to the needs of each user tier.</p>
            </div>
            <div className="roles-grid">
              {[
                {cls:'admin',icon:'fa-user-shield',title:'Administrator',desc:'Total system control. Manage accounts, catalog, settings, and view analytics.'},
                {cls:'lib',icon:'fa-book-reader',title:'Librarian',desc:'Handle circulation. Process issues, returns, collect fines, and review requests.'},
                {cls:'fac',icon:'fa-chalkboard-teacher',title:'Faculty',desc:'Extended privileges. Request books, manage readings, and review history.'},
                {cls:'std',icon:'fa-user-graduate',title:'Student',desc:'Personalized view for your branch. Search, request books, and track dues.'},
              ].map((p, i) => (
                <Link key={i} to="/login" className={`role-portal-card ${p.cls}`}>
                  <div className="role-avt"><i className={`fas ${p.icon}`}></i></div>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                  <span style={{color:'inherit',fontWeight:700,fontSize:'.95rem',display:'flex',alignItems:'center',gap:'8px'}}>Access Portal <i className="fas fa-arrow-right"></i></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Books Preview */}
        <section className="home-section" id="books">
          <div className="home-container">
            <div className="section-header">
              <div className="section-tag"><i className="fas fa-layer-group"></i> Live Catalog</div>
              <h2 className="section-title">Featured Collections</h2>
              <p className="section-sub">A real-time snapshot of our library's diverse academic offerings.</p>
            </div>
            <div className="books-preview-grid">
              {books.slice(0,8).map(b => {
                const emoji = BOOK_EMOJIS[b.category] || BOOK_EMOJIS.default;
                return (
                  <div key={b._id} className="book-prev-card">
                    <div className="book-cover-prev" style={{background:'linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.01))'}}>
                      <span style={{fontSize:'4.5rem',position:'relative',zIndex:2}}>{emoji}</span>
                      <span className={`book-prev-avail ${b.available > 0 ? 'yes' : 'no'}`}>{b.available > 0 ? 'Available' : 'Issued'}</span>
                    </div>
                    <div className="book-prev-info">
                      <div className="book-prev-title">{b.title}</div>
                      <div className="book-prev-author"><i className="fas fa-pen-nib"></i> {b.author}</div>
                      <div className="book-prev-meta">
                        <span className="book-tag-prev">{b.category || 'General'}</span>
                        <span className="book-tag-prev"><i className="fas fa-layer-group"></i> {b.available}/{b.copies} left</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{textAlign:'center',marginTop:'4rem'}}>
              <Link to="/login" className="btn-hero-outline"><i className="fas fa-search"></i> Login to Browse Full Catalog</Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="home-footer">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="home-logo" style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <div className="home-logo-icon" style={{width:'40px',height:'40px',fontSize:'1.1rem'}}><i className="fas fa-book-open"></i></div>
                Smart<span style={{color:'#fbbf24'}}>Lib</span>
              </div>
              <p>The premium library management solution, engineered for performance.</p>
              <div className="social-links">
                {['fab fa-facebook-f','fab fa-twitter','fab fa-instagram','fab fa-linkedin-in'].map((ic,i)=>(
                  <a key={i} className="social-link" href="#"><i className={ic}></i></a>
                ))}
              </div>
            </div>
            <div className="footer-col"><h4>Navigation</h4><a href="#home">Home</a><a href="#features">Features</a><a href="#portals">Portals</a><a href="#books">Catalog Preview</a></div>
            <div className="footer-col"><h4>Quick Access</h4><a href="/login">Admin Login</a><a href="/login">Librarian Login</a><a href="/login">Faculty Login</a><a href="/login">Student Login</a></div>
            <div className="footer-col"><h4>Contact Us</h4>
              <a href="#"><i className="fas fa-map-marker-alt" style={{marginRight:'8px',color:'#fbbf24'}}></i>Tech Campus, Block A</a>
              <a href="#"><i className="fas fa-phone-alt" style={{marginRight:'8px',color:'#fbbf24'}}></i>+91 98765 43210</a>
              <a href="#"><i className="fas fa-envelope" style={{marginRight:'8px',color:'#fbbf24'}}></i>support@smartlib.edu</a>
            </div>
          </div>
          <div className="footer-bottom"><p>&copy; 2026 SmartLib Academic Systems. All rights reserved. <i className="fas fa-heart" style={{color:'#ef4444',margin:'0 5px'}}></i> Built for education.</p></div>
        </footer>
      </div>
    </>
  );
}
