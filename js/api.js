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
        return reject(new Error('Completá la URL del Apps Script en js/config.js'));
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

/* ─── SVG Icon helpers (inline, no emoji) ─── */
const SVG_ICONS = {
  check:     '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  x:         '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  alert:     '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info:      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  dollar:    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
  calendar:  '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  tag:       '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  alertTri:  '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  bag:       '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>',
  package:   '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  inbox:     '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>',
  arrowDownLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/></svg>',
  arrowUpRight:  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>',
  sliders:   '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg>',
  cart:      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>',
  edit:      '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash:     '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
  fileText:  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  save:      '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  checkOk:   '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
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
  const icons = {
    success: SVG_ICONS.check,
    error:   SVG_ICONS.x,
    warning: SVG_ICONS.alert
  };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type === 'success' ? '' : type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] ?? SVG_ICONS.info}</span><span>${msg}</span>`;
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
