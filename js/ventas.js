/** ventas.js — Multi-producto con carrito */
if (!Auth.guard()) throw new Error('no auth');
initSidebar('ventas');

let productos = [];
let carrito = []; // Array de { productoId, productoNombre, cantidad, precioUnit, subtotal }

/* ─── Init ─── */
async function init() {
  try {
    productos = await API.getProductos();
    populateProductoSelects();
  } catch (err) {
    showToast('Error al cargar productos: ' + err.message, 'error');
  }

  document.getElementById('venta-fecha').value = todayISO();
  await loadVentas();
}

function populateProductoSelects() {
  const selectCart = document.getElementById('cart-producto');
  const selectFiltro = document.getElementById('f-producto');

  const ops = productos.map(p =>
    `<option value="${p.id}" data-precio="${p.precio}" data-nombre="${p.nombre}">${p.nombre} (stock: ${p.stock})</option>`
  ).join('');

  selectCart.innerHTML = `<option value="">— Seleccioná —</option>` + ops;
  selectFiltro.innerHTML = `<option value="">Todos</option>` +
    productos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
}

/* ─── Carrito ─── */

// Auto-fill precio al elegir producto
document.getElementById('cart-producto').addEventListener('change', function () {
  const opt = this.selectedOptions[0];
  if (opt && opt.dataset.precio) {
    document.getElementById('cart-precio').value = opt.dataset.precio;
  }
});

// Agregar item al carrito
document.getElementById('btn-agregar-carrito').addEventListener('click', () => {
  const sel = document.getElementById('cart-producto');
  const productoId = sel.value;
  if (!productoId) { showToast('Seleccioná un producto', 'warning'); return; }

  const opt = sel.selectedOptions[0];
  const cantidad = parseInt(document.getElementById('cart-cantidad').value) || 1;
  const precioUnit = parseFloat(document.getElementById('cart-precio').value) || 0;

  if (precioUnit <= 0) { showToast('El precio debe ser mayor a 0', 'warning'); return; }

  // Check si ya está en el carrito
  const existing = carrito.find(c => c.productoId === productoId);
  if (existing) {
    existing.cantidad += cantidad;
    existing.subtotal = existing.cantidad * existing.precioUnit;
  } else {
    carrito.push({
      productoId,
      productoNombre: opt.dataset.nombre,
      cantidad,
      precioUnit,
      subtotal: cantidad * precioUnit,
    });
  }

  renderCarrito();

  // Reset inputs del agregar
  sel.value = '';
  document.getElementById('cart-cantidad').value = 1;
  document.getElementById('cart-precio').value = '';
});

function removeFromCart(index) {
  carrito.splice(index, 1);
  renderCarrito();
}

function renderCarrito() {
  const container = document.getElementById('carrito-container');
  const tbody = document.getElementById('tbody-carrito');
  const btnRegistrar = document.getElementById('btn-registrar-venta');

  if (!carrito.length) {
    container.style.display = 'none';
    btnRegistrar.disabled = true;
    return;
  }

  container.style.display = 'block';
  btnRegistrar.disabled = false;

  const removeIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  tbody.innerHTML = carrito.map((item, i) => `
    <tr>
      <td>${item.productoNombre}</td>
      <td>${item.cantidad}</td>
      <td>${formatMoney(item.precioUnit)}</td>
      <td class="text-accent font-semi">${formatMoney(item.subtotal)}</td>
      <td><button onclick="removeFromCart(${i})" class="btn btn-outline btn-sm" style="padding:4px 6px; color:var(--color-danger)">${removeIcon}</button></td>
    </tr>
  `).join('');

  const total = carrito.reduce((s, i) => s + i.subtotal, 0);
  document.getElementById('carrito-total').textContent = formatMoney(total);
}

