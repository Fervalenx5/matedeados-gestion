/** productos.js */
if (!Auth.guard()) throw new Error('no auth');
initSidebar('productos');

let productos = [];
let editingId = null;
let deletingId = null;

/* ─── Carga inicial ─── */
async function loadProductos() {
  try {
    productos = await API.getProductos();
    renderTabla();
  } catch (err) {
    document.getElementById('tbody-productos').innerHTML =
      `<tr><td colspan="8"><div class="alert alert-danger" style="margin:16px">⚠️ ${err.message}</div></td></tr>`;
    showToast(err.message, 'error');
  }
}

/* ─── Tabla ─── */
function renderTabla() {
  const tbody = document.getElementById('tbody-productos');
  if (!productos.length) {
    tbody.innerHTML = `<tr><td colspan="8">
      <div class="empty-state"><span class="empty-icon">🧉</span>
        <h3>Sin productos</h3><p>Creá el primero con el botón "Nuevo producto".</p>
      </div></td></tr>`;
    return;
  }
  tbody.innerHTML = productos.map(p => {
    const stockBajo = Number(p.stock) <= Number(p.stockMin);
    const fotoEl = p.foto
      ? `<img src="${p.foto}" class="product-thumb" alt="${p.nombre}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="product-thumb-placeholder" style="display:none">🧉</div>`
      : `<div class="product-thumb-placeholder">🧉</div>`;
    return `<tr>
      <td>${fotoEl}</td>
      <td><strong>${p.nombre}</strong></td>
      <td><span class="badge badge-muted">${p.categoria}</span></td>
      <td class="font-semi">${formatMoney(p.precio)}</td>
      <td><span class="badge ${stockBajo ? 'badge-danger' : 'badge-success'}">${p.stock}</span></td>
      <td class="text-muted">${p.stockMin ?? 0}</td>
      <td><span class="badge ${p.activo !== false && p.activo !== 'FALSE' ? 'badge-success' : 'badge-muted'}">${p.activo !== false && p.activo !== 'FALSE' ? 'Activo' : 'Inactivo'}</span></td>
      <td><div class="td-actions">
        <button class="btn btn-outline btn-sm btn-icon" onclick="openEdit('${p.id}')" title="Editar">✏️</button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="confirmDelete('${p.id}')" title="Eliminar">🗑️</button>
      </div></td>
    </tr>`;
  }).join('');
}

/* ─── Modal ─── */
function openModal(titulo) {
  document.getElementById('modal-title').textContent = titulo;
  document.getElementById('modal-producto').classList.add('open');
}
function closeModal() {
  document.getElementById('modal-producto').classList.remove('open');
  document.getElementById('form-producto').reset();
  document.getElementById('prod-foto-preview').style.display = 'none';
  editingId = null;
}

document.getElementById('btn-nuevo').addEventListener('click', () => {
  editingId = null;
  openModal('Nuevo producto');
});
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal-producto').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

function openEdit(id) {
  const p = productos.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById('prod-id').value       = p.id;
  document.getElementById('prod-nombre').value    = p.nombre;
  document.getElementById('prod-categoria').value = p.categoria;
  document.getElementById('prod-precio').value    = p.precio;
  document.getElementById('prod-stock').value     = p.stock;
  document.getElementById('prod-stock-min').value = p.stockMin ?? 0;
  document.getElementById('prod-foto').value      = p.foto ?? '';
  actualizarPreviewFoto(p.foto);
  openModal('Editar producto');
}

/* Image preview */
document.getElementById('prod-foto').addEventListener('input', e => actualizarPreviewFoto(e.target.value));
function actualizarPreviewFoto(url) {
  const preview = document.getElementById('prod-foto-preview');
  if (url && url.startsWith('http')) {
    preview.src = url; preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

/* Guardar */
document.getElementById('btn-guardar-prod').addEventListener('click', async () => {
  const form = document.getElementById('form-producto');
  if (!form.reportValidity()) return;

  const data = {
    id:        editingId ?? undefined,
    nombre:    document.getElementById('prod-nombre').value.trim(),
    categoria: document.getElementById('prod-categoria').value,
    precio:    parseFloat(document.getElementById('prod-precio').value),
    stock:     parseInt(document.getElementById('prod-stock').value),
    stockMin:  parseInt(document.getElementById('prod-stock-min').value) || 0,
    foto:      document.getElementById('prod-foto').value.trim(),
  };

  const btn = document.getElementById('btn-guardar-prod');
  btn.disabled = true; btn.textContent = 'Guardando…';

  try {
    await API.saveProducto(data);
    showToast(editingId ? 'Producto actualizado ✅' : 'Producto creado ✅');
    closeModal();
    await loadProductos();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '💾 Guardar producto';
  }
});

/* ─── Delete ─── */
function confirmDelete(id) {
  deletingId = id;
  document.getElementById('confirm-delete').classList.add('open');
}
document.getElementById('confirm-cancel').addEventListener('click', () => {
  document.getElementById('confirm-delete').classList.remove('open');
  deletingId = null;
});
document.getElementById('confirm-ok').addEventListener('click', async () => {
  if (!deletingId) return;
  const btn = document.getElementById('confirm-ok');
  btn.disabled = true; btn.textContent = 'Eliminando…';
  try {
    await API.deleteProducto(deletingId);
    showToast('Producto eliminado');
    document.getElementById('confirm-delete').classList.remove('open');
    deletingId = null;
    await loadProductos();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Eliminar';
  }
});

loadProductos();
