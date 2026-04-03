/**
 * Code.gs — Google Apps Script para Mate de a Dos
 *
 * Desplegá como Web App:
 *   - Ejecutar como: Yo (el propietario)
 *   - Acceso: Cualquier persona
 *
 * Copiá la URL generada en js/config.js → CONFIG.SCRIPT_URL
 */

// ── CONFIGURACIÓN ──
const SPREADSHEET_ID   = '10MhfFLQF9CywvBqeGqWftxq1B_yUEa2LBhQ5o2o8FXg';
const SHEET_PRODUCTOS  = 'Productos';
const SHEET_VENTAS     = 'Ventas';
const SHEET_MOVIMIENTOS = 'MovimientosStock';

// ── ROUTER PRINCIPAL ──
function doGet(e) {
  // Protección: si se ejecuta manualmente desde el editor, e es undefined
  if (!e || !e.parameter) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: 'Esta función debe ejecutarse como Web App, no manualmente. Usá Implementar → Probar implementaciones.' })
    ).setMimeType(ContentService.MimeType.JSON);
  }
  const action = e.parameter.action;
  let result;

  try {
    switch (action) {
      case 'getProductos':   result = getProductos();                              break;
      case 'saveProducto':   result = saveProducto(JSON.parse(e.parameter.data));  break;
      case 'deleteProducto': result = deleteProducto(e.parameter.id);              break;
      case 'getVentas':      result = getVentas(e.parameter);                      break;
      case 'saveVenta':      result = saveVenta(JSON.parse(e.parameter.data));     break;
      case 'getMovimientos': result = getMovimientos(e.parameter);                 break;
      case 'saveMovimiento': result = saveMovimiento(JSON.parse(e.parameter.data)); break;
      case 'getDashboard':   result = getDashboard();                              break;
      default:               result = { success: false, error: 'Acción desconocida: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  // Soporte JSONP: si el frontend envió ?callback=fn, envolver la respuesta
  const callback = e.parameter.callback;
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(result) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── HEADERS por hoja ──
const HEADERS = {
  Productos:        ['ID','Nombre','Categoría','Precio','Stock','StockMin','Foto','Activo','FechaCreacion'],
  Ventas:           ['ID','Fecha','Cliente','ProductoID','ProductoNombre','Cantidad','PrecioUnit','Total','Notas'],
  MovimientosStock: ['ID','Fecha','ProductoID','ProductoNombre','Tipo','Cantidad','StockAnterior','StockNuevo','Motivo'],
};

// ── HELPERS ──
/**
 * Obtiene una hoja por nombre. Si no existe, la crea con sus encabezados.
 * Nunca retorna null.
 */
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = HEADERS[name];
    if (headers) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
  }
  return sheet;
}

function generateId(prefix) {
  return prefix + Date.now().toString(36).toUpperCase() +
         Math.random().toString(36).substr(2, 4).toUpperCase();
}

function hoy() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function findRow(sheet, colIndex, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]) === String(value)) return { row: data[i], index: i + 1 };
  }
  return null;
}

// ── PRODUCTOS ──

function getProductos() {
  const data = getSheet(SHEET_PRODUCTOS).getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  const productos = data.slice(1)
    .filter(r => r[7] !== false && String(r[7]) !== 'FALSE' && r[0] !== '')
    .map(r => ({
      id: r[0], nombre: r[1], categoria: r[2],
      precio: r[3], stock: r[4], stockMin: r[5],
      foto: r[6], activo: r[7], fechaCreacion: r[8]
    }));

  return { success: true, data: productos };
}

