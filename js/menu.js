/* ============================================================
   KAIROS — menu.js (experiencia del cliente)
   ============================================================ */

(function () {
  let sesion = Kairos.sesion();
  let categoriaActiva = "todas";
  let vista = "menu";

  const $ = (id) => document.getElementById(id);

  /* ---------- Arranque ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    $("formMesa").addEventListener("submit", abrirMesa);
    $("inCodigo").addEventListener("input", (e) => (e.target.value = e.target.value.toUpperCase()));

    $("tabbar").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-vista]");
      if (!b) return;
      if (b.dataset.vista === "salir") return cerrarMesa();
      cambiarVista(b.dataset.vista);
    });

    Kairos.alCambiar(() => {
      if (vista === "pedidos") pintarPedidos();
      pintarBadge();
    });

    // Refresco suave para ver el avance de la cocina
    setInterval(() => {
      Kairos.recargar();
      if (vista === "pedidos") pintarPedidos();
      pintarBadge();
    }, 4000);

    if (sesion.mesa && Kairos.validarMesa(sesion.mesa, sesion.codigo).ok) {
      entrar();
    } else {
      mostrarGate();
    }
  });

  function mostrarGate() {
    $("vistaGate").classList.remove("hidden");
    $("tabbar").classList.add("hidden");
    ["vistaMenu", "vistaCarrito", "vistaPedidos"].forEach(v => $(v).classList.add("hidden"));
  }

  function abrirMesa(e) {
    e.preventDefault();
    const mesa = $("inMesa").value.trim();
    const codigo = $("inCodigo").value.trim();
    const r = Kairos.validarMesa(mesa, codigo);
    const err = $("gateError");
    if (!r.ok) {
      err.textContent = r.error;
      err.classList.remove("hidden");
      return;
    }
    err.classList.add("hidden");
    sesion.mesa = r.mesa.numero;
    sesion.codigo = r.mesa.codigo;
    Kairos.guardarSesion(sesion);
    entrar();
  }

  function cerrarMesa() {
    if (!confirm("¿Cerrar la mesa en este teléfono? Se borra el carrito; los pedidos ya enviados siguen en cocina.")) return;
    Kairos.cerrarSesionCliente();
    sesion = Kairos.sesion();
    location.reload();
  }

  function entrar() {
    $("vistaGate").classList.add("hidden");
    $("tabbar").classList.remove("hidden");
    const tag = $("mesaTag");
    tag.innerHTML = `Mesa <b>${esc(sesion.mesa)}</b> · ${esc(sesion.codigo)}`;
    tag.classList.remove("hidden");
    pintarCategorias();
    pintarPlatos();
    pintarBadge();
    cambiarVista("menu");
  }

  /* ---------- Navegación ---------- */
  function cambiarVista(v) {
    vista = v;
    $("vistaMenu").classList.toggle("hidden", v !== "menu");
    $("vistaCarrito").classList.toggle("hidden", v !== "carrito");
    $("vistaPedidos").classList.toggle("hidden", v !== "pedidos");
    document.querySelectorAll("#tabbar button").forEach(b =>
      b.setAttribute("aria-selected", String(b.dataset.vista === v)));
    if (v === "carrito") pintarCarrito();
    if (v === "pedidos") pintarPedidos();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  /* ---------- Catálogo ---------- */
  function pintarCategorias() {
    const cats = Kairos.db().categorias.slice().sort((a, b) => a.orden - b.orden);
    $("catbar").innerHTML =
      `<button class="catbtn" role="tab" data-cat="todas" aria-selected="true">Todo</button>` +
      cats.map(c => `<button class="catbtn" role="tab" data-cat="${c.id}" aria-selected="false">${esc(c.nombre)}</button>`).join("");

    $("catbar").addEventListener("click", (e) => {
      const b = e.target.closest(".catbtn");
      if (!b) return;
      categoriaActiva = b.dataset.cat;
      document.querySelectorAll(".catbtn").forEach(x => x.setAttribute("aria-selected", String(x === b)));
      pintarPlatos();
    });
  }

  function pintarPlatos() {
    const d = Kairos.db();
    const cats = d.categorias.slice().sort((a, b) => a.orden - b.orden)
      .filter(c => categoriaActiva === "todas" || c.id === categoriaActiva);

    const html = cats.map(c => {
      const prods = d.productos.filter(p => p.categoriaId === c.id);
      if (!prods.length) return "";
      return `<h2 class="grupo-titulo">${esc(c.nombre)}</h2>` + prods.map(tarjetaPlato).join("");
    }).join("");

    $("listaPlatos").innerHTML = html || `<div class="vacio"><strong>Todavía no hay platos aquí</strong>Pruebe otra categoría.</div>`;

    $("listaPlatos").querySelectorAll("button[data-add]").forEach(b => {
      b.onclick = () => agregar(b.dataset.add);
    });
  }

  function tarjetaPlato(p) {
    return `
      <article class="card dish ${p.disponible ? "" : "dish--agotado"}">
        <div class="dish__img">
          <img src="${esc(p.imagen || Kairos.IMAGEN_POR_DEFECTO)}" alt="${esc(p.nombre)}" loading="lazy">
          <span class="dish__flag chip ${p.disponible ? "chip--green" : "chip--red"}">${p.disponible ? "Disponible" : "Agotado"}</span>
        </div>
        <div class="dish__body">
          <div class="dish__top">
            <h3>${esc(p.nombre)}</h3>
            <span class="dish__price">${Kairos.dinero(p.precio)}</span>
          </div>
          <p>${esc(p.descripcion || "")}</p>
          <button class="btn btn--ghost" data-add="${p.id}" ${p.disponible ? "" : "disabled"}>
            ${p.disponible ? "+ Agregar al pedido" : "No disponible"}
          </button>
        </div>
      </article>`;
  }

  /* ---------- Carrito ---------- */
  function agregar(prodId) {
    const p = Kairos.db().productos.find(x => x.id === prodId);
    if (!p) return;
    const linea = sesion.carrito.find(l => l.productoId === p.id && !l.nota);
    if (linea) linea.cantidad++;
    else sesion.carrito.push({ productoId: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1, nota: "" });
    Kairos.guardarSesion(sesion);
    pintarBadge();
    aviso(p.nombre + " agregado.");
  }

  function pintarBadge() {
    const n = sesion.carrito.reduce((s, l) => s + l.cantidad, 0);
    const b = $("badgeCarrito");
    if (!b) return;
    b.textContent = n;
    b.classList.toggle("hidden", n === 0);
  }

  function pintarCarrito() {
    const cont = $("carritoContenido");
    if (!sesion.carrito.length) {
      cont.innerHTML = `<div class="vacio"><strong>El carrito está vacío</strong>Agregue algo del menú y aparecerá aquí.</div>`;
      return;
    }

    const bruto = sesion.carrito.reduce((s, l) => s + l.precio * l.cantidad, 0);
    const cfg = Kairos.db().config;
    const base = cfg.isvIncluido ? bruto / (1 + cfg.isv) : bruto;
    const isv = cfg.isvIncluido ? bruto - base : bruto * cfg.isv;
    const total = cfg.isvIncluido ? bruto : bruto + isv;

    cont.innerHTML = `
      <div class="card" style="padding:18px">
        ${sesion.carrito.map((l, i) => `
          <div class="linea">
            <div>
              <div class="linea__nombre">${esc(l.nombre)}</div>
              <div class="linea__nota">${Kairos.dinero(l.precio)} c/u${l.nota ? " · " + esc(l.nota) : ""}</div>
              <button class="btn btn--sm btn--ghost" style="margin-top:8px" data-nota="${i}">
                ${l.nota ? "Editar indicación" : "+ Indicación"}
              </button>
            </div>
            <div style="text-align:right">
              <div class="linea__precio">${Kairos.dinero(l.precio * l.cantidad)}</div>
              <div class="stepper" style="margin-top:8px">
                <button data-menos="${i}" aria-label="Quitar uno">−</button>
                <span>${l.cantidad}</span>
                <button data-mas="${i}" aria-label="Agregar uno">+</button>
              </div>
            </div>
          </div>`).join("")}

        <div class="totales">
          <div><span>Subtotal</span><span>${Kairos.dinero(base)}</span></div>
          <div><span>ISV 15%</span><span>${Kairos.dinero(isv)}</span></div>
          <div class="grande"><span>Total</span><span>${Kairos.dinero(total)}</span></div>
        </div>
      </div>

      <div class="field field--boxed" style="margin-top:20px">
        <label for="notaPedido">Indicaciones para la cocina</label>
        <textarea id="notaPedido" placeholder="Sin cebolla, término medio, todo junto…">${esc(sesion.nota || "")}</textarea>
      </div>

      <button class="btn btn--primary btn--block" id="btnEnviar">Enviar pedido a cocina</button>
      <p class="dim center" style="font-size:13px;margin:12px 0 28px">
        Se enviará a la mesa ${esc(sesion.mesa)}. El pago se hace en caja al final.
      </p>`;

    cont.querySelectorAll("[data-mas]").forEach(b => b.onclick = () => cambiarCantidad(+b.dataset.mas, 1));
    cont.querySelectorAll("[data-menos]").forEach(b => b.onclick = () => cambiarCantidad(+b.dataset.menos, -1));
    cont.querySelectorAll("[data-nota]").forEach(b => b.onclick = () => editarNota(+b.dataset.nota));
    $("notaPedido").addEventListener("input", (e) => {
      sesion.nota = e.target.value;
      Kairos.guardarSesion(sesion);
    });
    $("btnEnviar").onclick = enviarPedido;
  }

  function cambiarCantidad(i, delta) {
    const l = sesion.carrito[i];
    if (!l) return;
    l.cantidad += delta;
    if (l.cantidad <= 0) sesion.carrito.splice(i, 1);
    Kairos.guardarSesion(sesion);
    pintarCarrito();
    pintarBadge();
  }

  function editarNota(i) {
    const l = sesion.carrito[i];
    const texto = prompt("Indicación para este plato:", l.nota || "");
    if (texto === null) return;
    l.nota = texto.trim();
    Kairos.guardarSesion(sesion);
    pintarCarrito();
  }

  function enviarPedido() {
    if (!sesion.carrito.length) return;
    const r = Kairos.validarMesa(sesion.mesa, sesion.codigo);
    if (!r.ok) {
      aviso(r.error, "error");
      Kairos.cerrarSesionCliente();
      return location.reload();
    }

    const pedido = Kairos.crearPedido({
      mesa: sesion.mesa,
      codigo: sesion.codigo,
      items: sesion.carrito,
      nota: sesion.nota || "",
      token: sesion.token
    });

    sesion.carrito = [];
    sesion.nota = "";
    Kairos.guardarSesion(sesion);
    pintarBadge();
    cambiarVista("pedidos");
    aviso("Pedido #" + pedido.numero + " enviado a cocina.");
  }

  /* ---------- Pedidos en curso ---------- */
  function pintarPedidos() {
    const pedidos = Kairos.pedidosDelCliente(sesion.token);
    const cont = $("pedidosContenido");

    if (!pedidos.length) {
      cont.innerHTML = `<div class="vacio"><strong>No hay pedidos en curso</strong>Cuando la cocina termine su pedido, deja de aparecer aquí.</div>`;
      return;
    }

    cont.innerHTML = pedidos.map(p => {
      const t = Kairos.totalPedido(p);
      const e = Kairos.ESTADOS[p.estado];
      return `
        <article class="card ticket">
          <div class="ticket__head">
            <h3>Pedido #${p.numero} · ${Kairos.hora(p.creado)}</h3>
            <span class="chip chip--${e.color}">${e.etiqueta}</span>
          </div>
          <ul>
            ${p.items.map(i => `<li><b>${i.cantidad}× ${esc(i.nombre)}</b><span>${Kairos.dinero(i.precio * i.cantidad)}</span></li>`).join("")}
          </ul>
          ${p.nota ? `<p class="dim" style="font-size:13px;margin:10px 0 0">Indicaciones: ${esc(p.nota)}</p>` : ""}
          <div class="ticket__pie"><span>Total</span><span style="color:var(--green)">${Kairos.dinero(t.total)}</span></div>
        </article>`;
    }).join("") + `<p class="dim center" style="font-size:13px;margin:8px 0 28px">Se actualiza solo. Pague en caja cuando termine.</p>`;
  }
})();
