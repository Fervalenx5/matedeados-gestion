# 🧉 Mate de a Dos — Panel de Gestión Interno

Panel web estático para administrar productos, stock y ventas del emprendimiento.

## Estructura del Proyecto

```
Gestion-MateDeADos/
├── index.html          # Login
├── dashboard.html      # Métricas
├── productos.html      # ABM de productos
├── ventas.html         # Ventas + historial
├── stock.html          # Movimientos de stock
├── css/
│   ├── main.css        # Variables, reset, utilidades
│   ├── layout.css      # Sidebar, topbar, layout responsivo
│   └── components.css  # Cards, botones, formularios, tablas, modales
├── js/
│   ├── config.js       # URL del Apps Script + credenciales
│   ├── auth.js         # Login/logout y guard de sesión
│   ├── api.js          # Todas las llamadas al Apps Script + helpers
│   ├── dashboard.js    # Lógica del dashboard
│   ├── productos.js    # CRUD de productos
│   ├── ventas.js       # Registro y filtros de ventas
│   └── stock.js        # Movimientos y ajustes de stock
├── apps-script/
│   └── Code.gs         # Código Google Apps Script (backend)
└── assets/
    └── logo.png        # Logo del emprendimiento
```

---

## Paso 1 — Guardar el logo

Guardá la imagen del logo como `assets/logo.png` en la carpeta del proyecto.

---

## Paso 2 — Configurar Google Sheets

1. Abrí [Google Sheets](https://sheets.google.com) y creá una planilla nueva.
2. Nombrála `Mate de a Dos - Gestión` (o como quieras).
3. Copiá el **ID del Spreadsheet** desde la URL:
   ```
   https://docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit
   
   ```

---

## Paso 3 — Configurar Google Apps Script

1. Abrí el Spreadsheet → **Extensiones → Apps Script**.
2. Borrá el contenido del editor y pegá el contenido de `apps-script/Code.gs`.
3. Reemplazá `REEMPLAZAR_CON_ID_DEL_SPREADSHEET` por el ID de tu Spreadsheet.
4. Guardá el proyecto (Ctrl+S).
5. Ejecutá la función `setupSheets()` para crear las hojas automáticamente:
   - Hacé clic en el selector de función → elegí `setupSheets` → clic en ▶️ Ejecutar.
   - Cuando pida permisos, aceptá todos.
6. Desplegá como Web App:
   - Clic en **Implementar → Nueva implementación**.
   - Tipo: **Aplicación web**.
   - Ejecutar como: **Yo**.
   - Acceso: **Cualquier persona**.
   - Clic en **Implementar** y copiá la URL generada.

---

## Paso 4 — Configurar `js/config.js`

```js
const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/TU_ID/exec', // ← Pegá la URL acá
  USERS: [
    { username: 'admin',  password: 'TU_CONTRASEÑA' },
    { username: 'socio',  password: 'TU_CONTRASEÑA_2' },
  ],
  ...
};
```

---

## Paso 5 — Despliegue en GitHub Pages

1. Creá un repositorio GitHub (ej. `matedeados-gestion`) como **privado**.
2. Subí todos los archivos:
   ```bash
   git init
   git add .
   git commit -m "Initial deploy"
   git remote add origin https://github.com/TU_USUARIO/matedeados-gestion.git
   git push -u origin main
   ```
3. En el repo → **Settings → Pages → Branch: main → Save**.
4. La URL quedará: `https://TU_USUARIO.github.io/matedeados-gestion/`

> **Nota de seguridad:** Las credenciales están en `config.js`. Para mayor seguridad, dejá el repo privado o usá una contraseña fuerte.

---

## Credenciales por defecto

| Usuario | Contraseña |
|---------|------------|
| `admin` | `mate2025` |
| `socio` | `yerba2025` |

Cambiálas en `js/config.js` antes de desplegar.

---

## Funcionalidades

| Sección | Qué podés hacer |
|---------|----------------|
| **Dashboard** | Ver ventas del día/mes, productos activos, alertas de stock bajo |
| **Productos** | Crear, editar y eliminar productos con foto por URL |
| **Ventas** | Registrar ventas (descuenta stock automáticamente), filtrar historial |
| **Stock** | Registrar entradas, salidas y ajustes manuales, ver historial |

---

## Ideas para escalar más adelante

1. **Autenticación real** → Firebase Auth o Supabase (gratuito).
2. **Reportes en PDF** → Librería `jsPDF` en el frontend.
3. **Múltiples precios** → Agregar columna `precioMayorista` en Sheets.
4. **Alertas por email** → Trigger de Apps Script que notifica cuando el stock baja.
5. **Modo offline** → Cache con `localStorage` para consultar sin internet.
6. **Categorías dinámicas** → Agregar hoja `Categorías` en Sheets para editarlas sin tocar código.