function saveProducto(data) {
  const sheet = getSheet(SHEET_PRODUCTOS);
  const all   = sheet.getDataRange().getValues();

  if (data.id) {
    // Actualizar fila existente
    for (let i = 1; i < all.length; i++) {
      if (String(all[i][0]) === String(data.id)) {
        sheet.getRange(i + 1, 1, 1, 9).setValues([[
          data.id, data.nombre, data.categoria,
          parseFloat(data.precio), parseInt(data.stock), parseInt(data.stockMin || 0),
          data.foto || '', true, all[i][8]
        ]]);
        return { success: true, data: { id: data.id } };
      }
    }
    return { success: false, error: 'Producto no encontrado' };

  } else {
    // Crear nuevo
    const id = generateId('P');
    sheet.appendRow([
      id, data.nombre, data.categoria,
      parseFloat(data.precio), parseInt(data.stock), parseInt(data.stockMin || 0),
      data.foto || '', true, hoy()
    ]);
    return { success: true, data: { id } };
  }
}

function deleteProducto(id) {
  const sheet = getSheet(SHEET_PRODUCTOS);
  const found = findRow(sheet, 0, id);
  if (!found) return { success: false, error: 'Producto no encontrado' };
  sheet.getRange(found.index, 8).setValue(false); // Marcar inactivo
  return { success: true };
}

function updateStock(sheet, productoId, nuevoStock) {
  const found = findRow(sheet, 0, productoId);
  if (found) sheet.getRange(found.index, 5).setValue(nuevoStock);
}

// ── VENTAS ──

function getVentas(params) {
  const data = getSheet(SHEET_VENTAS).getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  let ventas = data.slice(1)
    .filter(r => r[0] !== '')
    .map(r => ({
      id: r[0], fecha: r[1], cliente: r[2], productoId: r[3],
      productoNombre: r[4], cantidad: r[5], precioUnit: r[6], total: r[7], notas: r[8]
    }));

  if (params.cliente)    ventas = ventas.filter(v => String(v.cliente).toLowerCase().includes(params.cliente.toLowerCase()));
  if (params.productoId) ventas = ventas.filter(v => String(v.productoId) === params.productoId);
  if (params.fechaDesde) ventas = ventas.filter(v => String(v.fecha).substring(0,10) >= params.fechaDesde);
  if (params.fechaHasta) ventas = ventas.filter(v => String(v.fecha).substring(0,10) <= params.fechaHasta);

  ventas.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  return { success: true, data: ventas };
}

function saveVenta(data) {
  const prodSheet  = getSheet(SHEET_PRODUCTOS);
  const ventSheet  = getSheet(SHEET_VENTAS);
  const movSheet   = getSheet(SHEET_MOVIMIENTOS);

  const prod = findRow(prodSheet, 0, data.productoId);
  if (!prod) return { success: false, error: 'Producto no encontrado' };

  const stockActual = parseInt(prod.row[4]);
  const cantidad    = parseInt(data.cantidad);

  if (stockActual < cantidad)
    return { success: false, error: `Stock insuficiente. Stock actual: ${stockActual}` };

  const nuevoStock = stockActual - cantidad;
  const total      = cantidad * parseFloat(data.precioUnit);
  const id         = generateId('V');
  const fecha      = data.fecha || hoy();

  // Registrar venta
  ventSheet.appendRow([
    id, fecha, data.cliente, data.productoId, prod.row[1],
    cantidad, parseFloat(data.precioUnit), total, data.notas || ''
  ]);

  // Actualizar stock
  prodSheet.getRange(prod.index, 5).setValue(nuevoStock);

  // Registrar movimiento automático
  movSheet.appendRow([
    generateId('M'), fecha, data.productoId, prod.row[1],
    'venta', cantidad, stockActual, nuevoStock,
    `Venta #${id} — ${data.cliente}`
  ]);

  return { success: true, data: { id, nuevoStock } };
}

// ── MOVIMIENTOS ──

function getMovimientos(params) {
  const data = getSheet(SHEET_MOVIMIENTOS).getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  let movs = data.slice(1)
    .filter(r => r[0] !== '')
    .map(r => ({
      id: r[0], fecha: r[1], productoId: r[2], productoNombre: r[3],
      tipo: r[4], cantidad: r[5], stockAnterior: r[6], stockNuevo: r[7], motivo: r[8]
    }));

  if (params.productoId) movs = movs.filter(m => String(m.productoId) === params.productoId);
  if (params.tipo)       movs = movs.filter(m => m.tipo === params.tipo);

  movs.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  return { success: true, data: movs };
}

