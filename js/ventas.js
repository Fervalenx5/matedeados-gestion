/** ventas.js */
if (!Auth.guard()) throw new Error('no auth');
initSidebar('ventas');

let productos = [];
let todasVentas = [];

/* ─── Init ─── */
async function init() {
  // Cargar productos para los selects
  try {
    productos = await API.getProductos();
    populateProductoSelects();
  } catch (err) {
    showToast('Error al cargar productos: ' + err.message, 'error');
  }

  // Fecha de hoy por defecto
  document.getElementById('venta-fecha').value = todayISO();

  await loadVentas();
}

function populateProductoSelects() {
  const selectVenta = document.getElementById('venta-producto');
  const selectFiltro = document.getElementById('f-producto');

  const ops = productos.map(p => `<option value="${p.id}" data-precio="${p.precio}">${p.nombre} (stock: ${p.stock})</option>`).join('');
  selectVenta.innerHTML  = `<option value="">— Seleccioná un producto —</option>` + ops;
  selectFiltro.innerHTML = `<option value="">Todos</option>` + productos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
}

/* ─── Cálculo de total en tiempo real ─── */
function calcTotal() {
  const cant  = parseFloat(document.getElementById('venta-cantidad').value) || 0;
  const prec  = parseFloat(document.getElementById('venta-precio').value)   || 0;
  document.getElementById('venta-total').textContent = formatMoney(cant * prec);
}

document.getElementById('venta-producto').addEventListener('change', function () {
  const opt = this.selectedOptions[0];
  if (opt && opt.dataset.precio) {
    document.getElementById('venta-precio').value = opt.dataset.precio;
    calcTotal();
  }
});
document.getElementById('venta-cantidad').addEventListener('input', calcTotal);
document.getElementById('venta-precio').addEventListener('input', calcTotal);

/* ─── Registrar venta ─── */
document.getElementById('form-venta').addEventListener('submit', async function (e) {
  e.preventDefault();
  const productoId = document.getElementById('venta-producto').value;
  const producto = productos.find(p => p.id === productoId);

  const data = {
    cliente:    document.getElementById('venta-cliente').value.trim(),
    fecha:      document.getElementById('venta-fecha').value,
    productoId,
    cantidad:   parseInt(document.getElementById('venta-cantidad').value),
    precioUnit: parseFloat(document.getElementById('venta-precio').value),
    notas:      document.getElementById('venta-notas').value.trim(),
  };

  const btn = document.getElementById('btn-registrar-venta');
  btn.disabled = true; btn.textContent = 'Registrando…';

  try {
    const res = await API.saveVenta(data);
    showToast(`Venta registrada ✅ — Stock nuevo: ${res.nuevoStock}`);
    limpiarFormVenta();
    // Actualizar stock reflejado en el select
    if (producto) producto.stock = res.nuevoStock;
    populateProductoSelects();
    await loadVentas();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '✅ Registrar venta';
  }
});

function limpiarFormVenta() {
  document.getElementById('form-venta').reset();
  document.getElementById('venta-fecha').value = todayISO();
  document.getElementById('venta-total').textContent = '$ 0';
}
document.getElementById('btn-limpiar-venta').addEventListener('click', limpiarFormVenta);

/* ─── Historial ─── */
async function loadVentas(filters = {}) {
  document.getElementById('tbody-ventas').innerHTML =
    `<tr><td colspan="7"><div class="loading"><div class="spinner"></div></div></td></tr>`;
  try {
    todasVentas = await API.getVentas(filters);
    renderVentas(todasVentas);
  } catch (err) {
    showToast(err.message, 'error');
    document.getElementById('tbody-ventas').innerHTML =
      `<tr><td colspan="7"><div class="alert alert-danger" style="margin:16px">⚠️ ${err.message}</div></td></tr>`;
  }
}

function renderVentas(ventas) {
  const tbody = document.getElementById('tbody-ventas');
  if (!ventas.length) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state"><span class="empty-icon">🛍️</span>
        <h3>Sin ventas</h3><p>No hay ventas que coincidan con los filtros.</p>
      </div></td></tr>`;
    return;
  }
  tbody.innerHTML = ventas.map(v => `
    <tr>
      <td class="text-sm">${formatDate(v.fecha)}</td>
      <td><strong>${v.cliente}</strong></td>
      <td class="text-muted">${v.productoNombre}</td>
      <td class="text-sm">${v.cantidad}</td>
      <td class="text-sm">${formatMoney(v.precioUnit)}</td>
      <td class="font-semi text-accent">${formatMoney(v.total)}</td>
      <td class="text-muted text-sm">${v.notas || '—'}</td>
    </tr>`).join('');
}

/* ─── Filtros ─── */
document.getElementById('btn-filtrar-ventas').addEventListener('click', () => {
  loadVentas({
    cliente:    document.getElementById('f-cliente').value.trim(),
    productoId: document.getElementById('f-producto').value,
    fechaDesde: document.getElementById('f-desde').value,
    fechaHasta: document.getElementById('f-hasta').value,
  });
});

document.getElementById('btn-limpiar-filtros').addEventListener('click', () => {
  document.getElementById('f-cliente').value  = '';
  document.getElementById('f-producto').value = '';
  document.getElementById('f-desde').value    = '';
  document.getElementById('f-hasta').value    = '';
  loadVentas();
});

init();
