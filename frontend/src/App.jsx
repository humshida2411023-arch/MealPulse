import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Utensils, LayoutDashboard, CalendarDays, Star, MessageSquareWarning, History, LogOut, Menu as MenuIcon, X, Plus, CheckCircle2, AlertCircle, LoaderCircle, ShieldCheck, TrendingUp, Users, Clock3, ChevronRight, RefreshCw } from 'lucide-react';

const API = 'http://localhost:5000/api';
const today = () => new Date().toLocaleDateString('en-CA');
const meals = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
const categories = ['Food taste/quality', 'Insufficient quantity', 'Hygiene/cleanliness', 'Delayed service', 'Other'];
const blankRatings = { taste: 3, quality: 3, quantity: 3, cleanliness: 3, overall: 3 };
const initialFeedback = { date: today(), meal: 'Lunch', ...blankRatings, comments: '' };

function getToken() { return localStorage.getItem('hosteleats_token') || ''; }
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed. Please try again.');
  return data;
}
function RatingStars({ value, onChange, readOnly = false }) {
  return <div className="stars" role="group" aria-label={`Rating ${value} out of 5`}>{[1,2,3,4,5].map(n => <button type="button" key={n} className={`star ${n <= value ? 'active' : ''}`} disabled={readOnly} onClick={() => onChange?.(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}><Star size={20} fill={n <= value ? 'currentColor' : 'none'} /></button>)}<span className="rating-number">{value}/5</span></div>;
}
function Notice({ notice, clear }) {
  if (!notice) return null;
  return <div className={`notice ${notice.type}`} role="status"><span>{notice.type === 'error' ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}</span><span>{notice.text}</span><button onClick={clear} aria-label="Dismiss"><X size={16}/></button></div>;
}
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', roomNumber: '', department: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const update = e => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const data = await api(`/auth/${mode === 'login' ? 'login' : 'register'}`, { method: 'POST', body: JSON.stringify(form) });
      localStorage.setItem('hosteleats_token', data.token); onAuth(data.user);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <main className="auth-page">
    <div className="auth-visual"><div className="brand"><span className="brand-icon"><Utensils size={23}/></span><span>Hostel<span className="brand-accent">Eats</span></span></div><div className="visual-copy"><span className="eyebrow light">BETTER FOOD. BETTER HOSTEL LIFE.</span><h1>Your voice makes every meal better.</h1><p>Share feedback, check today's menu, and help your hostel dining team make meaningful improvements.</p><div className="visual-points"><span><CheckCircle2 size={17}/> Daily menus at a glance</span><span><CheckCircle2 size={17}/> Feedback that gets recorded</span><span><CheckCircle2 size={17}/> A cleaner, better dining experience</span></div></div><div className="visual-footer">A healthier feedback loop for hostel communities.</div></div>
    <div className="auth-form-side"><div className="auth-form-wrap"><div className="mobile-brand brand"><span className="brand-icon"><Utensils size={22}/></span><span>Hostel<span className="brand-accent">Eats</span></span></div><span className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</span><h2>{mode === 'login' ? 'Sign in to HostelEats' : 'Create your account'}</h2><p className="muted">{mode === 'login' ? 'Enter your details to continue to your dashboard.' : 'Join your hostel community and make your meals count.'}</p>
    {error && <div className="inline-error"><AlertCircle size={17}/>{error}</div>}
    <form onSubmit={submit} className="stack-form">
      {mode === 'register' && <><label>Full name<input name="name" value={form.name} onChange={update} placeholder="Your full name" required minLength="2" maxLength="80"/></label><div className="two-fields"><label>Room number<input name="roomNumber" value={form.roomNumber} onChange={update} placeholder="e.g. A-204"/></label><label>Department<input name="department" value={form.department} onChange={update} placeholder="e.g. CSE"/></label></div></>}
      <label>Email address<input type="email" name="email" value={form.email} onChange={update} placeholder="you@college.edu" autoComplete="email" required/></label>
      <label>Password<input type="password" name="password" value={form.password} onChange={update} placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'} minLength={mode === 'register' ? 8 : 1} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required/></label>
      <button className="btn primary full" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18}/> : null}{mode === 'login' ? 'Sign in' : 'Create account'}<ChevronRight size={18}/></button>
    </form><p className="switch-auth">{mode === 'login' ? "Don't have an account?" : 'Already registered?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p><div className="security-note"><ShieldCheck size={16}/> Your password is securely hashed before storage.</div></div></div>
  </main>;
}

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState('overview');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menus, setMenus] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [allFeedback, setAllFeedback] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [allComplaints, setAllComplaints] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedDate, setSelectedDate] = useState(today());
  const [feedbackForm, setFeedbackForm] = useState(initialFeedback);
  const [complaintForm, setComplaintForm] = useState({ category: categories[0], meal: 'Lunch', date: today(), description: '' });
  const [menuForm, setMenuForm] = useState({ breakfast: '', lunch: '', snacks: '', dinner: '' });

  const notify = (text, type = 'success') => { setNotice({ text, type }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const loadUser = useCallback(async () => {
    try { const data = await api('/auth/me'); setUser(data.user); }
    catch { localStorage.removeItem('hosteleats_token'); setUser(null); }
    finally { setAuthChecked(true); }
  }, []);
  useEffect(() => { if (getToken()) loadUser(); else setAuthChecked(true); }, [loadUser]);

  const loadMenus = useCallback(async () => { const data = await api('/menus'); setMenus(data); }, []);
  const loadMineFeedback = useCallback(async () => { const data = await api('/feedback/mine'); setFeedback(data); }, []);
  const loadMineComplaints = useCallback(async () => { const data = await api('/complaints/mine'); setComplaints(data); }, []);
  const loadAdmin = useCallback(async () => {
    const [f, c, a] = await Promise.all([api('/admin/feedback'), api('/admin/complaints'), api('/admin/analytics')]);
    setAllFeedback(f); setAllComplaints(c); setAnalytics(a);
  }, []);
  const refresh = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      await Promise.all([loadMenus(), loadMineFeedback(), loadMineComplaints()]);
      if (user.role === 'admin') await loadAdmin();
    } catch (err) { notify(err.message, 'error'); }
    finally { setBusy(false); }
  }, [user, loadMenus, loadMineFeedback, loadMineComplaints, loadAdmin]);
  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const found = menus.find(m => m.date === selectedDate);
    setMenuForm({ breakfast: found?.breakfast || '', lunch: found?.lunch || '', snacks: found?.snacks || '', dinner: found?.dinner || '' });
  }, [menus, selectedDate]);

  const logout = () => { localStorage.removeItem('hosteleats_token'); setUser(null); setPage('overview'); setNotice(null); };
  const navigate = key => { setPage(key); setSidebarOpen(false); setNotice(null); };
  const isAdmin = user?.role === 'admin';
  const menuToday = menus.find(m => m.date === today());
  const averageMine = feedback.length ? (feedback.reduce((sum, f) => sum + f.overall, 0) / feedback.length).toFixed(1) : '—';

  async function submitFeedback(e) {
    e.preventDefault(); setBusy(true);
    try { await api('/feedback', { method: 'POST', body: JSON.stringify(feedbackForm) }); setFeedbackForm({ ...initialFeedback, date: today() }); await loadMineFeedback(); if (isAdmin) await loadAdmin(); notify('Your meal feedback has been submitted. Thank you!'); navigate('history'); }
    catch (err) { notify(err.message, 'error'); } finally { setBusy(false); }
  }
  async function submitComplaint(e) {
    e.preventDefault(); setBusy(true);
    try { await api('/complaints', { method: 'POST', body: JSON.stringify(complaintForm) }); setComplaintForm({ category: categories[0], meal: 'Lunch', date: today(), description: '' }); await loadMineComplaints(); if (isAdmin) await loadAdmin(); notify('Your complaint has been submitted for review.'); navigate('complaints'); }
    catch (err) { notify(err.message, 'error'); } finally { setBusy(false); }
  }
  async function saveMenu(e) {
    e.preventDefault(); setBusy(true);
    try { await api(`/menus/${selectedDate}`, { method: 'PUT', body: JSON.stringify(menuForm) }); await loadMenus(); notify('Menu saved successfully.'); }
    catch (err) { notify(err.message, 'error'); } finally { setBusy(false); }
  }
  async function updateComplaint(item, status) {
    try { await api(`/admin/complaints/${item._id}`, { method: 'PATCH', body: JSON.stringify({ status, adminNote: item.adminNote || '' }) }); await loadAdmin(); notify('Complaint status updated.'); }
    catch (err) { notify(err.message, 'error'); }
  }

  if (!authChecked) return <div className="loading-screen"><LoaderCircle className="spin" size={30}/><p>Connecting to HostelEats…</p></div>;
  if (!user) return <><AuthScreen onAuth={u => { setUser(u); setPage('overview'); }}/></>;

  const navItems = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'menu', label: "Today's Menu", icon: CalendarDays },
    { key: 'give-feedback', label: 'Give Feedback', icon: Star },
    { key: 'history', label: 'My Feedback', icon: History },
    { key: 'complaints', label: 'Complaints', icon: MessageSquareWarning },
    ...(isAdmin ? [{ key: 'admin-menu', label: 'Manage Menu', icon: Utensils }, { key: 'admin-feedback', label: 'All Feedback', icon: Users }, { key: 'admin-complaints', label: 'Manage Complaints', icon: ShieldCheck }] : [])
  ];
  const titles = { overview: 'Overview', menu: "Today's menu", 'give-feedback': 'Share meal feedback', history: 'My feedback', complaints: 'Food complaints', 'admin-menu': 'Menu management', 'admin-feedback': 'All student feedback', 'admin-complaints': 'Complaint management' };

  return <div className="app-shell">
    {sidebarOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setSidebarOpen(false)}/>}
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-brand"><span className="brand-icon"><Utensils size={21}/></span><span>Hostel<span className="brand-accent">Eats</span></span><button className="icon-btn sidebar-close" onClick={() => setSidebarOpen(false)}><X size={20}/></button></div>
      <div className="workspace-label">WORKSPACE</div><nav className="side-nav">{navItems.map(item => <button key={item.key} onClick={() => navigate(item.key)} className={`nav-link ${page === item.key ? 'selected' : ''}`}><item.icon size={18}/><span>{item.label}</span>{page === item.key && <span className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-tip"><div className="tip-icon"><MessageSquareWarning size={18}/></div><strong>Your feedback matters</strong><p>Small suggestions can make a big difference to every meal.</p><button onClick={() => navigate('give-feedback')}>Share feedback <ChevronRight size={14}/></button></div><div className="user-mini"><div className="avatar">{user.name.slice(0,1).toUpperCase()}</div><div className="user-mini-copy"><strong>{user.name}</strong><span>{isAdmin ? 'Administrator' : user.department || 'Student'}</span></div><button className="icon-btn" onClick={logout} title="Sign out"><LogOut size={17}/></button></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-btn mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><MenuIcon size={21}/></button><div><div className="breadcrumb">HostelEats <span>/</span> <b>{titles[page]}</b></div><h1>{titles[page]}</h1></div></div><div className="topbar-right"><span className="date-chip"><CalendarDays size={15}/>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span><button className="icon-btn refresh-btn" onClick={refresh} title="Refresh data"><RefreshCw size={17}/></button><div className="avatar">{user.name.slice(0,1).toUpperCase()}</div></div></header>
      <div className="content-area"><Notice notice={notice} clear={() => setNotice(null)}/>
        {busy && <div className="busy-line"><span/></div>}
        {page === 'overview' && <section className="page-content">
          <div className="welcome-banner"><div><span className="eyebrow light">{isAdmin ? 'ADMIN WORKSPACE' : 'YOUR HOSTEL DINING SPACE'}</span><h2>{isAdmin ? `Welcome, ${user.name.split(' ')[0]}.` : `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${user.name.split(' ')[0]}!`}</h2><p>{isAdmin ? 'Review food quality trends and keep your dining services on track.' : 'See what’s cooking today and help make every meal better.'}</p></div><div className="banner-illustration"><div className="plate"><Utensils size={48}/></div><span className="floating-dot dot-one"/><span className="floating-dot dot-two"/></div></div>
          <div className="section-heading"><div><h3>{isAdmin ? 'Dining at a glance' : 'Your activity'}</h3><p className="muted">A quick snapshot of your HostelEats workspace.</p></div><button className="text-button" onClick={refresh}>Refresh data <RefreshCw size={14}/></button></div>
          <div className="stats-grid">{(isAdmin ? [
            { label: 'Total feedback', value: analytics?.feedbackCount ?? allFeedback.length, hint: 'Submissions received', icon: MessageSquareWarning, color: 'teal' },
            { label: 'Total complaints', value: analytics?.complaintCount ?? allComplaints.length, hint: 'Reports from students', icon: Users, color: 'purple' },
            { label: 'Pending complaints', value: analytics?.pendingCount ?? allComplaints.filter(c=>c.status==='Pending').length, hint: 'Need review', icon: Clock3, color: 'amber' },
            { label: 'Average satisfaction', value: analytics?.averages?.overall ? `${analytics.averages.overall.toFixed(1)}/5` : '—', hint: 'Overall meal rating', icon: TrendingUp, color: 'green' }
          ] : [
            { label: 'Feedback submitted', value: feedback.length, hint: 'Your recorded meal reviews', icon: MessageSquareWarning, color: 'teal' },
            { label: 'Complaints raised', value: complaints.length, hint: 'Issues you have reported', icon: ShieldCheck, color: 'purple' },
            { label: 'Your average rating', value: averageMine === '—' ? '—' : `${averageMine}/5`, hint: 'Your overall meal ratings', icon: Star, color: 'amber' },
            { label: "Today's menu", value: menuToday ? 'Available' : 'Not set', hint: menuToday ? 'Menu is ready to view' : 'Check back later', icon: CalendarDays, color: 'green' }
          ]).map(s => <div className="stat-card" key={s.label}><div className={`stat-icon ${s.color}`}><s.icon size={20}/></div><div className="stat-label">{s.label}</div><div className="stat-value">{s.value}</div><div className="stat-hint">{s.hint}</div></div>)}</div>
          {isAdmin && analytics?.mealAverages?.length > 0 && <div className="panel analytics-panel"><div className="panel-heading"><div><h3>Average satisfaction by meal</h3><p className="muted">Based on student overall ratings.</p></div><TrendingUp size={19}/></div>{analytics.mealAverages.map(m => <div className="bar-row" key={m._id}><span>{m._id}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${m.average / 5 * 100}%` }}/></div><strong>{m.average.toFixed(1)} <small>/ 5 · {m.count}</small></strong></div>)}</div>}
          <div className="dashboard-columns"><div className="panel"><div className="panel-heading"><div><h3>Today's menu</h3><p className="muted">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div><button className="subtle-button" onClick={() => navigate('menu')}>View menu <ChevronRight size={15}/></button></div>{menuToday ? <div className="meal-grid">{meals.map((meal, i) => <div className="meal-item" key={meal}><span className={`meal-emoji meal-${i}`}>{['☕','🍛','🥪','🍲'][i]}</span><div><strong>{meal}</strong><p>{menuToday[meal.toLowerCase()] || 'Menu not updated yet'}</p></div></div>)}</div> : <EmptyState icon={CalendarDays} title="Today's menu isn't available yet" text="The hostel team hasn't published today's menu." action={!isAdmin ? null : <button className="btn secondary small" onClick={() => navigate('admin-menu')}>Add today's menu</button>}/>}</div>
          <div className="panel quick-panel"><div className="panel-heading"><div><h3>Quick actions</h3><p className="muted">What would you like to do?</p></div></div><button className="quick-action" onClick={() => navigate('give-feedback')}><span className="quick-icon peach"><Star size={19}/></span><span><strong>Rate a meal</strong><small>Share your dining experience</small></span><ChevronRight size={17}/></button><button className="quick-action" onClick={() => navigate('complaints')}><span className="quick-icon lilac"><MessageSquareWarning size={19}/></span><span><strong>Report an issue</strong><small>Let the team know what happened</small></span><ChevronRight size={17}/></button><button className="quick-action" onClick={() => navigate('history')}><span className="quick-icon mint"><History size={19}/></span><span><strong>View my feedback</strong><small>Check your past submissions</small></span><ChevronRight size={17}/></button></div></div>
          <div className="bottom-note"><ShieldCheck size={16}/><span>Feedback is stored securely and helps the hostel team identify areas for improvement.</span></div>
        </section>}
        {page === 'menu' && <section className="page-content"><div className="page-intro"><div><h2>What's on the menu?</h2><p>Browse the meals planned for a selected date.</p></div><label className="date-field">Select date<input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}/></label></div><div className="menu-display-grid">{meals.map((meal, i) => { const value = menus.find(m=>m.date===selectedDate)?.[meal.toLowerCase()]; return <div className="menu-card" key={meal}><div className={`menu-card-art art-${i}`}><span>{['☕','🍛','🥪','🍲'][i]}</span><small>MEAL {String(i+1).padStart(2,'0')}</small></div><div className="menu-card-content"><span className="meal-time">{['07:00 – 09:00','12:00 – 14:00','16:00 – 17:00','19:00 – 21:00'][i]}</span><h3>{meal}</h3><p>{value || 'Menu has not been added for this meal yet.'}</p></div><div className="menu-card-footer"><span className={value ? 'available-dot' : 'unavailable-dot'}/>{value ? 'Menu available' : 'Awaiting menu update'}</div></div>; })}</div><div className="bottom-note"><CalendarDays size={16}/><span>Menus are maintained by hostel administration. Contact your food coordinator if you notice an outdated menu.</span></div></section>}
        {page === 'give-feedback' && <section className="page-content narrow-content"><div className="page-intro"><div><h2>How was your meal?</h2><p>Your honest feedback helps improve hostel dining for everyone.</p></div><div className="form-badge"><Star size={16}/> 5 rating categories</div></div><form className="panel form-panel" onSubmit={submitFeedback}><div className="form-section-title"><span>01</span><div><h3>Meal details</h3><p>Tell us which meal you're reviewing.</p></div></div><div className="two-fields"><label>Meal<select value={feedbackForm.meal} onChange={e=>setFeedbackForm({...feedbackForm,meal:e.target.value})}>{meals.map(m=><option key={m}>{m}</option>)}</select></label><label>Date<input type="date" required value={feedbackForm.date} max={today()} onChange={e=>setFeedbackForm({...feedbackForm,date:e.target.value})}/></label></div><div className="form-divider"/><div className="form-section-title"><span>02</span><div><h3>Rate your experience</h3><p>1 = needs improvement · 5 = excellent</p></div></div><div className="ratings-list">{[['taste','Taste','Was the meal enjoyable?'],['quality','Food quality','Freshness and preparation'],['quantity','Quantity','Was there enough food?'],['cleanliness','Cleanliness','Hygiene and presentation'],['overall','Overall satisfaction','Your overall experience']].map(([key,label,desc])=><div className="rating-row" key={key}><div><strong>{label}</strong><small>{desc}</small></div><RatingStars value={feedbackForm[key]} onChange={v=>setFeedbackForm({...feedbackForm,[key]:v})}/></div>)}</div><label className="comments-label">Additional comments <span>Optional</span><textarea rows="4" maxLength="1000" placeholder="Anything else you'd like the food team to know?" value={feedbackForm.comments} onChange={e=>setFeedbackForm({...feedbackForm,comments:e.target.value})}/><small className="char-count">{feedbackForm.comments.length}/1000</small></label><div className="form-actions"><span><ShieldCheck size={15}/> Your feedback is saved to your account.</span><button className="btn primary" disabled={busy}>Submit feedback <ChevronRight size={17}/></button></div></form></section>}
        {page === 'history' && <section className="page-content"><div className="page-intro"><div><h2>Your feedback history</h2><p>All the meal ratings and comments you've submitted.</p></div><div className="form-badge"><History size={16}/>{feedback.length} submissions</div></div>{feedback.length ? <div className="history-list">{feedback.map(f=><div className="panel history-card" key={f._id}><div className="history-top"><div className="history-meal-icon">{({Breakfast:'☕',Lunch:'🍛',Snacks:'🥪',Dinner:'🍲'})[f.meal]}</div><div className="history-title"><h3>{f.meal}</h3><p>{formatDate(f.date)} · Submitted {new Date(f.createdAt).toLocaleDateString('en-IN')}</p></div><div className="overall-pill"><Star size={15} fill="currentColor"/>{f.overall.toFixed(1)} / 5</div></div><div className="history-ratings">{[['Taste',f.taste],['Quality',f.quality],['Quantity',f.quantity],['Cleanliness',f.cleanliness],['Overall',f.overall]].map(([label,val])=><div key={label}><span>{label}</span><strong>{val}/5</strong></div>)}</div>{f.comments && <blockquote className="feedback-comment">“{f.comments}”</blockquote>}</div>)}</div> : <EmptyState icon={History} title="No feedback yet" text="Your meal reviews will appear here after you submit your first rating." action={<button className="btn primary" onClick={()=>navigate('give-feedback')}>Rate your first meal <ChevronRight size={16}/></button>}/>}</section>}
        {page === 'complaints' && <section className="page-content"><div className="page-intro"><div><h2>Food complaints</h2><p>Report dining issues and follow the status of your reports.</p></div><div className="form-badge"><ShieldCheck size={16}/>{complaints.length} reports</div></div><div className="complaint-layout"><form className="panel form-panel complaint-form" onSubmit={submitComplaint}><div className="panel-heading"><div><h3>Raise a complaint</h3><p className="muted">Please provide enough detail for the team to investigate.</p></div><span className="complaint-form-icon"><Plus size={19}/></span></div><label>Issue category<select value={complaintForm.category} onChange={e=>setComplaintForm({...complaintForm,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><div className="two-fields"><label>Related meal<select value={complaintForm.meal} onChange={e=>setComplaintForm({...complaintForm,meal:e.target.value})}>{[...meals,'Not applicable'].map(m=><option key={m}>{m}</option>)}</select></label><label>Date<input type="date" max={today()} required value={complaintForm.date} onChange={e=>setComplaintForm({...complaintForm,date:e.target.value})}/></label></div><label>Describe the issue<textarea rows="5" minLength="5" maxLength="1500" required placeholder="What happened? Include useful details…" value={complaintForm.description} onChange={e=>setComplaintForm({...complaintForm,description:e.target.value})}/></label><button className="btn primary full" disabled={busy}>Submit complaint <ChevronRight size={17}/></button><p className="form-footnote"><ShieldCheck size={14}/> Your report will be reviewed by hostel administration.</p></form><div className="complaint-history"><div className="section-heading"><div><h3>Your reports</h3><p className="muted">Status updates from the administration.</p></div></div>{complaints.length ? complaints.map(c=><div className="panel complaint-item" key={c._id}><div className="complaint-item-top"><span className={`status-badge ${c.status.toLowerCase().replace(' ','-')}`}>{c.status}</span><span className="complaint-date">{formatDate(c.date)}</span></div><h4>{c.category}</h4><p>{c.description}</p><div className="complaint-item-foot">{c.meal} <span>·</span> Submitted {new Date(c.createdAt).toLocaleDateString('en-IN')}</div>{c.adminNote && <div className="admin-note"><strong>Admin note:</strong> {c.adminNote}</div>}</div>) : <EmptyState icon={MessageSquareWarning} title="No complaints raised" text="If you notice a food-related issue, report it here."/ >}</div></div></section>}
        {page === 'admin-menu' && isAdmin && <section className="page-content narrow-content"><div className="page-intro"><div><h2>Manage daily menu</h2><p>Add or update the planned meals for any date.</p></div><div className="form-badge"><ShieldCheck size={16}/> Admin only</div></div><form className="panel form-panel" onSubmit={saveMenu}><label>Menu date<input type="date" required value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/></label><p className="helper-text">Choose a date, then enter the menu for each meal. Saving an existing date updates it.</p>{meals.map((meal,i)=><label className="menu-edit-field" key={meal}><span className={`meal-emoji meal-${i}`}>{['☕','🍛','🥪','🍲'][i]}</span><span className="menu-edit-label">{meal}</span><textarea rows="2" maxLength="500" placeholder={`Enter ${meal.toLowerCase()} items, e.g. ${['Idli, sambar, chutney','Rice, sambar, poriyal, curd','Sundal and tea','Chapati, kurma'][i]}`} value={menuForm[meal.toLowerCase()]} onChange={e=>setMenuForm({...menuForm,[meal.toLowerCase()]:e.target.value})}/></label>)}<div className="form-actions"><span><ShieldCheck size={15}/> Visible to all signed-in students.</span><button className="btn primary" disabled={busy}>Save menu <CheckCircle2 size={17}/></button></div></form><div className="panel menu-dates-panel"><h3>Recently managed dates</h3>{menus.length ? menus.slice(0,7).map(m=><button key={m._id} onClick={()=>setSelectedDate(m.date)} className="menu-date-row"><CalendarDays size={16}/><span>{formatDate(m.date)}</span><small>{[m.breakfast,m.lunch,m.snacks,m.dinner].filter(Boolean).length}/4 meals added</small><ChevronRight size={15}/></button>) : <p className="muted">No menus have been saved yet.</p>}</div></section>}
        {page === 'admin-feedback' && isAdmin && <section className="page-content"><div className="page-intro"><div><h2>All student feedback</h2><p>Review the feedback submitted by hostel residents.</p></div><div className="form-badge"><Users size={16}/>{allFeedback.length} records</div></div>{allFeedback.length ? <div className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Student</th><th>Meal / date</th><th>Taste</th><th>Quality</th><th>Quantity</th><th>Cleanliness</th><th>Overall</th><th>Comments</th></tr></thead><tbody>{allFeedback.map(f=><tr key={f._id}><td><strong>{f.studentName}</strong><small>{f.studentEmail}</small></td><td>{f.meal}<small>{formatDate(f.date)}</small></td>{['taste','quality','quantity','cleanliness','overall'].map(k=><td key={k}><span className="table-rating"><Star size={12} fill="currentColor"/>{f[k]}</span></td>)}<td className="comment-cell">{f.comments || '—'}</td></tr>)}</tbody></table></div></div> : <EmptyState icon={Star} title="No student feedback yet" text="Submissions will appear here once students review a meal."/>}</section>}
        {page === 'admin-complaints' && isAdmin && <section className="page-content"><div className="page-intro"><div><h2>Manage complaints</h2><p>Review reports and update their resolution status.</p></div><div className="form-badge"><MessageSquareWarning size={16}/>{allComplaints.length} reports</div></div>{allComplaints.length ? <div className="admin-complaint-list">{allComplaints.map(c=><div className="panel admin-complaint-card" key={c._id}><div className="admin-complaint-main"><div className="complaint-item-top"><span className={`status-badge ${c.status.toLowerCase().replace(' ','-')}`}>{c.status}</span><span className="complaint-date">{formatDate(c.date)}</span></div><h3>{c.category}</h3><p>{c.description}</p><div className="complaint-item-foot">By {c.studentName} ({c.studentEmail}) <span>·</span> {c.meal}</div>{c.adminNote && <div className="admin-note"><strong>Previous note:</strong> {c.adminNote}</div>}</div><div className="admin-complaint-controls"><label>Update status<select value={c.status} onChange={e=>updateComplaint(c,e.target.value)}><option>Pending</option><option>In Progress</option><option>Resolved</option></select></label><span className="muted tiny">Status saves immediately.</span></div></div>)}</div> : <EmptyState icon={ShieldCheck} title="All clear for now" text="New student complaints will appear here for review."/>}</section>}
        {!(page in titles) && <section className="page-content"><EmptyState icon={LayoutDashboard} title="Page unavailable" text="Choose a section from the navigation menu." action={<button className="btn primary" onClick={()=>navigate('overview')}>Back to overview</button>}/></section>}
        {page.startsWith('admin-') && !isAdmin && <section className="page-content"><EmptyState icon={ShieldCheck} title="Administrator access required" text="This section is only available to hostel administrators."/></section>}
        <footer className="app-footer"><span>© {new Date().getFullYear()} HostelEats</span><span>Made for better hostel dining <span className="footer-heart">♥</span></span></footer>
      </div>
    </main>
  </div>;
}
function formatDate(value) { if (!value) return '—'; const d = new Date(`${value}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
function EmptyState({ icon: Icon, title, text, action }) { return <div className="empty-state"><div className="empty-icon"><Icon size={25}/></div><h3>{title}</h3><p>{text}</p>{action || null}</div>; }
export default App;
