/** dashboard.js */
if (!Auth.guard()) throw new Error('no auth');
initSidebar('dashboard');

document.getElementById('dash-date').textContent =
  new Date().toLocaleDateString('es-AR', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

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

    renderMetrics(d);
    renderUltimasVentas(d.ultimasVentas ?? []);
    renderStockBajo(d.stockBajoList ?? []);
  } catch (err) {
    showToast(err.message, 'error');
    document.getElementById('metrics-grid').innerHTML =
      `<div class="alert alert-danger" style="grid-column:1/-1">⚠️ ${err.message}</div>`;
  }
}

function renderMetrics(d) {
  const grid = document.getElementById('metrics-grid');
  grid.innerHTML = `
    <div class="metric-card">
      <div class="metric-icon gold">💰</div>
      <div class="metric-body">
        <div class="metric-label">Ventas hoy</div>
        <div class="metric-value">${formatMoney(d.ventasHoy?.total ?? 0)}</div>
        <div class="metric-sub">${d.ventasHoy?.cantidad ?? 0} transacciones</div>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon green">📅</div>
      <div class="metric-body">
        <div class="metric-label">Ventas del mes</div>
        <div class="metric-value">${formatMoney(d.ventasMes?.total ?? 0)}</div>
        <div class="metric-sub">${d.ventasMes?.cantidad ?? 0} transacciones</div>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon primary">🧉</div>
      <div class="metric-body">
        <div class="metric-label">Productos activos</div>
        <div class="metric-value">${d.productosActivos ?? 0}</div>
        <div class="metric-sub">en catálogo</div>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon red">⚠️</div>
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
    el.innerHTML = `<div class="empty-state"><span class="empty-icon">🛍️</span><h3>Sin ventas aún</h3><p>Registrá tu primera venta.</p></div>`;
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
    el.innerHTML = `<div class="empty-state"><span class="empty-icon">✅</span><h3>Todo en orden</h3><p>Todos los productos tienen stock suficiente.</p></div>`;
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

loadDashboard();