function saveMovimiento(data) {
  const prodSheet = getSheet(SHEET_PRODUCTOS);
  const movSheet  = getSheet(SHEET_MOVIMIENTOS);

  const prod = findRow(prodSheet, 0, data.productoId);
  if (!prod) return { success: false, error: 'Producto no encontrado' };

  const stockActual = parseInt(prod.row[4]);
  const cantidad    = parseInt(data.cantidad);
  let   nuevoStock;

  if      (data.tipo === 'entrada') nuevoStock = stockActual + cantidad;
  else if (data.tipo === 'salida')  nuevoStock = Math.max(0, stockActual - cantidad);
  else if (data.tipo === 'ajuste')  nuevoStock = cantidad; // valor absoluto
  else return { success: false, error: 'Tipo de movimiento inválido' };

  const id    = generateId('M');
  const fecha = data.fecha || hoy();

  movSheet.appendRow([
    id, fecha, data.productoId, prod.row[1],
    data.tipo, cantidad, stockActual, nuevoStock, data.motivo || ''
  ]);

  prodSheet.getRange(prod.index, 5).setValue(nuevoStock);

  return { success: true, data: { id, nuevoStock } };
}

// ── DASHBOARD ──

function getDashboard() {
  const fechaHoy   = hoy();
  const mesActual  = fechaHoy.substring(0, 7); // 'yyyy-MM'

  // Productos
  const prodData   = getSheet(SHEET_PRODUCTOS).getDataRange().getValues();
  const productos  = prodData.slice(1).filter(r => r[7] !== false && String(r[7]) !== 'FALSE' && r[0] !== '');
  const stockBajo  = productos.filter(r => parseInt(r[4]) <= parseInt(r[5] || 0));

  // Ventas
  const ventData   = getSheet(SHEET_VENTAS).getDataRange().getValues();
  const ventas     = ventData.slice(1).filter(r => r[0] !== '');

  const ventasHoyArr = ventas.filter(v => String(v[1]).substring(0,10) === fechaHoy);
  const ventasMesArr = ventas.filter(v => String(v[1]).substring(0,7) === mesActual);

  const totalHoy = ventasHoyArr.reduce((s, v) => s + parseFloat(v[7] || 0), 0);
  const totalMes = ventasMesArr.reduce((s, v) => s + parseFloat(v[7] || 0), 0);

  const ultimasVentas = ventas
    .sort((a, b) => String(b[1]).localeCompare(String(a[1])))
    .slice(0, 5)
    .map(v => ({ id: v[0], fecha: v[1], cliente: v[2], productoNombre: v[4], cantidad: v[5], total: v[7] }));

  const stockBajoList = stockBajo
    .map(p => ({ id: p[0], nombre: p[1], stock: p[4], stockMin: p[5] }));

  return {
    success: true,
    data: {
      ventasHoy:       { cantidad: ventasHoyArr.length, total: totalHoy },
      ventasMes:       { cantidad: ventasMesArr.length, total: totalMes },
      productosActivos: productos.length,
      stockBajo:       stockBajo.length,
      ultimasVentas,
      stockBajoList,
    }
  };
}

// ── SETUP: crear hojas si no existen ──
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const creadas = [];

  for (const [name, headers] of Object.entries(HEADERS)) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      creadas.push(name);
      Logger.log('✅ Hoja creada: ' + name);
    } else {
      Logger.log('ℹ️ Ya existe: ' + name);
    }
  }

  Logger.log('Hojas creadas: ' + (creadas.length ? creadas.join(', ') : 'ninguna nueva'));
  Logger.log('✅ Setup completo.');
}
