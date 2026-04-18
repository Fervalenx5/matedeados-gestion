/** dashboard.js */
if (!Auth.guard()) throw new Error('no auth');
initSidebar('dashboard');

document.getElementById('dash-date').textContent =
  new Date().toLocaleDateString('es-AR', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

/* ─── Gastos (localStorage) ─── */
const GASTOS_KEY = 'mda_gastos';

function getGastos() {
  try {
    return JSON.parse(localStorage.getItem(GASTOS_KEY)) || [];
  } catch { return []; }
}

function saveGastos(gastos) {
  localStorage.setItem(GASTOS_KEY, JSON.stringify(gastos));
}

function addGasto(gasto) {
  const gastos = getGastos();
  gasto.id = 'EX' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
  gastos.push(gasto);
  saveGastos(gastos);
  return gasto;
}

function deleteGasto(id) {
  const gastos = getGastos().filter(g => g.id !== id);
  saveGastos(gastos);
}

function getGastosMes(mesISO) {
  return getGastos().filter(g => (g.fecha || '').substring(0, 7) === mesISO);
}

/* ─── Dashboard principal ─── */

let cachedVentasMesTotal = 0;

async function loadDashboard() {
  try {
    // Traer datos del dashboard Y todas las ventas en paralelo
    const [d, todasVentas] = await Promise.all([
      API.getDashboard(),
      API.getVentas()
    ]);

    // Calcular ventas del día y del mes en el frontend
    // porque el servidor tiene problemas con el formato de fecha de Google Sheets
    const hoyISO = todayISO(); // 'yyyy-MM-dd'
    const mesISO = hoyISO.substring(0, 7); // 'yyyy-MM'

    let totalHoy = 0, cantHoy = 0, totalMes = 0, cantMes = 0;
    todasVentas.forEach(v => {
      const fechaVenta = String(v.fecha || '').substring(0, 10); // '2026-04-03' de ISO
      if (fechaVenta === hoyISO) {
        totalHoy += parseFloat(v.total || 0);
        cantHoy++;
      }
      if (fechaVenta.substring(0, 7) === mesISO) {
        totalMes += parseFloat(v.total || 0);
        cantMes++;
      }
    });

    // Sobreescribir los valores del servidor con los calculados localmente
    d.ventasHoy = { cantidad: cantHoy, total: totalHoy };
    d.ventasMes = { cantidad: cantMes, total: totalMes };

    // Cache para profit
    cachedVentasMesTotal = totalMes;

    renderMetrics(d);
    renderUltimasVentas(d.ultimasVentas ?? []);
    renderStockBajo(d.stockBajoList ?? []);
    renderProfitSection();
  } catch (err) {
    showToast(err.message, 'error');
    document.getElementById('metrics-grid').innerHTML =
      `<div class="alert alert-danger" style="grid-column:1/-1">${SVG_ICONS.alert} ${err.message}</div>`;
  }
}

function renderMetrics(d) {
  const grid = document.getElementById('metrics-grid');
  grid.innerHTML = `
    <div class="metric-card anim-fade-in anim-delay-1">
      <div class="metric-icon gold">${SVG_ICONS.dollar}</div>
      <div class="metric-body">
        <div class="metric-label">Ventas hoy</div>
        <div class="metric-value">${formatMoney(d.ventasHoy?.total ?? 0)}</div>
        <div class="metric-sub">${d.ventasHoy?.cantidad ?? 0} transacciones</div>
      </div>
    </div>
    <div class="metric-card anim-fade-in anim-delay-2">
      <div class="metric-icon green">${SVG_ICONS.calendar}</div>
      <div class="metric-body">
        <div class="metric-label">Ventas del mes</div>
        <div class="metric-value">${formatMoney(d.ventasMes?.total ?? 0)}</div>
        <div class="metric-sub">${d.ventasMes?.cantidad ?? 0} transacciones</div>
      </div>
    </div>
    <div class="metric-card anim-fade-in anim-delay-3">
      <div class="metric-icon primary">${SVG_ICONS.tag}</div>
      <div class="metric-body">
        <div class="metric-label">Productos activos</div>
        <div class="metric-value">${d.productosActivos ?? 0}</div>
        <div class="metric-sub">en catálogo</div>
      </div>
    </div>
    <div class="metric-card anim-fade-in anim-delay-4">
      <div class="metric-icon red">${SVG_ICONS.alertTri}</div>
      <div class="metric-body">
        <div class="metric-label">Stock bajo</div>
        <div class="metric-value ${(d.stockBajo ?? 0) > 0 ? 'text-danger' : 'text-success'}">${d.stockBajo ?? 0}</div>
        <div class="metric-sub">productos por reponer</div>
      </div>
    </div>`;
}

function renderUltimasVentas(ventas) {
  const el = document.getElementById('ultimas-ventas');
  if (!ventas.length) {
    el.innerHTML = `<div class="empty-state"><span class="empty-icon">${SVG_ICONS.bag}</span><h3>Sin ventas aún</h3><p>Registrá tu primera venta.</p></div>`;
    return;
  }
  el.innerHTML = `
    <div class="table-container" style="box-shadow:none; border:none">
    <table>
      <thead><tr><th>Fecha</th><th>Cliente</th><th>Producto</th><th>Total</th></tr></thead>
      <tbody>
        ${ventas.map(v => `
          <tr>
            <td class="text-sm">${formatDate(v.fecha)}</td>
            <td>${v.cliente}</td>
            <td class="text-muted text-sm">${v.productoNombre}</td>
            <td class="font-semi text-accent">${formatMoney(v.total)}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function renderStockBajo(lista) {
  const el = document.getElementById('stock-bajo');
  if (!lista.length) {
    el.innerHTML = `<div class="empty-state"><span class="empty-icon">${SVG_ICONS.checkOk}</span><h3>Todo en orden</h3><p>Todos los productos tienen stock suficiente.</p></div>`;
    return;
  }
  el.innerHTML = `
    <div class="table-container" style="box-shadow:none; border:none">
    <table>
      <thead><tr><th>Producto</th><th>Stock actual</th><th>Stock mín.</th></tr></thead>
      <tbody>
        ${lista.map(p => `
          <tr>
            <td>${p.nombre}</td>
            <td><span class="badge badge-danger">${p.stock}</span></td>
            <td class="text-muted">${p.stockMin}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
}

/* ─── Profit / Expenses Section ─── */

function renderProfitSection() {
  const mesISO = todayISO().substring(0, 7);

  // Month label
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const [y, m] = mesISO.split('-');
  document.getElementById('profit-month-label').textContent = `${monthNames[parseInt(m) - 1]} ${y}`;

  // Calculate
  const gastosMes = getGastosMes(mesISO);
  const totalGastos = gastosMes.reduce((s, g) => s + parseFloat(g.monto || 0), 0);
  const ingresos = cachedVentasMesTotal;
  const neto = ingresos - totalGastos;

  // Update profit summary
  document.getElementById('profit-ingresos').textContent = formatMoney(ingresos);
  document.getElementById('profit-gastos').textContent = formatMoney(totalGastos);

  const netoEl = document.getElementById('profit-neto');
  netoEl.textContent = formatMoney(neto);
  netoEl.className = 'profit-value ' + (neto >= 0 ? 'profit-positive' : 'profit-negative');

  // Render expenses list
  renderGastosList(gastosMes);
}

function renderGastosList(gastos) {
  const el = document.getElementById('gastos-list');
  if (!gastos.length) {
    el.innerHTML = `<div class="empty-state" style="padding: 24px 16px">
      <span class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span>
      <h3>Sin gastos registrados</h3>
      <p>Agregá tus gastos de compra de stock para ver la ganancia.</p>
    </div>`;
    return;
  }

  // Sort by date desc
  const sorted = [...gastos].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  el.innerHTML = `
    <div class="table-container" style="box-shadow:none; border:none">
    <table>
      <thead><tr><th>Fecha</th><th>Descripción</th><th>Monto</th><th></th></tr></thead>
      <tbody>
        ${sorted.map(g => `
          <tr>
            <td class="text-sm">${formatDate(g.fecha)}</td>
            <td>${g.descripcion}</td>
            <td class="font-semi text-danger">${formatMoney(g.monto)}</td>
            <td>
              <button class="btn btn-icon btn-danger btn-delete-gasto" data-id="${g.id}" title="Eliminar gasto">
                ${SVG_ICONS.trash}
              </button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;

  // Attach delete handlers
  el.querySelectorAll('.btn-delete-gasto').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      deleteGasto(id);
      showToast('Gasto eliminado', 'success');
      renderProfitSection();
    });
  });
}

/* ─── Form: agregar gasto ─── */
document.getElementById('form-gasto').addEventListener('submit', (e) => {
  e.preventDefault();
  const desc = document.getElementById('gasto-desc').value.trim();
  const monto = parseFloat(document.getElementById('gasto-monto').value);
  const fecha = document.getElementById('gasto-fecha').value || todayISO();

  if (!desc || isNaN(monto) || monto <= 0) {
    showToast('Completá todos los campos correctamente.', 'warning');
    return;
  }

  addGasto({ descripcion: desc, monto, fecha });
  showToast('Gasto registrado correctamente', 'success');

  // Reset form
  document.getElementById('form-gasto').reset();
  document.getElementById('gasto-fecha').value = todayISO();

  renderProfitSection();
});

// Set default date on load
document.getElementById('gasto-fecha').value = todayISO();

loadDashboard();