/* ─── Registrar venta ─── */
document.getElementById('btn-registrar-venta').addEventListener('click', async () => {
  const cliente = document.getElementById('venta-cliente').value.trim();
  const fecha = document.getElementById('venta-fecha').value;
  const notas = document.getElementById('venta-notas').value.trim();

  if (!cliente) { showToast('Ingresá el nombre del cliente', 'warning'); return; }
  if (!fecha)   { showToast('Seleccioná la fecha', 'warning'); return; }
  if (!carrito.length) { showToast('Agregá al menos un producto al carrito', 'warning'); return; }

  const btn = document.getElementById('btn-registrar-venta');
  btn.disabled = true; btn.textContent = 'Registrando…';

  try {
    // Enviar todos los items del carrito
    const items = carrito.map(c => ({
      productoId: c.productoId,
      cantidad: c.cantidad,
      precioUnit: c.precioUnit,
    }));

    const res = await API.saveVenta({ cliente, fecha, notas, items });
    const totalVenta = carrito.reduce((s, i) => s + i.subtotal, 0);
    showToast(`Venta registrada — ${carrito.length} producto(s) — Total: ${formatMoney(totalVenta)}`);

    // Actualizar stock local
    if (res && res.stockUpdates) {
      res.stockUpdates.forEach(u => {
        const prod = productos.find(p => p.id === u.productoId);
        if (prod) prod.stock = u.nuevoStock;
      });
      populateProductoSelects();
    }

    limpiarFormVenta();
    await loadVentas();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = !carrito.length;
    btn.innerHTML = `${SVG_ICONS.check} Registrar venta`;
  }
});

function limpiarFormVenta() {
  document.getElementById('venta-cliente').value = '';
  document.getElementById('venta-fecha').value = todayISO();
  document.getElementById('venta-notas').value = '';
  document.getElementById('cart-producto').value = '';
  document.getElementById('cart-cantidad').value = 1;
  document.getElementById('cart-precio').value = '';
  carrito = [];
  renderCarrito();
}
document.getElementById('btn-limpiar-venta').addEventListener('click', limpiarFormVenta);

/* ─── Historial (agrupado por grupoId) ─── */
async function loadVentas(filters = {}) {
  const listContainer = document.getElementById('ventas-list');
  listContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const ventas = await API.getVentas(filters);
    renderVentasAgrupadas(ventas);
  } catch (err) {
    showToast(err.message, 'error');
    listContainer.innerHTML = `<div class="alert alert-danger" style="margin:16px">${SVG_ICONS.alert} ${err.message}</div>`;
  }
}

function renderVentasAgrupadas(ventas) {
  const container = document.getElementById('ventas-list');

  if (!ventas.length) {
    container.innerHTML = `<div class="card" style="padding:32px;text-align:center">
      <div class="empty-state">
        <span class="empty-icon">${SVG_ICONS.bag}</span>
        <h3>Sin ventas</h3>
        <p class="text-muted">No hay ventas que coincidan con los filtros.</p>
      </div>
    </div>`;
    return;
  }

  // Agrupar por grupoId (ventas con grupo = multi-item; sin grupo = legacy individual)
  const grupos = {};
  ventas.forEach(v => {
    const key = v.grupoId || v.id; // legacy sales don't have grupoId
    if (!grupos[key]) {
      grupos[key] = {
        grupoId: key,
        fecha: v.fecha,
        cliente: v.cliente,
        notas: v.notas,
        items: [],
        total: 0,
      };
    }
    grupos[key].items.push(v);
    grupos[key].total += parseFloat(v.total || 0);
  });

  // Ordenar por fecha desc
  const lista = Object.values(grupos).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));

  container.innerHTML = lista.map(g => {
    const itemsHtml = g.items.map(i =>
      `<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--color-border-light)">
        <span>${i.productoNombre}</span>
        <span class="text-muted text-sm" style="margin:0 8px">${i.cantidad} × ${formatMoney(i.precioUnit)}</span>
        <span class="font-semi">${formatMoney(i.total)}</span>
      </div>`
    ).join('');

    return `<div class="card" style="margin-bottom:12px">
      <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px">
        <div>
          <span class="font-semi" style="font-size:15px">${g.cliente}</span>
          <span class="text-muted text-sm" style="margin-left:8px">${formatDate(g.fecha)}</span>
        </div>
        <span class="badge badge-success" style="font-size:14px; padding:4px 12px">${formatMoney(g.total)}</span>
      </div>
      <div style="padding:8px 16px 12px">
        ${itemsHtml}
        ${g.notas ? `<p class="text-muted text-sm" style="margin-top:8px; font-style:italic; display:flex; align-items:center; gap:4px">${SVG_ICONS.fileText} ${g.notas}</p>` : ''}
        ${g.items.length > 1 ? `<p class="text-sm text-muted" style="margin-top:6px; display:flex; align-items:center; gap:4px">${SVG_ICONS.cart} ${g.items.length} productos</p>` : ''}
      </div>
    </div>`;
  }).join('');
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
