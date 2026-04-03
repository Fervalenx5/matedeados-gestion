/**
 * config.js — Configuración central de la aplicación
 *
 * ANTES DE USAR:
 *   1. Desplegá tu Google Apps Script como web app y copiá la URL en SCRIPT_URL.
 *   2. Cargá las credenciales de acceso en USERS.
 */
const CONFIG = {
  // URL del Google Apps Script desplegado como Web App
  // Ejemplo: 'https://script.google.com/macros/s/AKfycby.../exec'
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzo9UugslvZ1YlqFQ2zKD2_Y_lTByO3l70syANVQfKQQKhMmuxPJwJBeOgJAKmPQkwX/exec',

  // Credenciales de acceso (hardcodeadas para uso interno)
  USERS: [
    { username: 'admin', password: 'mate2025' },
    { username: 'socio', password: 'yerba2025' },
  ],

  // Moneda
  CURRENCY: 'ARS',
  CURRENCY_SYMBOL: '$',

  // Tiempo de sesión (horas)
  SESSION_HOURS: 8,
};
