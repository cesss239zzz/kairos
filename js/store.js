/* ============================================================
   KAIROS — store.js
   Capa de datos compartida por el menú digital y el panel.
   Todo se guarda en localStorage bajo la llave kairos.db.v1
   ============================================================ */

const Kairos = (function () {
  const DB_KEY = "kairos.db.v1";
  const VERSION_DB = 2;
  const SESSION_KEY = "kairos.sesion.v1";
  const PIN_POR_DEFECTO = "2580";

  /* ---------- SHA-256 (implementación propia, funciona en file://) ---------- */
  function sha256(msg) {
    const K = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const bytes = new TextEncoder().encode(msg);
    const bitLen = bytes.length * 8;
    const padded = new Uint8Array((((bytes.length + 8) >> 6) + 1) * 64);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    new DataView(padded.buffer).setUint32(padded.length - 4, bitLen, false);

    const w = new Uint32Array(64);
    const view = new DataView(padded.buffer);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));

    for (let i = 0; i < padded.length; i += 64) {
      for (let t = 0; t < 16; t++) w[t] = view.getUint32(i + t * 4, false);
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(w[t-15],7) ^ rotr(w[t-15],18) ^ (w[t-15] >>> 3);
        const s1 = rotr(w[t-2],17) ^ rotr(w[t-2],19) ^ (w[t-2] >>> 10);
        w[t] = (w[t-16] + s0 + w[t-7] + s1) >>> 0;
      }
      let [a,b,c,d,e,f,g,h] = H;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        const S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H = H.map((v, i2) => (v + [a,b,c,d,e,f,g,h][i2]) >>> 0);
    }
    return H.map(v => v.toString(16).padStart(8, "0")).join("");
  }

  /* ---------- Utilidades ---------- */
  const uid = (p = "id") => p + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  const hoy = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const dinero = (n) => "L " + (Number(n) || 0).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const hora = (iso) => new Date(iso).toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" });
  const fechaLarga = (iso) => new Date(iso).toLocaleDateString("es-HN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  function codigoMesa(n) {
    // Código estable por mesa, derivado del hash. Se puede regenerar desde Ajustes.
    return sha256("kairos-mesa-" + n).slice(0, 4).toUpperCase();
  }

  /* ---------- Ilustraciones de la carta ----------
     Cada platillo recibe su dibujo según el nombre: se normaliza el texto y se
     busca la primera palabra clave que calce. Si el nombre no dice nada, se cae
     a la ilustración de la categoría y, en último caso, al plato genérico.
     Las láminas viven en assets/img/platos/ y las genera tools/generar-imagenes.py
     Una foto real subida desde el panel (data:image/...) siempre manda sobre esto. */
  const RUTA_ARTE = "assets/img/platos/";
  const IMAGEN_POR_DEFECTO = RUTA_ARTE + "plato-generico.svg";

  // El orden importa: lo más específico va primero.
  const ARTE_PLATO = [
    ["ceviche",             ["ceviche", "cebiche", "tiradito"]],
    ["alitas-ahumadas",     ["alita", "wing", "boneless"]],
    ["tabla-kairos",        ["tabla", "picada", "charcuter", "queso", "embutido", "jamon", "salami"]],
    ["camarones-al-ajillo", ["camaron", "gambas", "ajillo", "langostino", "marisco"]],
    ["filete-de-pescado",   ["pescado", "corvina", "tilapia", "robalo", "mojarra", "salmon", "atun"]],
    ["costilla-braseada",   ["costilla", "rib", "chuleta"]],
    ["lomo-de-res",         ["lomo", "res", "churrasco", "bistec", "steak", "corte", "ribeye", "asado", "carne"]],
    ["pollo-a-la-brasa",    ["pollo", "gallina", "pechuga"]],
    ["pasta-al-pesto",      ["pesto", "albahaca"]],
    ["fettuccine-alfredo",  ["fettuccine", "alfredo", "pasta", "spaghetti", "espagueti", "linguini", "lasa", "macarron", "ravioli"]],
    ["volcan-de-chocolate", ["chocolate", "volcan", "brownie", "lava"]],
    ["tres-leches",         ["tres leches", "pastel", "torta", "cheesecake", "flan", "postre", "helado", "bizcocho"]],
    ["limonada",            ["limonada", "naranjada", "jugo", "batido", "licuado", "horchata",
                             "te de", "te helado", "te verde", "fresco natural"]],
    ["michelada",           ["michelada", "chelada"]],
    ["cerveza",             ["cerveza", "birra", "lager", "porron", "barril"]],
    ["mojito",              ["mojito", "daiquiri", "caipirinha", "menta"]],
    ["old-fashioned",       ["old fashioned", "whisky", "whiskey", "negroni", "manhattan", "ron", "coctel", "trago", "licor"]],
    ["vino",                ["vino", "tinto", "sangria", "copa de"]],
    ["cafe",                ["cafe", "capuchino", "espresso", "americano", "latte", "moca"]],
    ["ensalada",            ["ensalada", "cesar", "aguacate", "guacamole"]],
    ["gaseosa-agua",        ["gaseosa", "agua", "soda", "refresco", "botella", "cola"]],
    ["hamburguesa",         ["hamburgues", "burger", "sandwich", "emparedado", "club"]],
    ["tacos",               ["taco", "burrito", "quesadilla", "baleada", "tortilla", "enchilada"]],
    ["pizza",               ["pizza", "calzone"]],
    ["sopa",                ["sopa", "caldo", "crema de", "consome", "chuleton"]]
  ];

  // Respaldo por categoría cuando el nombre del plato no dice nada.
  const ARTE_CATEGORIA = [
    ["camarones-al-ajillo", ["mar", "marisco", "pescad"]],
    ["tabla-kairos",        ["entrada", "picada", "boca", "aperitivo", "para compartir"]],
    ["lomo-de-res",         ["parrilla", "carne", "asado", "plato fuerte"]],
    ["fettuccine-alfredo",  ["pasta"]],
    ["volcan-de-chocolate", ["postre", "dulce"]],
    ["mojito",              ["coctel", "bar", "trago", "licor"]],
    ["cerveza",             ["cerveza"]],
    ["limonada",            ["bebida", "refresco", "jugo", "sin alcohol"]],
    ["pizza",               ["pizza"]],
    ["hamburguesa",         ["hamburgues", "sandwich", "burger"]],
    ["ensalada",            ["ensalada", "saludable"]],
    ["sopa",                ["sopa", "caldo"]]
  ];

  const normalizar = (t) => String(t || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  /* Las claves calzan desde el principio de una palabra, no en cualquier parte:
     así "res" reconoce «Lomo de res» pero no «postres», «fresa» ni «espresso»,
     y una raíz como "hamburgues" sigue tomando «hamburguesas». */
  const escaparRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const compilarArte = (tabla) => tabla.map(([archivo, claves]) => [
    RUTA_ARTE + archivo + ".svg",
    new RegExp("\\b(" + claves.map(escaparRegex).join("|") + ")")
  ]);

  const RE_PLATO = compilarArte(ARTE_PLATO);
  const RE_CATEGORIA = compilarArte(ARTE_CATEGORIA);

  function buscarArte(texto, tabla) {
    const t = normalizar(texto);
    if (!t) return null;
    for (const [ruta, re] of tabla) if (re.test(t)) return ruta;
    return null;
  }

  /** Ilustración que le toca a un platillo por su nombre (y, si no, por su categoría). */
  function imagenPara(nombre, categoriaNombre) {
    return buscarArte(nombre, RE_PLATO) ||
           buscarArte(categoriaNombre, RE_CATEGORIA) ||
           IMAGEN_POR_DEFECTO;
  }

  /** ¿La imagen es una lámina de relleno que podemos reemplazar sin perder nada? */
  function imagenDeRelleno(src) {
    return !src || /^assets\/img\/plato-\d+\.svg$/.test(src) || src === IMAGEN_POR_DEFECTO;
  }

  /** ¿Es una de nuestras ilustraciones (y no una foto subida desde el panel)? */
  function esIlustracion(src) {
    return !src || src.indexOf(RUTA_ARTE) === 0 || /^assets\/img\/plato-\d+\.svg$/.test(src);
  }

  /* ---------- Semilla ---------- */
  function semilla() {
    const cat = (id, nombre, orden) => ({ id, nombre, orden, imagen: imagenPara(nombre, nombre) });

    const categorias = [
      cat("cat-entradas", "Entradas", 1),
      cat("cat-parrilla", "Parrilla", 2),
      cat("cat-mar",      "Del mar",  3),
      cat("cat-pastas",   "Pastas",   4),
      cat("cat-postres",  "Postres",  5),
      cat("cat-bebidas",  "Bebidas",  6),
      cat("cat-cocteles", "Cócteles", 7)
    ];

    const nombreCat = (id) => (categorias.find(c => c.id === id) || {}).nombre;

    // La ilustración sale del nombre del platillo; no hay que elegirla a mano.
    const p = (nombre, categoriaId, precio, descripcion, imagen) =>
      ({ id: uid("prod"), nombre, categoriaId, precio, descripcion,
         imagen: imagen || imagenPara(nombre, nombreCat(categoriaId)), disponible: true });

    const productos = [
      p("Tabla Kairos", "cat-entradas", 285, "Quesos madurados, embutidos artesanales, encurtidos de la casa y pan de masa madre."),
      p("Ceviche de la casa", "cat-entradas", 210, "Corvina fresca, leche de tigre, camote asado y chile dulce."),
      p("Alitas ahumadas", "cat-entradas", 175, "Ocho piezas glaseadas en tamarindo y chile chipotle."),
      p("Lomo de res 10 oz", "cat-parrilla", 480, "Corte a la parrilla de leña, mantequilla de hierbas y papa rústica."),
      p("Costilla braseada", "cat-parrilla", 395, "Seis horas de cocción lenta, puré de yuca y jugo de cocción."),
      p("Pollo a la brasa", "cat-parrilla", 245, "Medio pollo marinado en cítricos, ensalada tibia y tortillas."),
      p("Camarones al ajillo", "cat-mar", 320, "Camarón jumbo, ajo confitado, vino blanco y pan tostado."),
      p("Filete de pescado", "cat-mar", 290, "Pescado del día a la plancha, arroz cremoso y vegetales grillados."),
      p("Pasta al pesto", "cat-pastas", 225, "Linguini fresco, pesto de albahaca, tomate confitado y parmesano."),
      p("Fettuccine Alfredo", "cat-pastas", 240, "Crema, mantequilla y parmesano. Agregue pollo o camarón."),
      p("Volcán de chocolate", "cat-postres", 145, "Centro líquido de chocolate 70% con helado de vainilla."),
      p("Tres leches Kairos", "cat-postres", 130, "Bizcocho esponjoso, dulce de leche y frutos rojos."),
      p("Limonada con hierbabuena", "cat-bebidas", 65, "Limón natural, hierbabuena fresca y hielo frappé."),
      p("Café de Santa Bárbara", "cat-bebidas", 55, "Grano local tostado medio, preparado en prensa francesa."),
      p("Gaseosa / agua", "cat-bebidas", 40, "Botella de 500 ml."),
      p("Mojito de la casa", "cat-cocteles", 155, "Ron blanco, hierbabuena, limón y soda artesanal."),
      p("Old Fashioned", "cat-cocteles", 185, "Whisky, azúcar mascabado, bitter y cáscara de naranja."),
      p("Michelada Kairos", "cat-cocteles", 120, "Cerveza nacional, mezcla de la casa y escarchado de tajín.")
    ];

    const mesas = [];
    for (let i = 1; i <= 14; i++) mesas.push({ numero: String(i), codigo: codigoMesa(i), activa: true });

    return {
      version: VERSION_DB,
      config: {
        nombre: "Kairos",
        eslogan: "Cocina de autor y coctelería nocturna",
        direccion: "Barrio El Centro, La Entrada, Copán, Honduras",
        telefono: "+504 0000-0000",
        correo: "hola@kairos.hn",
        horario: "Martes a domingo · 12:00 – 23:00",
        isv: 0.15,
        isvIncluido: true,
        moneda: "L",
        serieEntrega: "KRS-E",
        correlativoEntrega: 1,
        correlativoPedido: 1,
        fechaCorrelativo: hoy(),
        pinHash: sha256(PIN_POR_DEFECTO),
        redes: {
          instagram: "https://instagram.com/",
          facebook: "https://facebook.com/",
          whatsapp: "https://wa.me/504",
          tiktok: "https://tiktok.com/"
        }
      },
      categorias,
      productos,
      mesas,
      pedidos: [],
      arqueos: []
    };
  }

  /* ---------- Lectura / escritura ---------- */
  let cache = null;

  function db() {
    if (cache) return cache;
    let raw = null;
    try { raw = localStorage.getItem(DB_KEY); } catch (e) { raw = null; }
    if (raw) {
      try { cache = JSON.parse(raw); } catch (e) { cache = semilla(); }
      if (migrar(cache)) guardar();
    } else {
      cache = semilla();
      guardar();
    }
    return cache;
  }

  /* Pone al día una base guardada de antes. Devuelve true si hubo cambios.
     v2: las láminas de relleno pasan a las ilustraciones por nombre de platillo.
     Las fotos subidas desde el panel (data:image/...) no se tocan. */
  function migrar(d) {
    if (!d || (d.version || 1) >= VERSION_DB) return false;
    const cats = d.categorias || [];
    cats.forEach(c => {
      if (imagenDeRelleno(c.imagen)) c.imagen = imagenPara(c.nombre, c.nombre);
    });
    (d.productos || []).forEach(p => {
      if (!imagenDeRelleno(p.imagen)) return;
      const cat = cats.find(c => c.id === p.categoriaId);
      p.imagen = imagenPara(p.nombre, cat && cat.nombre);
    });
    d.version = VERSION_DB;
    return true;
  }

  function guardar() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn("No se pudo guardar en localStorage:", e);
    }
    window.dispatchEvent(new CustomEvent("kairos:cambio"));
  }

  function recargar() {
    cache = null;
    return db();
  }

  // Sincroniza entre pestañas (cliente en el teléfono / panel en la caja)
  window.addEventListener("storage", (e) => {
    if (e.key === DB_KEY) {
      cache = null;
      window.dispatchEvent(new CustomEvent("kairos:cambio", { detail: { externo: true } }));
    }
  });

  function alCambiar(fn) {
    window.addEventListener("kairos:cambio", fn);
  }

  function reiniciar() {
    cache = semilla();
    guardar();
  }

  /* ---------- Correlativos ---------- */
  function siguientePedido() {
    const d = db();
    if (d.config.fechaCorrelativo !== hoy()) {
      d.config.fechaCorrelativo = hoy();
      d.config.correlativoPedido = 1;
    }
    return d.config.correlativoPedido++;
  }
  function siguienteEntrega() {
    const d = db();
    return d.config.serieEntrega + "-" + String(d.config.correlativoEntrega++).padStart(5, "0");
  }

  /* ---------- Sesión del cliente ---------- */
  function sesion() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    const nueva = { token: uid("cli"), mesa: null, codigo: null, carrito: [] };
    localStorage.setItem(SESSION_KEY, JSON.stringify(nueva));
    return nueva;
  }
  function guardarSesion(s) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  }
  function cerrarSesionCliente() {
    localStorage.removeItem(SESSION_KEY);
  }

  /* ---------- Mesas ---------- */
  function validarMesa(numero, codigo) {
    const m = db().mesas.find(x => x.numero === String(numero).trim());
    if (!m) return { ok: false, error: "Esa mesa no existe. Revise el número impreso en el letrero." };
    if (!m.activa) return { ok: false, error: "Esa mesa está fuera de servicio. Pida apoyo al mesero." };
    if (m.codigo.toUpperCase() !== String(codigo || "").trim().toUpperCase())
      return { ok: false, error: "El código no coincide con la mesa. Está impreso junto al número." };
    return { ok: true, mesa: m };
  }

  /* ---------- Pedidos ---------- */
  const ESTADOS = {
    pendiente: { etiqueta: "Pendiente", color: "orange" },
    en_preparacion: { etiqueta: "En preparación", color: "orange" },
    preparado: { etiqueta: "Preparado", color: "green" },
    pagado: { etiqueta: "Pagado", color: "outline" },
    anulado: { etiqueta: "Anulado", color: "red" }
  };

  function crearPedido({ mesa, codigo, items, nota, token }) {
    const d = db();
    const pedido = {
      id: uid("ped"),
      numero: siguientePedido(),
      mesa: String(mesa),
      codigo: String(codigo).toUpperCase(),
      clienteToken: token,
      items: items.map(i => ({ ...i })),
      nota: nota || "",
      estado: "pendiente",
      creado: new Date().toISOString(),
      actualizado: new Date().toISOString(),
      historial: [{ estado: "pendiente", en: new Date().toISOString(), por: "cliente" }],
      pago: null
    };
    d.pedidos.unshift(pedido);
    guardar();
    return pedido;
  }

  function actualizarPedido(id, cambios, quien = "admin") {
    const d = db();
    const p = d.pedidos.find(x => x.id === id);
    if (!p) return null;
    Object.assign(p, cambios, { actualizado: new Date().toISOString() });
    if (cambios.estado) p.historial.push({ estado: cambios.estado, en: new Date().toISOString(), por: quien });
    guardar();
    return p;
  }

  function totalPedido(p) {
    const bruto = p.items.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const cfg = db().config;
    let base, isv, total;
    if (cfg.isvIncluido) {
      total = bruto;
      base = bruto / (1 + cfg.isv);
      isv = total - base;
    } else {
      base = bruto;
      isv = bruto * cfg.isv;
      total = base + isv;
    }
    return {
      base: redondear(base),
      isv: redondear(isv),
      total: redondear(total),
      propina: redondear(p.pago?.propina || 0),
      cobrado: redondear(total + (p.pago?.propina || 0))
    };
  }
  const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

  function cobrarPedido(id, { metodo, recibido, referencia, propina, desglose }) {
    const d = db();
    const p = d.pedidos.find(x => x.id === id);
    if (!p) return null;
    const t = totalPedido({ ...p, pago: { propina } });
    p.pago = {
      metodo,
      propina: redondear(propina || 0),
      total: t.total,
      cobrado: t.cobrado,
      recibido: redondear(recibido || t.cobrado),
      cambio: metodo === "efectivo" ? redondear((recibido || 0) - t.cobrado) : 0,
      referencia: referencia || "",
      desglose: desglose || null,
      documento: siguienteEntrega(),
      fecha: new Date().toISOString()
    };
    p.estado = "pagado";
    p.historial.push({ estado: "pagado", en: p.pago.fecha, por: "caja" });
    p.actualizado = p.pago.fecha;
    guardar();
    return p;
  }

  /* ---------- Consultas ---------- */
  function pedidosDelCliente(token) {
    // El cliente solo ve lo que sigue en curso: pendiente o en preparación.
    return db().pedidos.filter(p => p.clienteToken === token && ["pendiente", "en_preparacion"].includes(p.estado));
  }

  function pedidosDelDia(fecha = hoy()) {
    return db().pedidos.filter(p => (p.creado || "").slice(0, 10) === fecha);
  }

  function ventasDelDia(fecha = hoy()) {
    const pagados = db().pedidos.filter(p => p.estado === "pagado" && (p.pago?.fecha || "").slice(0, 10) === fecha);
    return resumirVentas(pagados);
  }

  function ventasEntre(desde, hasta) {
    const pagados = db().pedidos.filter(p => {
      const f = (p.pago?.fecha || "").slice(0, 10);
      return p.estado === "pagado" && f >= desde && f <= hasta;
    });
    return resumirVentas(pagados);
  }

  function resumirVentas(pagados) {
    const porMetodo = { efectivo: 0, tarjeta: 0, transferencia: 0 };
    let total = 0, isv = 0, base = 0, propinas = 0;
    // El total incluye propinas: es el dinero que realmente entró y es lo que
    // se compara contra el conteo físico en el arqueo.
    pagados.forEach(p => {
      const t = totalPedido(p);
      total += t.cobrado;
      base += t.base;
      isv += t.isv;
      propinas += t.propina;
      if (porMetodo[p.pago.metodo] !== undefined) porMetodo[p.pago.metodo] += t.cobrado;
    });
    return {
      pedidos: pagados,
      cantidad: pagados.length,
      total: redondear(total),
      base: redondear(base),
      isv: redondear(isv),
      propinas: redondear(propinas),
      ticket: pagados.length ? redondear(total / pagados.length) : 0,
      porMetodo: {
        efectivo: redondear(porMetodo.efectivo),
        tarjeta: redondear(porMetodo.tarjeta),
        transferencia: redondear(porMetodo.transferencia)
      }
    };
  }

  function semanaActual(ref = new Date()) {
    const d = new Date(ref);
    const dow = (d.getDay() + 6) % 7; // lunes = 0
    const lunes = new Date(d); lunes.setDate(d.getDate() - dow);
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
    return { desde: hoy(lunes), hasta: hoy(domingo) };
  }

  function masVendidos(pagados, limite = 5) {
    const mapa = {};
    pagados.forEach(p => p.items.forEach(i => {
      mapa[i.nombre] = mapa[i.nombre] || { nombre: i.nombre, cantidad: 0, monto: 0 };
      mapa[i.nombre].cantidad += i.cantidad;
      mapa[i.nombre].monto += i.cantidad * i.precio;
    }));
    return Object.values(mapa).sort((a, b) => b.cantidad - a.cantidad).slice(0, limite);
  }

  /* ---------- Productos y categorías ---------- */
  function guardarProducto(prod) {
    const d = db();
    if (prod.id) {
      const i = d.productos.findIndex(p => p.id === prod.id);
      if (i >= 0) d.productos[i] = { ...d.productos[i], ...prod };
    } else {
      d.productos.push({ ...prod, id: uid("prod") });
    }
    guardar();
  }
  function borrarProducto(id) {
    const d = db();
    d.productos = d.productos.filter(p => p.id !== id);
    guardar();
  }
  function guardarCategoria(cat) {
    const d = db();
    if (cat.id) {
      const i = d.categorias.findIndex(c => c.id === cat.id);
      if (i >= 0) d.categorias[i] = { ...d.categorias[i], ...cat };
    } else {
      d.categorias.push({ ...cat, id: uid("cat"), orden: d.categorias.length + 1 });
    }
    guardar();
  }
  function borrarCategoria(id) {
    const d = db();
    d.categorias = d.categorias.filter(c => c.id !== id);
    d.productos = d.productos.filter(p => p.categoriaId !== id);
    guardar();
  }

  /* ---------- Arqueo ---------- */
  function guardarArqueo(a) {
    const d = db();
    d.arqueos.unshift({ ...a, id: uid("arq"), creado: new Date().toISOString() });
    guardar();
  }

  /* ---------- Acceso admin ---------- */
  function verificarPin(pin) {
    return sha256(String(pin)) === db().config.pinHash;
  }
  function cambiarPin(nuevo) {
    db().config.pinHash = sha256(String(nuevo));
    guardar();
  }
  const SESION_ADMIN = "kairos.admin.abierta";
  function abrirSesionAdmin() { try { sessionStorage.setItem(SESION_ADMIN, "1"); } catch (e) {} }
  function haySesionAdmin() { try { return sessionStorage.getItem(SESION_ADMIN) === "1"; } catch (e) { return false; } }
  function cerrarSesionAdmin() { try { sessionStorage.removeItem(SESION_ADMIN); } catch (e) {} }

  /* ---------- API pública ---------- */
  return {
    // datos
    db, guardar, recargar, reiniciar, alCambiar, semilla,
    // utilidades
    sha256, uid, hoy, dinero, hora, fechaLarga, redondear, codigoMesa,
    // sesión cliente
    sesion, guardarSesion, cerrarSesionCliente,
    // mesas
    validarMesa,
    // pedidos
    ESTADOS, crearPedido, actualizarPedido, totalPedido, cobrarPedido,
    pedidosDelCliente, pedidosDelDia,
    // ventas
    ventasDelDia, ventasEntre, resumirVentas, semanaActual, masVendidos,
    // catálogo
    guardarProducto, borrarProducto, guardarCategoria, borrarCategoria,
    imagenPara, esIlustracion, IMAGEN_POR_DEFECTO,
    // arqueo
    guardarArqueo,
    // admin
    verificarPin, cambiarPin, abrirSesionAdmin, haySesionAdmin, cerrarSesionAdmin,
    PIN_POR_DEFECTO
  };
})();

/* ---------- Avisos flotantes reutilizables ---------- */
function aviso(texto, tipo = "ok") {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const t = document.createElement("div");
  t.className = "toast" + (tipo === "warn" ? " toast--warn" : tipo === "error" ? " toast--error" : "");
  t.textContent = texto;
  stack.appendChild(t);
  setTimeout(() => t.remove(), 3600);
}

/* ---------- Escape básico para inyectar texto en HTML ---------- */
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
