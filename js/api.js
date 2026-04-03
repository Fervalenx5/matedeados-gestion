/**
 * api.js — Capa de comunicación con Google Apps Script
 *
 * Usa JSONP en lugar de fetch para evitar el problema de CORS que ocurre
 * cuando Apps Script redirige la petición internamente antes de responder.
 * Esta técnica es la más confiable para Apps Script + frontend estático.
 */
const API = {
  /**
   * Llamada JSONP base.
   * @param {string} action  - Acción a ejecutar en el Apps Script
   * @param {object} params  - Parámetros adicionales
   * @returns {Promise}
   */
  call(action, params = {}) {
    return new Promise((resolve, reject) => {
      if (!CONFIG.SCRIPT_URL || CONFIG.SCRIPT_URL.startsWith('REEMPLAZAR')) {
        return reject(new Error('⚠️ Completá la URL del Apps Script en js/config.js'));
      }

      // Nombre único para el callback global
      const cbName = '__mda_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);

      // Construir URL
      const url = new URL(CONFIG.SCRIPT_URL);
      url.searchParams.set('action', action);
      url.searchParams.set('callback', cbName);
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(
            key,
            typeof value === 'object' ? JSON.stringify(value) : String(value)
          );
        }
      }

      // Timeout de 15 segundos
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Tiempo de espera agotado. Verificá tu conexión.'));
      }, 15000);

      function cleanup() {
        clearTimeout(timer);
        delete window[cbName];
        const el = document.getElementById(cbName);
        if (el) el.remove();
      }

      // Registrar callback global
      window[cbName] = function (json) {
        cleanup();
        if (!json.success) return reject(new Error(json.error || 'Error desconocido'));
        resolve(json.data);
      };

      // Inyectar script tag
      const script = document.createElement('script');
      script.id  = cbName;
      script.src = url.toString();
      script.onerror = () => {
        cleanup();
        reject(new Error('Error de red al contactar el servidor.'));
      };
      document.head.appendChild(script);
    });
  },

  /* ─── Productos ─── */
  getProductos: ()     => API.call('getProductos'),
  saveProducto: (data) => API.call('saveProducto', { data }),
  deleteProducto: (id) => API.call('deleteProducto', { id }),

  /* ─── Ventas ─── */
  getVentas: (f = {})  => API.call('getVentas', f),
  saveVenta: (data)    => API.call('saveVenta', { data }),

  /* ─── Stock ─── */
  getMovimientos: (f = {}) => API.call('getMovimientos', f),
  saveMovimiento: (data)   => API.call('saveMovimiento', { data }),

  /* ─── Dashboard ─── */
  getDashboard: ()     => API.call('getDashboard'),
};

/* ─── Helpers globales ─── */

/** Formatea número como moneda argentina */
function formatMoney(n) {
  return `${CONFIG.CURRENCY_SYMBOL} ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
}

/** Formatea fecha ISO a dd/mm/aaaa */
function formatDate(str) {
  if (!str) return '—';
  const d = String(str).substring(0, 10).split('-');
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : str;
}

/** Fecha de hoy en formato ISO */
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/** Muestra un toast de notificación */
function showToast(msg, type = 'success') {
  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type === 'success' ? '' : type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] ?? '🔔'}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3100);
}

/** Inicializa sidebar: logout + resaltado de página activa + mobile menu */
function initSidebar(activePage) {
  document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());

  // Marcar enlace activo
  document.querySelectorAll('.nav-item').forEach(link => {
    if (link.dataset.page === activePage) link.classList.add('active');
  });

  // Mobile: toggle sidebar
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const btnMenu  = document.getElementById('btn-menu');

  function closeSidebar() {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('visible');
  }
  btnMenu?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('visible');
  });
  overlay?.addEventListener('click', closeSidebar);
}
