/**
 * auth.js — Login, logout y protección de rutas
 */
const Auth = {
  SESSION_KEY: 'mda_session',

  /** Intentar login. Retorna true si las credenciales son correctas. */
  login(username, password) {
    const user = CONFIG.USERS.find(
      u => u.username === username.trim() && u.password === password
    );
    if (!user) return false;

    const session = {
      username: user.username,
      loginAt: Date.now(),
      expiresAt: Date.now() + CONFIG.SESSION_HOURS * 3600 * 1000,
    };
    sessionStorage.setItem(Auth.SESSION_KEY, JSON.stringify(session));
    return true;
  },

  /** Cerrar sesión y redirigir al login. */
  logout() {
    sessionStorage.removeItem(Auth.SESSION_KEY);
    window.location.href = 'index.html';
  },

  /** Obtener sesión activa o null. */
  getSession() {
    try {
      const raw = sessionStorage.getItem(Auth.SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (Date.now() > s.expiresAt) { this.logout(); return null; }
      return s;
    } catch { return null; }
  },

  /** Proteger página: redirige al login si no hay sesión. */
  guard() {
    const s = this.getSession();
    if (!s) { window.location.href = 'index.html'; return false; }
    return true;
  },

  /** Nombre de usuario activo (o vacío). */
  getUsername() {
    return this.getSession()?.username ?? '';
  },
};
