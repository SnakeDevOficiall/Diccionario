import React, { useState, useEffect, useMemo } from 'react';
import { 
  House, Book, Globe, Heart, GraduationCap, Settings, 
  Search, Sun, Moon, Volume2, ArrowLeft, ArrowRight,
  ChevronRight, ExternalLink, Activity, WifiOff, FileText,
  RotateCcw, Trash2, Bell, XCircle, Info, Trophy, CheckCircle2,
  Clock, Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { offlineSpanishDictionary, lexicalCuriosities } from './offlineData';
import { quizData } from './quizData';

import { auth, loginWithGoogle, loginWithGithub, registerEmail, loginEmail } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const API_DICTIONARY = 'https://api.dictionaryapi.dev/api/v2/entries/';
const API_WIKI = 'https://{lang}.wikipedia.org/api/rest_v1/page/summary/';

const DictionaryApp = () => {
  const [lang, setLang] = useState('es');
  const [category, setCategory] = useState('all');
  const [theme, setTheme] = useState('dark');
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState([]);
  const [wordData, setWordData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [blurValue, setBlurValue] = useState(20);
  const [motionValue, setMotionValue] = useState(20);
  const [wotd, setWotd] = useState(null);
  const [quote, setQuote] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  
  // Progress State
  const [progress, setProgress] = useState({
    searches: 0,
    quizzes: 0,
    correctAnswers: 0,
    wikiReads: 0
  });

  const t = {
    en: { home: 'Home', wiki: 'Wikipedia', quiz: 'Quiz', settings: 'Settings', history: 'History', wotd: 'Word of the Day', philo: 'Philosophy', more: 'Read more', search: 'Search words...', offline: 'Offline Mode', usage: 'Word Usage', clearHistory: 'Clear' },
    es: { home: 'Inicio', wiki: 'Wikipedia', quiz: 'Quiz', settings: 'Ajustes', history: 'Historial', wotd: 'Palabra del Día', philo: 'Filosofía', more: 'Leer más', search: 'Buscar palabras...', offline: 'Modo Offline', usage: 'Uso de Palabras', clearHistory: 'Limpiar' },
    fr: { home: 'Accueil', wiki: 'Wikipédia', quiz: 'Quiz', settings: 'Paramètres', history: 'Historique', wotd: 'Mot du jour', philo: 'Philosophie', more: 'Lire la suite', search: 'Chercher des mots...', offline: 'Mode Hors-ligne', usage: 'Usage des Mots', clearHistory: 'Effacer' }
  };

  useEffect(() => {
    fetchWOTD();
    fetchDailyQuote();
    loadPersistentData();
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
    });

    // Esc key listener
    const handleEsc = (e) => {
      if (e.key === 'Escape') setShowNotification(false);
    };
    window.addEventListener('keydown', handleEsc);
    
    // Theme detection
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(isDark ? 'dark' : 'light');

    const timer = setTimeout(() => setShowNotification(true), 1500);
    const autoClose = setTimeout(() => setShowNotification(false), 15000); // Auto close after 15s
    return () => {
      window.removeEventListener('keydown', handleEsc);
      clearTimeout(timer);
      clearTimeout(autoClose);
    };
  }, [lang]);

  const loadPersistentData = () => {
    const savedHistory = localStorage.getItem('lexiconHistory');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedProgress = localStorage.getItem('lexiconProgress');
    if (savedProgress) setProgress(JSON.parse(savedProgress));
  };

  const saveProgress = (newStats) => {
    const updated = { ...progress, ...newStats };
    setProgress(updated);
    localStorage.setItem('lexiconProgress', JSON.stringify(updated));
  };

  const fetchWOTD = async () => {
    const words = { en: 'Luminous', es: 'Resiliencia', fr: 'Éphémère' };
    setLoading(true);
    try {
      const res = await fetch(`${API_DICTIONARY}${lang}/${words[lang]}`);
      const data = await res.json();
      if (Array.isArray(data)) setWotd(data[0]);
    } catch (e) { console.error("WOTD error", e); }
    setLoading(false);
  };

  const fetchDailyQuote = async () => {
    try {
      const res = await fetch('https://api.quotable.io/random');
      const data = await res.json();
      setQuote({ text: data.content, author: data.author });
    } catch (e) {
      setQuote({ text: "La sabiduría comienza con la definición de los términos.", author: "Sócrates" });
    }
  };

  const handleSearch = async (query = search) => {
    if (!query) return;
    setLoading(true);
    setError(null);
    
    const isWiki = category === 'wikipedia' || query.startsWith('!w ');
    const actualQuery = query.replace('!w ', '').trim();

    try {
      if (isWiki) {
        const res = await fetch(API_WIKI.replace('{lang}', lang) + encodeURIComponent(actualQuery));
        if (res.status === 404) throw new Error('Wiki not found');
        const data = await res.json();
        setWordData({ type: 'wiki', ...data });
        setCategory('results');
        saveProgress({ wikiReads: progress.wikiReads + 1 });
      } else {
        const res = await fetch(`${API_DICTIONARY}${lang}/${actualQuery}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setWordData({ type: 'dict', ...data[0] });
          setCategory('results');
          updateHistory(actualQuery);
          saveProgress({ searches: progress.searches + 1 });
        } else {
          setError(lang === 'es' ? 'Palabra no encontrada' : 'Word not found');
        }
      }
    } catch (e) {
      setError(lang === 'es' ? 'No se pudo encontrar información' : 'No information found');
    }
    setLoading(false);
  };

  const updateHistory = (word) => {
    if (!history.includes(word)) {
      const newHistory = [word, ...history.slice(0, 9)];
      setHistory(newHistory);
      localStorage.setItem('lexiconHistory', JSON.stringify(newHistory));
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('lexiconHistory');
  };

  const playAudio = (url) => { if (url) new Audio(url).play(); };

  const [showProfile, setShowProfile] = useState(false);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formName, setFormName] = useState('');

  const handleLogin = async (method) => {
    try {
      if (method === 'google') await loginWithGoogle();
      if (method === 'github') await loginWithGithub();
      setShowProfile(true);
    } catch (e) {
      console.error("Login error", e);
      setError("Error al iniciar sesión");
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (authMode === 'register') {
        await registerEmail(email, password, formName);
      } else {
        await loginEmail(email, password);
      }
      setShowProfile(true);
      setEmail('');
      setPassword('');
      setFormName('');
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const logout = () => {
    signOut(auth);
    setShowProfile(false);
  };

  return (
    <div className={`app-shell ${theme}-theme`} style={{ 
      '--accent-color': accentColor, 
      '--glass-blur': `${blurValue}px`,
      '--motion-speed': `${60 - motionValue}s`
    }}>
      {/* Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-overlay glass-panel" style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(40px)' }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="profile-modal glass-panel" style={{ width: 500, padding: 48, borderRadius: 32, position: 'relative' }}
            >
              <button className="close-profile" onClick={() => setShowProfile(false)} style={{ position: 'absolute', top: 24, right: 24, background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                <XCircle size={24} />
              </button>
              
              {!user ? (
                <div className="login-view">
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={authMode}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <h1 className="serife-title" style={{ fontSize: '2.5rem', marginBottom: 24 }}>
                        {authMode === 'login' ? 'Bienvenido' : 'Únete a Snake'}
                      </h1>
                      
                      <form onSubmit={handleEmailAuth} className="email-auth-form" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
                        {authMode === 'register' && (
                          <div className="input-group">
                            <label>Nombre de Usuario</label>
                            <input type="text" placeholder="Tu nombre" value={formName} onChange={(e) => setFormName(e.target.value)} required />
                          </div>
                        )}
                        <div className="input-group">
                          <label>Correo Electrónico</label>
                          <input type="email" placeholder="email@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div className="input-group">
                          <label>Contraseña</label>
                          <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <button type="submit" className="premium-btn auth-submit" style={{ padding: 18, borderRadius: 18, background: accentColor, border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '1.1rem', marginTop: 8 }}>
                          {authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                        </button>
                        <p style={{ textAlign: 'center', fontSize: '0.95rem', opacity: 0.7 }}>
                          {authMode === 'login' ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
                          <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} style={{ background: 'transparent', border: 'none', color: accentColor, fontWeight: 700, cursor: 'pointer', marginLeft: 8, textDecoration: 'underline' }}>
                            {authMode === 'login' ? 'Regístrate aquí' : 'Inicia sesión'}
                          </button>
                        </p>
                      </form>
                    </motion.div>
                  </AnimatePresence>

                  <div className="divider-text" style={{ textAlign: 'center', margin: '32px 0', opacity: 0.3, fontSize: '0.7rem', letterSpacing: '2px', position: 'relative' }}>O CONTINUA CON EXTERNOS</div>

                  <div className="login-buttons" style={{ display: 'flex', gap: 16 }}>
                    <button className="login-btn google" style={{ flex: 1, height: 60 }} onClick={() => handleLogin('google')}>
                      <Globe size={20} color={accentColor} /> <span>Google</span>
                    </button>
                    <button className="login-btn github" style={{ flex: 1, height: 60 }} onClick={() => handleLogin('github')}>
                      <Search size={20} opacity={0.5} /> <span>GitHub</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="profile-view">
                  <div className="profile-header" style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div className="avatar-wrapper" style={{ width: 120, height: 120, borderRadius: '50%', margin: '0 auto 16px', border: `4px solid ${accentColor}`, overflow: 'hidden' }}>
                      <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%' }} />
                    </div>
                    <h2>{user.displayName}</h2>
                    <p style={{ opacity: 0.5 }}>{user.email}</p>
                  </div>
                  
                  <div className="profile-stats glass-panel" style={{ padding: 24, borderRadius: 24, marginBottom: 32 }}>
                    <h3>Tus Logros</h3>
                    <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                      <div className="stat-box"><strong>{progress.searches}</strong><span>Palabras</span></div>
                      <div className="stat-box"><strong>{progress.correctAnswers}</strong><span>Aciertos</span></div>
                    </div>
                  </div>
                  
                  <button className="logout-btn" onClick={logout} style={{ width: '100%', padding: 16, borderRadius: 16, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', fontWeight: 700 }}>Cerrar Sesión</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification */}
      <AnimatePresence>
        {showNotification && quote && (
          <motion.div 
            initial={{ y: -120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -120, opacity: 0 }}
            className="notification glass-panel premium-shine"
          >
            <div className="notif-content">
              <Bell className="bell" size={20} />
              <div className="text">
                <span className="notif-label">Pensamiento del Día</span>
                <p>"{quote.text}"</p>
                <small>— {quote.author}</small>
              </div>
              <button className="close-notif" onClick={() => setShowNotification(false)}>
                <XCircle size={22} />
              </button>
            </div>
            <div className="notif-hint">Presiona ESC o haz clic en la X para cerrar</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liquid Background */}
      <div className="bg-blobs">
        <motion.div 
          animate={{ scale: [1, 1.3, 1], rotate: [0, 90, 0], x: [0, 150, 0], y: [0, 100, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="blob blob-1" 
        />
        <motion.div 
          animate={{ scale: [1.4, 1, 1.4], rotate: [0, -90, 0], x: [0, -120, 0], y: [0, -80, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="blob blob-2" 
        />
        <motion.div 
          animate={{ scale: [1, 1.5, 1], x: [100, -100, 100], y: [-50, 150, -50] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="blob blob-3"
        />
      </div>

      <div className="main-container glass-panel">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="search-container glass-panel">
            <Search size={18} opacity={0.6} />
            <input 
              placeholder={t[lang].search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <nav className="nav-list">
            <NavItem active={category === 'all'} onClick={() => setCategory('all')} icon={<House size={20}/>} label={t[lang].home} />
            <NavItem active={category === 'wikipedia'} onClick={() => setCategory('wikipedia')} icon={<Globe size={20}/>} label={t[lang].wiki} />
            <NavItem active={category === 'usage'} onClick={() => setCategory('usage')} icon={<FileText size={20}/>} label={t[lang].usage} />
            <NavItem active={category === 'offline'} onClick={() => setCategory('offline')} icon={<WifiOff size={20}/>} label={t[lang].offline} />
            <NavItem active={category === 'quiz'} onClick={() => setCategory('quiz')} icon={<GraduationCap size={20}/>} label={t[lang].quiz} />
            <div className="nav-divider" />
            <NavItem active={showProfile} onClick={() => setShowProfile(true)} icon={<div className="avatar-mini" style={{ width: 24, height: 24, borderRadius: '50%', background: accentColor, overflow: 'hidden' }}>{user ? <img src={user.photoURL} alt="" style={{width:'100%'}}/> : <Globe size={14}/>}</div>} label={user ? user.displayName : "Cuenta"} />
            <NavItem active={category === 'settings'} onClick={() => setCategory('settings')} icon={<Settings size={20}/>} label={t[lang].settings} />
          </nav>

          <div className="history-sec">
            <div className="sec-header">
              <h4>{t[lang].history}</h4>
              <button onClick={clearHistory} className="clear-btn"><Trash2 size={12}/> {t[lang].clearHistory}</button>
            </div>
            <div className="history-list">
              {history.map(item => (
                <div key={item} className="history-item" onClick={() => { setSearch(item); handleSearch(item); }}>
                  {item} <ChevronRight size={12} />
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="philo-card glass-panel">
              <span className="label">Daily Quote</span>
              <p>"{quote?.text.substring(0, 40)}..."</p>
              <small>— {quote?.author}</small>
            </div>
            <div className="lang-selector">
              <select value={lang} onChange={(e) => setLang(e.target.value)}>
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="content-area">
          <header className="content-header">
            <div className="header-controls">
              <button className="control-btn" onClick={() => window.history.back()}><ArrowLeft size={18}/></button>
              <button className="control-btn" onClick={() => window.history.forward()}><ArrowRight size={18}/></button>
              <div className="sep" />
              <button className="control-btn" onClick={() => fetchWOTD()}><RotateCcw size={18}/></button>
            </div>
            <div className="brand">Snake Diccionario</div>
            <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}
            </button>
          </header>

          <div className="scroll-content">
            <AnimatePresence mode="wait">
              {category === 'all' && (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} key="all-home">
                  <div className="hero-section">
                    <div className="wotd-card glass-panel premium-shine">
                      <span className="badge">{t[lang].wotd}</span>
                      {wotd ? (
                        <div className="wotd-content">
                          <h1 className="serife-title">{wotd.word}</h1>
                          <div className="phonetic-row">
                            <span className="phonetic">{wotd.phonetic}</span>
                            <button className="audio-btn" onClick={() => playAudio(wotd.phonetics.find(p => p.audio)?.audio)}>
                              <Volume2 size={24} />
                            </button>
                          </div>
                          <p className="main-def">{wotd.meanings[0].definitions[0].definition}</p>
                          {wotd.meanings[0].definitions[0].example && (
                            <p className="example">"{wotd.meanings[0].definitions[0].example}"</p>
                          )}
                        </div>
                      ) : <div className="loading-placeholder"><div className="pulse-text">Inspirando conocimientos...</div></div>}
                    </div>

                    <div className="info-grid mt-6">
                      <div className="info-card glass-panel">
                        <div className="header-row">
                          <Lightbulb size={24} color={accentColor} />
                          <h3>Curiosidad Léxica</h3>
                        </div>
                        <p className="curiosity-text">{lexicalCuriosities[Math.floor(Math.random() * lexicalCuriosities.length)]}</p>
                        <button className="refresh-mini" onClick={() => setCategory('all')}><RotateCcw size={14}/></button>
                      </div>
                      <div className="info-card glass-panel">
                        <div className="header-row">
                          <Trophy size={24} color={accentColor} />
                          <h3>Tu Progreso</h3>
                        </div>
                        <div className="stats-list">
                          <div className="stat-item">
                            <Search size={14} /> <span>Búsquedas: <strong>{progress.searches}</strong></span>
                          </div>
                          <div className="stat-item">
                            <CheckCircle2 size={14} /> <span>Aciertos: <strong>{progress.correctAnswers}</strong></span>
                          </div>
                          <div className="stat-item">
                            <Globe size={14} /> <span>Wiki leídas: <strong>{progress.wikiReads}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {category === 'results' && !loading && wordData && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} key="results-view">
                  {wordData.type === 'dict' ? (
                    <div className="dict-result">
                      <h1 className="serife-title">{wordData.word}</h1>
                      <div className="phonetic-row">
                        <span className="phonetic">{wordData.phonetic}</span>
                        <button className="audio-btn" onClick={() => playAudio(wordData.phonetics?.find(p => p.audio)?.audio)}>
                          <Volume2 size={20} />
                        </button>
                      </div>
                      <div className="meanings-grid">
                        {wordData.meanings.map((m, idx) => (
                          <div key={idx} className="meaning-block glass-panel">
                            <span className="pos">{m.partOfSpeech}</span>
                            <p className="definition-text">{m.definitions[0].definition}</p>
                            {m.definitions[0].example && <p className="example-text">"{m.definitions[0].example}"</p>}
                            {m.synonyms?.length > 0 && (
                              <div className="tags-row">
                                <strong>Sinónimos:</strong>
                                {m.synonyms.slice(0, 5).map(s => <span key={s} className="tag">{s}</span>)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="wiki-result">
                      <h1 className="serife-title">{wordData.title}</h1>
                      <div className="wiki-layout">
                        {wordData.thumbnail && <div className="wiki-img-wrapper"><img src={wordData.thumbnail.source} alt="" className="glass-panel" /></div>}
                        <div className="wiki-body">
                          <p>{wordData.extract}</p>
                          <a href={wordData.content_urls?.desktop.page} target="_blank" rel="noreferrer" className="premium-link">
                            {t[lang].more} <ExternalLink size={14} />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {category === 'offline' && <OfflineView lang={lang} onSearch={(w) => { setSearch(w); handleSearch(w); }} />}

              {category === 'usage' && <UsageView lang={lang} searchWord={search} wordData={wordData} onSearch={(w) => { setSearch(w); handleSearch(w); }} />}

              {category === 'quiz' && <Quiz lang={lang} accentColor={accentColor} saveProgress={saveProgress} progress={progress} />}
              
              {category === 'settings' && (
                <div className="settings-panel animate-fade-in" key="settings-view">
                  <h1 className="serife-title">{t[lang].settings}</h1>
                  <div className="settings-grid">
                    <div className="setting-card glass-panel"><label>Color de Acento</label><div className="color-grid">
                      {['#3b82f6', '#f472b6', '#10b981', '#fbbf24', '#8b5cf6'].map(c => (
                        <div key={c} className={`swatch ${accentColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setAccentColor(c)} />
                      ))}
                    </div></div>
                    <div className="setting-card glass-panel"><label>Intensidad de Desenfoque (Glass)</label><input type="range" min="0" max="40" value={blurValue} onChange={(e) => setBlurValue(e.target.value)} /><div className="val-display">{blurValue}px</div></div>
                    <div className="setting-card glass-panel"><label>Velocidad de Movimiento Líquido</label><input type="range" min="1" max="50" value={motionValue} onChange={(e) => setMotionValue(parseInt(e.target.value))} /><div className="val-display">{60 - motionValue}s</div></div>
                  </div>
                </div>
              )}

              {loading && <div className="loading-state" key="loading-view"><Activity className="spinner" size={48} /></div>}
              {error && <div className="error-state glass-panel" key="error-view">{error}</div>}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <style>{`
        .app-shell { width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; position: relative; overflow: hidden; }
        .bg-blobs { position: absolute; width: 100%; height: 100%; z-index: -1; pointer-events: none; }
        .blob { position: absolute; width: 800px; height: 800px; border-radius: 50%; opacity: 0.12; filter: blur(120px); }
        .blob-1 { background: var(--accent-color); top: -200px; left: -100px; }
        .blob-2 { background: #9333ea; bottom: -200px; right: -100px; }
        .blob-3 { background: #ec4899; top: 40%; left: 30%; }

        /* Notification */
        .notification { position: fixed; top: 24px; left: 50%; transform: translateX(-50%); z-index: 2000; padding: 24px; width: 550px; border-radius: 28px; box-shadow: 0 40px 80px -12px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.25); }
        .notif-content { display: flex; gap: 20px; align-items: flex-start; }
        .bell { color: var(--accent-color); padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 16px; flex-shrink: 0; }
        .notif-label { font-weight: 800; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; color: var(--accent-color); display: block; margin-bottom: 8px; }
        .text p { font-style: italic; line-height: 1.5; margin-bottom: 4px; font-size: 1rem; }
        .text small { opacity: 0.5; font-size: 0.8rem; }
        .close-notif { background: transparent; border: none; color: inherit; cursor: pointer; opacity: 0.6; padding: 0; transition: 0.2s; }
        .close-notif:hover { opacity: 1; color: #ef4444; transform: scale(1.1); }
        .notif-hint { position: absolute; bottom: 8px; right: 24px; font-size: 0.65rem; opacity: 0.4; }

        .main-container { width: 95vw; height: 90vh; display: flex; border-radius: 32px; overflow: hidden; box-shadow: 0 50px 100px -20px rgba(0,0,0,0.6); position: relative; }
        .sidebar { width: 300px; border-right: 1px solid var(--glass-border); display: flex; flex-direction: column; padding: 28px; background: rgba(0,0,0,0.15); overflow-y: auto; }
        .search-container { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 14px; margin-bottom: 32px; }
        .search-container input { background: transparent; border: none; color: inherit; outline: none; width: 100%; font-size: 0.95rem; }
        .nav-item { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-radius: 14px; cursor: pointer; transition: 0.25s; color: rgba(255,255,255,0.5); margin-bottom: 6px; }
        .nav-item.active { background: var(--accent-color) !important; color: white !important; box-shadow: 0 8px 24px -6px var(--accent-color); }
        
        .content-area { flex: 1; display: flex; flex-direction: column; background: rgba(255,255,255,0.01); }
        .content-header { padding: 24px 48px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--glass-border); }
        .brand { font-family: 'Playfair Display', serif; font-size: 1.4rem; font-weight: 700; background: linear-gradient(135deg, white, rgba(255,255,255,0.4)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .scroll-content { flex: 1; overflow-y: auto; padding: 48px; }
        .serife-title { font-family: 'Playfair Display', serif; font-size: 4.5rem; margin-bottom: 24px; letter-spacing: -2px; }
        
        .info-card { padding: 32px; border-radius: 28px; position: relative; }
        .header-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .curiosity-text { font-style: italic; line-height: 1.6; font-size: 1.05rem; opacity: 0.9; }
        .refresh-mini { position: absolute; bottom: 20px; right: 20px; background: transparent; border: none; opacity: 0.4; cursor: pointer; color: inherit; }
        .stats-list { display: flex; flex-direction: column; gap: 12px; }
        .stat-item { display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }
        .stat-item strong { color: var(--accent-color); font-size: 1.1rem; }

        .wotd-card { padding: 60px; border-radius: 32px; border: 1px solid rgba(255,255,255,0.15); position: relative; overflow: hidden; }
        .premium-shine::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, transparent 45%, rgba(255,255,255,0.1) 50%, transparent 55%); animation: shine 10s infinite linear; }
        @keyframes shine { from { background-position: -500px; } to { background-position: 500px; } }
        
        .audio-btn { width: 54px; height: 54px; border-radius: 50%; background: var(--accent-color); border: none; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 10px 20px -5px var(--accent-color); }
        .light-theme { color: #1e293b; }
        .mt-6 { margin-top: 24px; }
        .spinner { animation: spin 2s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .email-auth-form .input-group { display: flex; flex-direction: column; gap: 8px; }
        .email-auth-form label { font-size: 0.8rem; font-weight: 700; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; }
        .email-auth-form input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 14px 18px; border-radius: 12px; color: white; outline: none; transition: 0.2s; }
        .email-auth-form input:focus { border-color: var(--accent-color); background: rgba(255,255,255,0.08); }
        .login-btn { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 14px; border-radius: 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: inherit; cursor: pointer; transition: 0.2s; font-weight: 600; }
        .login-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); transform: translateY(-2px); }
      `}</style>
    </div>
  );
};

