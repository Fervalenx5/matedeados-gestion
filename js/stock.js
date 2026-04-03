/** stock.js */
if (!Auth.guard()) throw new Error('no auth');
initSidebar('stock');

let productos = [];
let movimientosFiltro = {};

/* ─── Init ─── */
async function init() {
  try {
    productos = await API.getProductos();
    populateSelects();
  } catch (err) {
    showToast('Error al cargar productos: ' + err.message, 'error');
  }

  document.getElementById('mov-fecha').value = todayISO();
  await loadMovimientos();
}

function populateSelects() {
  const ops = productos.map(p =>
    `<option value="${p.id}">${p.nombre} (stock actual: ${p.stock})</option>`
  ).join('');

  document.getElementById('mov-producto').innerHTML =
    `<option value="">— Seleccioná un producto —</option>` + ops;

  document.getElementById('fmov-producto').innerHTML =
    `<option value="">Todos</option>` +
    productos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
}

/* ─── Registrar movimiento ─── */
document.getElementById('form-movimiento').addEventListener('submit', async function (e) {
  e.preventDefault();

  const data = {
    productoId: document.getElementById('mov-producto').value,
    tipo:       document.getElementById('mov-tipo').value,
    cantidad:   parseInt(document.getElementById('mov-cantidad').value),
    fecha:      document.getElementById('mov-fecha').value || todayISO(),
    motivo:     document.getElementById('mov-motivo').value.trim(),
  };

  const btn = document.getElementById('btn-guardar-mov');
  btn.disabled = true; btn.textContent = 'Guardando…';

  try {
    const res = await API.saveMovimiento(data);
    showToast(`Movimiento registrado ✅ — Stock nuevo: ${res.nuevoStock}`);
    // reset
    document.getElementById('form-movimiento').reset();
    document.getElementById('mov-fecha').value = todayISO();
    // Actualizar stock del producto en memoria
    const prod = productos.find(p => p.id === data.productoId);
    if (prod) prod.stock = res.nuevoStock;
    populateSelects();
    await loadMovimientos();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '✅ Registrar movimiento';
  }
});

/* ─── Historial ─── */
async function loadMovimientos(filters = {}) {
  document.getElementById('tbody-movimientos').innerHTML =
    `<tr><td colspan="7"><div class="loading"><div class="spinner"></div></div></td></tr>`;
  try {
    const movs = await API.getMovimientos(filters);
    renderMovimientos(movs);
  } catch (err) {
    showToast(err.message, 'error');
    document.getElementById('tbody-movimientos').innerHTML =
      `<tr><td colspan="7"><div class="alert alert-danger" style="margin:16px">⚠️ ${err.message}</div></td></tr>`;
  }
}

function renderMovimientos(movs) {
  const tbody = document.getElementById('tbody-movimientos');
  if (!movs.length) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state"><span class="empty-icon">📦</span>
        <h3>Sin movimientos</h3><p>No hay movimientos registrados aún.</p>
      </div></td></tr>`;
    return;
  }

  const iconos = { entrada: '📥', salida: '📤', ajuste: '⚖️', venta: '🛍️' };

  tbody.innerHTML = movs.map(m => {
    const diff = Number(m.stockNuevo) - Number(m.stockAnterior);
    const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;
    return `<tr>
      <td class="text-sm">${formatDate(m.fecha)}</td>
      <td><strong>${m.productoNombre}</strong></td>
      <td><span class="badge badge-${m.tipo}">${iconos[m.tipo] ?? ''} ${m.tipo}</span></td>
      <td class="font-semi">${m.cantidad}</td>
      <td class="text-muted">${m.stockAnterior}</td>
      <td>
        <span class="font-semi">${m.stockNuevo}</span>
        <span class="text-xs ${diff >= 0 ? 'text-success' : 'text-danger'}" style="margin-left:4px">(${diffStr})</span>
      </td>
      <td class="text-muted text-sm">${m.motivo || '—'}</td>
    </tr>`;
  }).join('');
}

/* ─── Filtros ─── */
document.getElementById('btn-filtrar-mov').addEventListener('click', () => {
  loadMovimientos({
    productoId: document.getElementById('fmov-producto').value,
    tipo:       document.getElementById('fmov-tipo').value,
  });
});

init();