// Usage Component Fix
const UsageView = ({ lang, searchWord, wordData, onSearch }) => {
  const [localData, setLocalData] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    if (wordData && wordData.type === 'dict') {
      setLocalData(wordData);
    } else if (searchWord) {
      fetchUsage();
    }
  }, [searchWord, wordData]);

  const fetchUsage = async () => {
    setLocalLoading(true);
    try {
      const res = await fetch(`${API_DICTIONARY}${lang}/${searchWord}`);
      const json = await res.json();
      if (Array.isArray(json)) {
        setLocalData(json[0]);
      } else {
        setLocalData(null);
      }
    } catch(e) { 
      setLocalData(null); 
    }
    setLocalLoading(false);
  };

  if (!searchWord && !wordData) return (
    <div className="empty-usage glass-panel animate-fade-in" style={{ padding: 60, textAlign: 'center', borderRadius: 32 }}>
      <Search size={48} opacity={0.3} style={{ marginBottom: 20 }} />
      <h2 className="serife-title" style={{ fontSize: '2.5rem' }}>Explorador de Uso</h2>
      <p>Busca una palabra primero para ver sus ejemplos, sinónimos y variaciones estructurales.</p>
    </div>
  );

  return (
    <div className="usage-view animate-fade-in">
      <h1 className="serife-title">Uso de la Palabra</h1>
      {localLoading ? (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity className="spinner" size={32} />
        </div>
      ) : localData ? (
        <div className="usage-details">
          <div className="usage-card glass-panel" style={{ padding: 32, borderRadius: 28 }}>
            <h2 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <FileText color="var(--accent-color)" /> Ejemplos de Oraciones
            </h2>
            <div className="example-list">
              {localData.meanings && localData.meanings.flatMap(m => m.definitions || []).filter(d => d.example).slice(0, 5).map((d, i) => (
                <div key={i} className="example-bubble" style={{ padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 16, marginBottom: 12, fontStyle: 'italic', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <ChevronRight size={14} color="var(--accent-color)" style={{ marginTop: 4 }} /> 
                  <span>{d.example}</span>
                </div>
              ))}
              {(!localData.meanings || !localData.meanings.some(m => m.definitions?.some(d => d.example))) && (
                <p style={{ opacity: 0.6, textAlign: 'center', padding: 20 }}>No hay ejemplos disponibles para esta palabra específica.</p>
              )}
            </div>
          </div>
          <div className="usage-grid mt-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            <div className="rel-card glass-panel" style={{ padding: 24, borderRadius: 24 }}>
              <h3>Sinónimos</h3>
              <div className="tags-box" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                {localData.meanings && localData.meanings[0]?.synonyms?.length > 0 ? (
                  localData.meanings[0].synonyms.slice(0, 8).map(s => <span key={s} className="tag-premium" onClick={() => onSearch(s)}>{s}</span>)
                ) : <span style={{ opacity: 0.5 }}>No se encontraron sinónimos.</span>}
              </div>
            </div>
            <div className="rel-card glass-panel" style={{ padding: 24, borderRadius: 24 }}>
              <h3>Antónimos</h3>
              <div className="tags-box" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                {localData.meanings && localData.meanings[0]?.antonyms?.length > 0 ? (
                  localData.meanings[0].antonyms.slice(0, 8).map(a => <span key={a} className="tag-premium red" onClick={() => onSearch(a)}>{a}</span>)
                ) : <span style={{ opacity: 0.5 }}>No se encontraron antónimos.</span>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="error-state glass-panel" style={{ padding: 40, textAlign: 'center', borderRadius: 24 }}>
          <Info size={32} style={{ marginBottom: 16, opacity: 0.5 }} />
          <p>No se pudieron cargar datos detallados de uso para "{searchWord || (wordData && wordData.word)}".</p>
        </div>
      )}
      <style>{`
        .tag-premium { background: rgba(59, 130, 246, 0.1); color: var(--accent-color); padding: 6px 14px; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.9rem; border: 1px solid transparent; transition: 0.2s; }
        .tag-premium:hover { border-color: var(--accent-color); transform: translateY(-2px); background: var(--accent-color); color: white; }
        .tag-premium.red { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
        .tag-premium.red:hover { border-color: #ef4444; background: #ef4444; color: white; }
      `}</style>
    </div>
  );
};

// Offline View with Search
const OfflineView = ({ lang, onSearch }) => {
  const [filter, setFilter] = useState('');
  const filteredWords = offlineSpanishDictionary.filter(item => item.w.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="offline-view animate-fade-in">
      <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <h1 className="serife-title" style={{ margin: 0 }}>Modo Offline</h1>
        <div className="offline-search glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderRadius: 16, width: 350 }}>
          <Search size={18} opacity={0.5} />
          <input placeholder="Filtrar palabras offline..." value={filter} onChange={(e) => setFilter(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'inherit', outline: 'none', width: '100%' }} />
        </div>
      </div>
      <div className="word-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {filteredWords.map(item => (
          <motion.div whileHover={{ scale: 1.02 }} key={item.w} className="offline-card glass-panel" onClick={() => onSearch(item.w)} style={{ padding: 24, borderRadius: 24, cursor: 'pointer' }}>
            <strong style={{ fontSize: '1.4rem', color: 'var(--accent-color)', fontFamily: 'Playfair Display', display: 'block', marginBottom: 8 }}>{item.w}</strong>
            <p style={{ opacity: 0.8, lineHeight: 1.5 }}>{item.d}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }) => (
  <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
    {icon}
    <span>{label}</span>
  </div>
);

const Quiz = ({ lang, accentColor, saveProgress, progress }) => {
  const activeQuiz = quizData[lang] || quizData.es;
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);

  const current = activeQuiz[idx];

  const check = (i) => {
    if (selected !== null) return;
    setSelected(i);
    const isCorrect = i === current.c;
    saveProgress({ 
      quizzes: progress.quizzes + 1,
      correctAnswers: isCorrect ? progress.correctAnswers + 1 : progress.correctAnswers
    });
  };

  return (
    <div className="quiz-container animate-fade-in">
      <h1 className="serife-title">Desafío Lexical</h1>
      <div className="quiz-card glass-panel" style={{ padding: 48, borderRadius: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
          <span style={{ fontWeight: 800, color: accentColor }}>Pregunta {idx + 1} de {activeQuiz.length}</span>
          <div className="score-badge glass-panel" style={{ padding: '4px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)' }}>
            Aciertos: <strong>{progress.correctAnswers}</strong>
          </div>
        </div>
        <h2 style={{ fontSize: '2.2rem', marginBottom: 40, fontFamily: 'Playfair Display' }}>{current.q}</h2>
        <div className="options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {current.a.map((opt, i) => (
            <motion.div whileHover={{ scale: 1.02 }} key={i} className={`opt-btn glass-panel ${selected === i ? (i === current.c ? 'is-correct' : 'is-wrong') : ''} ${selected !== null && i === current.c ? 'is-correct' : ''}`} onClick={() => check(i)} style={{ padding: 24, borderRadius: 20, cursor: 'pointer', textAlign: 'center', fontWeight: 600, fontSize: '1.1rem' }}>
              {opt}
            </motion.div>
          ))}
        </div>
        {selected !== null && (
          <button className="premium-btn" onClick={() => { setIdx((idx + 1) % activeQuiz.length); setSelected(null); }} style={{ marginTop: 40, width: '100%', padding: 20, borderRadius: 20, background: accentColor, border: 'none', color: 'white', fontWeight: 700, fontSize: '1.2rem', cursor: 'pointer' }}>
            Siguiente Pregunta
          </button>
        )}
      </div>
      <style>{`
        .is-correct { background: rgba(16, 185, 129, 0.2) !important; border-color: #10b981 !important; color: #10b981; }
        .is-wrong { background: rgba(239, 68, 68, 0.2) !important; border-color: #ef4444 !important; color: #ef4444; }
      `}</style>
    </div>
  );
};

export default DictionaryApp;
