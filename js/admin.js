/* ============================================================
   KAIROS — admin.js (panel de administración)
   ============================================================ */

(function () {
  const $ = (id) => document.getElementById(id);
  const SECCIONES = ["pedidos", "caja", "ventas", "productos", "reportes", "ajustes"];
  const DENOMINACIONES = [500, 200, 100, 50, 20, 10, 5, 2, 1];

  let seccion = "pedidos";
  let filtroPedidos = "activos";
  let pedidoEnCaja = null;
  let metodoPago = "efectivo";

  /* ============================================================
     Arranque y control de acceso
     ============================================================ */
  document.addEventListener("DOMContentLoaded", () => {
    if (!Kairos.haySesionAdmin()) {
      const pin = prompt("PIN del personal para abrir el panel:");
      if (pin === null || !Kairos.verificarPin(pin)) {
        alert("PIN incorrecto.");
        window.location.href = "index.html";
        return;
      }
      Kairos.abrirSesionAdmin();
    }

    $("nav").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-sec]");
      if (b) irA(b.dataset.sec);
    });

    $("btnSalir").onclick = () => {
      Kairos.cerrarSesionAdmin();
      window.location.href = "index.html";
    };

    $("fActivos").onclick = () => { filtroPedidos = "activos"; marcarFiltro(); pintarPedidos(); };
    $("fTodos").onclick = () => { filtroPedidos = "todos"; marcarFiltro(); pintarPedidos(); };

    $("btnNuevoProd").onclick = () => editorProducto(null);
    $("btnNuevaCat").onclick = () => editorCategoria(null);

    $("fechaReporte").value = Kairos.hoy();
    $("fechaReporte").onchange = pintarReportes;
    $("btnImprimirArqueo").onclick = imprimirArqueo;
    $("btnGuardarArqueo").onclick = guardarArqueo;

    $("btnAgregarMesa").onclick = agregarMesa;
    $("btnImprimirMesas").onclick = imprimirMesas;
    $("btnGuardarCfg").onclick = guardarConfig;
    $("btnCambiarPin").onclick = cambiarPin;
    $("btnReiniciar").onclick = reiniciar;

    construirDenominaciones();
    irA("pedidos");

    Kairos.alCambiar(() => refrescar());
    setInterval(() => { Kairos.recargar(); refrescar(); }, 5000);
  });

  function irA(sec) {
    seccion = sec;
    SECCIONES.forEach(s => {
      const el = $("sec" + s.charAt(0).toUpperCase() + s.slice(1));
      if (el) el.classList.toggle("hidden", s !== sec);
    });
    document.querySelectorAll("#nav button").forEach(b =>
      b.setAttribute("aria-current", String(b.dataset.sec === sec)));
    refrescar();
    window.scrollTo(0, 0);
  }

  function refrescar() {
    if (seccion === "pedidos") pintarPedidos();
    if (seccion === "caja") pintarCaja();
    if (seccion === "ventas") pintarVentas();
    if (seccion === "productos") pintarProductos();
    if (seccion === "reportes") pintarReportes();
    if (seccion === "ajustes") pintarAjustes();
  }

  function marcarFiltro() {
    $("fActivos").setAttribute("aria-pressed", String(filtroPedidos === "activos"));
    $("fTodos").setAttribute("aria-pressed", String(filtroPedidos === "todos"));
  }

  /* ============================================================
     PEDIDOS
     ============================================================ */
  function pintarPedidos() {
    const delDia = Kairos.pedidosDelDia();
    const activos = delDia.filter(p => ["pendiente", "en_preparacion", "preparado"].includes(p.estado));
    const lista = filtroPedidos === "activos" ? activos : delDia;

    $("pedidosResumen").textContent =
      `${activos.filter(p => p.estado === "pendiente").length} pendientes · ` +
      `${activos.filter(p => p.estado === "en_preparacion").length} en preparación · ` +
      `${activos.filter(p => p.estado === "preparado").length} listos para entregar`;

    if (!lista.length) {
      $("listaComandas").innerHTML =
        `<div class="card" style="padding:40px;text-align:center;color:var(--text-mute)">
           <strong style="display:block;color:var(--text);font-family:Montserrat,sans-serif;font-size:18px;margin-bottom:6px">Sin pedidos por ahora</strong>
           Los pedidos que envíen las mesas aparecen aquí en segundos.
         </div>`;
      return;
    }

    $("listaComandas").innerHTML = lista.map(comanda).join("");

    $("listaComandas").querySelectorAll("[data-accion]").forEach(b => {
      b.onclick = () => accionPedido(b.dataset.id, b.dataset.accion);
    });
  }

  function comanda(p) {
    const t = Kairos.totalPedido(p);
    const e = Kairos.ESTADOS[p.estado];
    const acciones = [];
    if (p.estado === "pendiente") acciones.push(["preparando", "Marcar en preparación", "btn--ghost"]);
    if (["pendiente", "en_preparacion"].includes(p.estado)) acciones.push(["preparado", "Marcar preparado", "btn--green"]);
    if (p.estado === "preparado") acciones.push(["cobrar", "Ir a caja", "btn--primary"]);
    if (p.estado !== "pagado") acciones.push(["editar", "Editar", "btn--ghost"]);
    if (p.estado !== "pagado" && p.estado !== "anulado") acciones.push(["anular", "Anular", "btn--danger"]);

    return `
      <article class="card comanda comanda--${p.estado}">
        <div class="comanda__barra"></div>
        <div class="comanda__cuerpo">
          <div class="comanda__top">
            <h3>Mesa ${esc(p.mesa)}</h3>
            <span class="chip chip--${e.color}">${e.etiqueta}</span>
          </div>
          <p class="comanda__meta">Pedido #${p.numero} · ${Kairos.hora(p.creado)} · ${espera(p)}</p>
          <ul>
            ${p.items.map(i => `<li><span>${i.cantidad}× ${esc(i.nombre)}${i.nota ? ` <em class="dim">(${esc(i.nota)})</em>` : ""}</span><span>${Kairos.dinero(i.precio * i.cantidad)}</span></li>`).join("")}
          </ul>
          ${p.nota ? `<div class="comanda__nota">${esc(p.nota)}</div>` : ""}
          <div style="display:flex;justify-content:space-between;font-size:14px">
            <span class="dim">Total</span><span class="comanda__total">${Kairos.dinero(t.total)}</span>
          </div>
          <div class="comanda__acciones">
            ${acciones.map(([a, txt, cls]) => `<button class="btn btn--sm ${cls}" data-accion="${a}" data-id="${p.id}">${txt}</button>`).join("")}
          </div>
        </div>
      </article>`;
  }

  function espera(p) {
    const min = Math.floor((Date.now() - new Date(p.creado)) / 60000);
    return min < 1 ? "recién entrado" : min + " min de espera";
  }

  function accionPedido(id, accion) {
    if (accion === "preparando") Kairos.actualizarPedido(id, { estado: "en_preparacion" });
    if (accion === "preparado") {
      Kairos.actualizarPedido(id, { estado: "preparado" });
      aviso("Pedido marcado como preparado. Ya no aparece en el teléfono del cliente.");
    }
    if (accion === "anular") {
      if (!confirm("¿Anular este pedido? Deja de contar para ventas.")) return;
      Kairos.actualizarPedido(id, { estado: "anulado" });
    }
    if (accion === "editar") editorPedido(id);
    if (accion === "cobrar") { pedidoEnCaja = id; irA("caja"); }
    pintarPedidos();
  }

  /* ---------- Editor de pedido (solo panel) ---------- */
  function editorPedido(id) {
    const p = Kairos.db().pedidos.find(x => x.id === id);
    if (!p) return;
    const productos = Kairos.db().productos;
    let items = p.items.map(i => ({ ...i }));

    const back = document.createElement("div");
    back.className = "modal-backdrop";
    document.body.appendChild(back);

    function dibujar() {
      const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
      back.innerHTML = `
        <div class="modal">
          <h3>Editar pedido #${p.numero}</h3>
          <p class="dim" style="font-size:14px;margin:4px 0 20px">Mesa ${esc(p.mesa)} · el cliente no puede modificar lo que ya envió.</p>
          <div id="edLineas">
            ${items.length ? items.map((i, idx) => `
              <div class="linea" style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)">
                <div>
                  <div>${esc(i.nombre)}</div>
                  <small class="dim">${Kairos.dinero(i.precio)} c/u</small>
                </div>
                <div class="stepper">
                  <button data-m="${idx}">−</button><span>${i.cantidad}</span><button data-p="${idx}">+</button>
                </div>
              </div>`).join("") : `<p class="dim">El pedido quedó sin líneas.</p>`}
          </div>
          <div style="display:flex;justify-content:space-between;margin:16px 0;font-weight:700">
            <span>Total</span><span style="color:var(--green)">${Kairos.dinero(total)}</span>
          </div>
          <div class="field field--boxed">
            <label for="edAgregar">Agregar producto</label>
            <select id="edAgregar">
              <option value="">Seleccione…</option>
              ${productos.map(pr => `<option value="${pr.id}">${esc(pr.nombre)} — ${Kairos.dinero(pr.precio)}</option>`).join("")}
            </select>
          </div>
          <div class="field field--boxed">
            <label for="edNota">Indicaciones</label>
            <textarea id="edNota">${esc(p.nota || "")}</textarea>
          </div>
          <div class="modal-actions">
            <button class="btn btn--ghost btn--sm" id="edCancelar">Cancelar</button>
            <button class="btn btn--primary btn--sm" id="edGuardar">Guardar cambios</button>
          </div>
        </div>`;

      back.querySelectorAll("[data-m]").forEach(b => b.onclick = () => {
        const i = +b.dataset.m;
        items[i].cantidad--;
        if (items[i].cantidad <= 0) items.splice(i, 1);
        dibujar();
      });
      back.querySelectorAll("[data-p]").forEach(b => b.onclick = () => {
        items[+b.dataset.p].cantidad++;
        dibujar();
      });
      back.querySelector("#edAgregar").onchange = (e) => {
        const pr = productos.find(x => x.id === e.target.value);
        if (!pr) return;
        const l = items.find(x => x.productoId === pr.id && !x.nota);
        if (l) l.cantidad++;
        else items.push({ productoId: pr.id, nombre: pr.nombre, precio: pr.precio, cantidad: 1, nota: "" });
        dibujar();
      };
      back.querySelector("#edCancelar").onclick = () => back.remove();
      back.querySelector("#edGuardar").onclick = () => {
        Kairos.actualizarPedido(p.id, { items, nota: back.querySelector("#edNota").value });
        back.remove();
        aviso("Pedido actualizado.");
        refrescar();
      };
    }
    dibujar();
    back.addEventListener("click", (e) => { if (e.target === back) back.remove(); });
  }

  /* ============================================================
     CAJA
     ============================================================ */
  function pintarCaja() {
    const porCobrar = Kairos.db().pedidos.filter(p => ["pendiente", "en_preparacion", "preparado"].includes(p.estado));

    $("cajaLista").innerHTML = porCobrar.length
      ? porCobrar.map(p => {
          const t = Kairos.totalPedido(p);
          return `<button class="caja__item" data-id="${p.id}" aria-current="${p.id === pedidoEnCaja}">
                    <span><b>Mesa ${esc(p.mesa)}</b><small>Pedido #${p.numero} · ${Kairos.ESTADOS[p.estado].etiqueta}</small></span>
                    <span style="color:var(--green);font-weight:700">${Kairos.dinero(t.total)}</span>
                  </button>`;
        }).join("")
      : `<p class="dim" style="padding:24px;text-align:center">No hay pedidos por cobrar.</p>`;

    $("cajaLista").querySelectorAll(".caja__item").forEach(b => {
      b.onclick = () => { pedidoEnCaja = b.dataset.id; pintarCaja(); };
    });

    const p = Kairos.db().pedidos.find(x => x.id === pedidoEnCaja);
    if (!p || p.estado === "pagado") {
      $("cajaPanel").innerHTML = `
        <div style="text-align:center;padding:48px 12px;color:var(--text-mute)">
          <strong style="display:block;color:var(--text);font-family:Montserrat,sans-serif;font-size:18px;margin-bottom:6px">Seleccione un pedido</strong>
          Al elegirlo verá el detalle y el total a cobrar.
        </div>`;
      return;
    }

    const t = Kairos.totalPedido(p);
    $("cajaPanel").innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:4px">
        <h3 style="font-size:22px;font-weight:600">Mesa ${esc(p.mesa)}</h3>
        <span class="chip chip--outline">Pedido #${p.numero}</span>
      </div>
      <p class="dim" style="font-size:14px;margin:0 0 20px">Abierto a las ${Kairos.hora(p.creado)}</p>

      <div class="tabla-wrap">
        <table class="tabla">
          <tbody>
            ${p.items.map(i => `<tr><td>${i.cantidad}× ${esc(i.nombre)}</td><td class="num">${Kairos.dinero(i.precio * i.cantidad)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>

      <div class="totales" style="margin-top:8px">
        <div><span>Subtotal gravado</span><span>${Kairos.dinero(t.base)}</span></div>
        <div><span>ISV 15%</span><span>${Kairos.dinero(t.isv)}</span></div>
        <div class="grande"><span>Total</span><span>${Kairos.dinero(t.total)}</span></div>
      </div>

      <p class="eyebrow" style="margin:24px 0 0">Forma de pago</p>
      <div class="metodos" id="metodos">
        <button class="metodo" data-metodo="efectivo" aria-pressed="${metodoPago === "efectivo"}">Efectivo</button>
        <button class="metodo" data-metodo="tarjeta" aria-pressed="${metodoPago === "tarjeta"}">Tarjeta</button>
        <button class="metodo" data-metodo="transferencia" aria-pressed="${metodoPago === "transferencia"}">Transferencia</button>
      </div>

      <div class="field-row">
        <div class="field field--boxed">
          <label for="cjPropina">Propina (opcional)</label>
          <input id="cjPropina" type="number" step="0.01" value="0">
        </div>
        <div class="field field--boxed" id="wrapRecibido">
          <label for="cjRecibido">Recibe</label>
          <input id="cjRecibido" type="number" step="0.01" value="${t.total.toFixed(2)}">
        </div>
      </div>
      <div class="field field--boxed ${metodoPago === "efectivo" ? "hidden" : ""}" id="wrapRef">
        <label for="cjRef">Referencia / autorización</label>
        <input id="cjRef" placeholder="Últimos 4 dígitos, número de transferencia…">
      </div>

      <div class="totales">
        <div class="grande"><span>A cobrar</span><span id="cjCobrar">${Kairos.dinero(t.total)}</span></div>
        <div id="cjCambioFila"><span>Cambio</span><span id="cjCambio">${Kairos.dinero(0)}</span></div>
      </div>

      <button class="btn btn--primary btn--block" id="btnCobrar" style="margin-top:16px">Cobrar y cerrar mesa</button>
      <p class="dim" style="font-size:12px;text-align:center;margin:12px 0 0">
        Se emite comprobante de entrega. Kairos aún no factura con el SAR.
      </p>`;

    $("metodos").onclick = (e) => {
      const b = e.target.closest(".metodo");
      if (!b) return;
      metodoPago = b.dataset.metodo;
      pintarCaja();
    };
    $("cjPropina").oninput = recalcularCaja;
    $("cjRecibido").oninput = recalcularCaja;
    $("btnCobrar").onclick = () => cobrar(p);
    recalcularCaja();
  }

  function recalcularCaja() {
    const p = Kairos.db().pedidos.find(x => x.id === pedidoEnCaja);
    if (!p) return;
    const propina = parseFloat($("cjPropina").value) || 0;
    const t = Kairos.totalPedido({ ...p, pago: { propina } });
    $("cjCobrar").textContent = Kairos.dinero(t.cobrado);
    const esEfectivo = metodoPago === "efectivo";
    $("cjCambioFila").classList.toggle("hidden", !esEfectivo);
    if (esEfectivo) {
      const recibido = parseFloat($("cjRecibido").value) || 0;
      const cambio = recibido - t.cobrado;
      $("cjCambio").textContent = Kairos.dinero(Math.max(cambio, 0));
      $("cjCambio").style.color = cambio < 0 ? "var(--red)" : "var(--green)";
    }
  }

  function cobrar(p) {
    const propina = parseFloat($("cjPropina").value) || 0;
    const t = Kairos.totalPedido({ ...p, pago: { propina } });
    const recibido = metodoPago === "efectivo" ? (parseFloat($("cjRecibido").value) || 0) : t.cobrado;
    const ref = $("cjRef") ? $("cjRef").value.trim() : "";

    if (metodoPago === "efectivo" && recibido < t.cobrado) {
      aviso("Lo recibido no alcanza para el total.", "warn");
      return;
    }
    if (metodoPago !== "efectivo" && !ref) {
      if (!confirm("No anotó referencia. ¿Cobrar de todos modos?")) return;
    }

    const pagado = Kairos.cobrarPedido(p.id, { metodo: metodoPago, recibido, referencia: ref, propina });
    pedidoEnCaja = null;
    aviso("Cobrado. Comprobante " + pagado.pago.documento + ".");
    imprimirComprobante(pagado);
    pintarCaja();
  }

  /* ---------- Comprobante de entrega ---------- */
  function imprimirComprobante(p) {
    const cfg = Kairos.db().config;
    const t = Kairos.totalPedido(p);
    const metodo = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia" }[p.pago.metodo];

    imprimir(`
      <div class="doc">
        <h2>${esc(cfg.nombre.toUpperCase())}</h2>
        <p class="doc__sub">${esc(cfg.direccion)}<br>${esc(cfg.telefono)}</p>
        <p class="doc__sub" style="border-top:1px solid #111;border-bottom:1px solid #111;padding:6px 0;font-weight:700;color:#111">
          COMPROBANTE DE ENTREGA
        </p>
        <table>
          <tr><td>Documento</td><td class="num">${esc(p.pago.documento)}</td></tr>
          <tr><td>Fecha</td><td class="num">${new Date(p.pago.fecha).toLocaleString("es-HN")}</td></tr>
          <tr><td>Mesa</td><td class="num">${esc(p.mesa)} · pedido #${p.numero}</td></tr>
        </table>
        <table style="margin-top:14px">
          <thead><tr><th>Descripción</th><th class="num">Importe</th></tr></thead>
          <tbody>
            ${p.items.map(i => `<tr><td>${i.cantidad}× ${esc(i.nombre)}</td><td class="num">${Kairos.dinero(i.precio * i.cantidad)}</td></tr>`).join("")}
          </tbody>
        </table>
        <table style="margin-top:10px">
          <tr><td>Subtotal gravado</td><td class="num">${Kairos.dinero(t.base)}</td></tr>
          <tr><td>ISV 15%</td><td class="num">${Kairos.dinero(t.isv)}</td></tr>
          ${p.pago.propina ? `<tr><td>Propina</td><td class="num">${Kairos.dinero(p.pago.propina)}</td></tr>` : ""}
        </table>
        <div class="doc__total"><span>Total</span><span>${Kairos.dinero(p.pago.cobrado)}</span></div>
        <table style="margin-top:10px">
          <tr><td>Forma de pago</td><td class="num">${metodo}</td></tr>
          ${p.pago.metodo === "efectivo"
            ? `<tr><td>Recibido</td><td class="num">${Kairos.dinero(p.pago.recibido)}</td></tr>
               <tr><td>Cambio</td><td class="num">${Kairos.dinero(p.pago.cambio)}</td></tr>`
            : `<tr><td>Referencia</td><td class="num">${esc(p.pago.referencia || "—")}</td></tr>`}
        </table>
        <p class="doc__pie">
          Este documento no es una factura fiscal ni sustituye una.<br>
          Kairos no está inscrito en régimen de facturación del SAR.<br>
          Gracias por su visita.
        </p>
      </div>`);
  }

  /* ============================================================
     VENTAS
     ============================================================ */
  function pintarVentas() {
    const hoy = Kairos.hoy();
    const dia = Kairos.ventasDelDia(hoy);
    const sem = Kairos.semanaActual();
    const semana = Kairos.ventasEntre(sem.desde, sem.hasta);

    $("ventasFecha").textContent = "Corte de " + Kairos.fechaLarga(new Date().toISOString());

    $("ventasKpis").innerHTML = `
      ${kpi("Total del día", Kairos.dinero(dia.total), dia.cantidad + " pedidos cobrados", "verde")}
      ${kpi("Ticket promedio", Kairos.dinero(dia.ticket), "propinas del día: " + Kairos.dinero(dia.propinas))}
      ${kpi("Efectivo", Kairos.dinero(dia.porMetodo.efectivo), "en caja")}
      ${kpi("Tarjeta", Kairos.dinero(dia.porMetodo.tarjeta), "cierre del POS")}
      ${kpi("Transferencia", Kairos.dinero(dia.porMetodo.transferencia), "depósitos")}
      ${kpi("Semana en curso", Kairos.dinero(semana.total), semana.cantidad + " pedidos", "naranja")}`;

    // Barras de los últimos siete días
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const f = Kairos.hoy(d);
      dias.push({ fecha: f, etiqueta: d.toLocaleDateString("es-HN", { weekday: "short" }), total: Kairos.ventasDelDia(f).total });
    }
    const tope = Math.max(...dias.map(d => d.total), 1);
    $("barrasSemana").innerHTML = dias.map(d => `
      <div class="barra ${d.fecha === hoy ? "barra--hoy" : ""}" title="${d.fecha}: ${Kairos.dinero(d.total)}">
        <i style="height:${Math.max((d.total / tope) * 100, 2)}%"></i>
        <span>${d.etiqueta.replace(".", "")}</span>
      </div>`).join("");

    const top = Kairos.masVendidos(dia.pedidos, 6);
    $("topProductos").innerHTML = top.length
      ? `<table class="tabla"><tbody>${top.map(t => `
          <tr><td>${esc(t.nombre)}</td><td class="num dim">${t.cantidad}×</td><td class="num">${Kairos.dinero(t.monto)}</td></tr>`).join("")}</tbody></table>`
      : `<p class="dim">Todavía no hay ventas cobradas hoy.</p>`;

    const filas = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sem.desde + "T12:00:00"); d.setDate(d.getDate() + i);
      const f = Kairos.hoy(d);
      const v = Kairos.ventasDelDia(f);
      filas.push(`<tr>
        <td>${d.toLocaleDateString("es-HN", { weekday: "long", day: "numeric", month: "short" })}</td>
        <td class="num">${v.cantidad}</td>
        <td class="num">${Kairos.dinero(v.porMetodo.efectivo)}</td>
        <td class="num">${Kairos.dinero(v.porMetodo.tarjeta)}</td>
        <td class="num">${Kairos.dinero(v.porMetodo.transferencia)}</td>
        <td class="num" style="color:var(--green);font-weight:700">${Kairos.dinero(v.total)}</td>
      </tr>`);
    }
    $("tablaSemana").innerHTML = `
      <thead><tr><th>Día</th><th class="num">Pedidos</th><th class="num">Efectivo</th><th class="num">Tarjeta</th><th class="num">Transferencia</th><th class="num">Total</th></tr></thead>
      <tbody>${filas.join("")}</tbody>
      <tfoot><tr>
        <td style="font-weight:700">Semana</td>
        <td class="num">${semana.cantidad}</td>
        <td class="num">${Kairos.dinero(semana.porMetodo.efectivo)}</td>
        <td class="num">${Kairos.dinero(semana.porMetodo.tarjeta)}</td>
        <td class="num">${Kairos.dinero(semana.porMetodo.transferencia)}</td>
        <td class="num" style="color:var(--green);font-weight:700">${Kairos.dinero(semana.total)}</td>
      </tr></tfoot>`;
  }

  function kpi(titulo, valor, sub, tono = "") {
    return `<div class="card kpi ${tono ? "kpi--" + tono : ""}">
      <small>${titulo}</small><strong>${valor}</strong><span class="sub">${sub}</span></div>`;
  }

  /* ============================================================
     PRODUCTOS
     ============================================================ */
  function pintarProductos() {
    const d = Kairos.db();

    $("listaCategorias").innerHTML = d.categorias.slice().sort((a, b) => a.orden - b.orden).map(c => {
      const n = d.productos.filter(p => p.categoriaId === c.id).length;
      return `<div class="card cat-card">
        <img src="${esc(c.imagen || "assets/img/plato-01.svg")}" alt="">
        <div><b>${esc(c.nombre)}</b><small>${n} producto${n === 1 ? "" : "s"}</small></div>
        <div class="acciones">
          <button class="btn btn--sm btn--ghost" data-cat-edit="${c.id}">Editar</button>
          <button class="btn btn--sm btn--danger" data-cat-del="${c.id}">Borrar</button>
        </div>
      </div>`;
    }).join("");

    $("tablaProductos").innerHTML = `
      <thead><tr><th>Producto</th><th>Categoría</th><th class="num">Precio</th><th>Estado</th><th></th></tr></thead>
      <tbody>${d.productos.map(p => {
        const cat = d.categorias.find(c => c.id === p.categoriaId);
        return `<tr>
          <td>
            <div class="prod-fila">
              <img src="${esc(p.imagen || "assets/img/plato-01.svg")}" alt="">
              <span><b>${esc(p.nombre)}</b><small>${esc((p.descripcion || "").slice(0, 60))}</small></span>
            </div>
          </td>
          <td class="dim">${esc(cat ? cat.nombre : "Sin categoría")}</td>
          <td class="num">${Kairos.dinero(p.precio)}</td>
          <td><span class="chip ${p.disponible ? "chip--green" : "chip--red"}">${p.disponible ? "Disponible" : "Agotado"}</span></td>
          <td class="num">
            <button class="btn btn--sm btn--ghost" data-prod-edit="${p.id}">Editar</button>
            <button class="btn btn--sm btn--danger" data-prod-del="${p.id}">Borrar</button>
          </td>
        </tr>`;
      }).join("")}</tbody>`;

    document.querySelectorAll("[data-prod-edit]").forEach(b => b.onclick = () => editorProducto(b.dataset.prodEdit));
    document.querySelectorAll("[data-prod-del]").forEach(b => b.onclick = () => {
      if (confirm("¿Borrar este producto del menú?")) { Kairos.borrarProducto(b.dataset.prodDel); pintarProductos(); }
    });
    document.querySelectorAll("[data-cat-edit]").forEach(b => b.onclick = () => editorCategoria(b.dataset.catEdit));
    document.querySelectorAll("[data-cat-del]").forEach(b => b.onclick = () => {
      if (confirm("Se borra la categoría y todos sus productos. ¿Continuar?")) { Kairos.borrarCategoria(b.dataset.catDel); pintarProductos(); }
    });
  }

  function editorProducto(id) {
    const d = Kairos.db();
    const p = id ? d.productos.find(x => x.id === id) : { nombre: "", categoriaId: d.categorias[0]?.id, precio: 0, descripcion: "", imagen: "assets/img/plato-01.svg", disponible: true };
    let imagen = p.imagen;

    const back = document.createElement("div");
    back.className = "modal-backdrop";
    back.innerHTML = `
      <div class="modal">
        <h3>${id ? "Editar producto" : "Nuevo producto"}</h3>
        <p class="dim" style="font-size:14px;margin:4px 0 20px">Se refleja de inmediato en el menú digital.</p>
        <div style="display:flex;gap:16px;align-items:center;margin-bottom:20px">
          <img id="pvImg" src="${esc(imagen)}" alt="" style="width:96px;height:96px;object-fit:cover;border-radius:var(--r-sm);border:1px solid var(--line)">
          <div>
            <input type="file" id="pvFile" accept="image/*" style="display:none">
            <button class="btn btn--ghost btn--sm" id="pvSubir" type="button">Subir foto</button>
            <p class="dim" style="font-size:12px;margin:8px 0 0">JPG o PNG. Se reduce sola para no pesar.</p>
          </div>
        </div>
        <div class="field field--boxed"><label for="pvNombre">Nombre</label><input id="pvNombre" value="${esc(p.nombre)}"></div>
        <div class="field-row">
          <div class="field field--boxed">
            <label for="pvCat">Categoría</label>
            <select id="pvCat">${d.categorias.map(c => `<option value="${c.id}" ${c.id === p.categoriaId ? "selected" : ""}>${esc(c.nombre)}</option>`).join("")}</select>
          </div>
          <div class="field field--boxed"><label for="pvPrecio">Precio (L)</label><input id="pvPrecio" type="number" step="0.01" value="${p.precio}"></div>
        </div>
        <div class="field field--boxed"><label for="pvDesc">Descripción</label><textarea id="pvDesc">${esc(p.descripcion || "")}</textarea></div>
        <label style="display:flex;gap:10px;align-items:center;color:var(--text-dim);font-size:14px">
          <input type="checkbox" id="pvDisp" ${p.disponible ? "checked" : ""}> Disponible en el menú
        </label>
        <div class="modal-actions">
          <button class="btn btn--ghost btn--sm" id="pvCancelar">Cancelar</button>
          <button class="btn btn--primary btn--sm" id="pvGuardar">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(back);

    back.querySelector("#pvSubir").onclick = () => back.querySelector("#pvFile").click();
    back.querySelector("#pvFile").onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      comprimirImagen(file, (dataUrl) => {
        imagen = dataUrl;
        back.querySelector("#pvImg").src = dataUrl;
      });
    };
    back.querySelector("#pvCancelar").onclick = () => back.remove();
    back.querySelector("#pvGuardar").onclick = () => {
      const nombre = back.querySelector("#pvNombre").value.trim();
      if (!nombre) { aviso("El producto necesita un nombre.", "warn"); return; }
      Kairos.guardarProducto({
        id: id || null,
        nombre,
        categoriaId: back.querySelector("#pvCat").value,
        precio: parseFloat(back.querySelector("#pvPrecio").value) || 0,
        descripcion: back.querySelector("#pvDesc").value.trim(),
        disponible: back.querySelector("#pvDisp").checked,
        imagen
      });
      back.remove();
      pintarProductos();
      aviso("Producto guardado.");
    };
    back.addEventListener("click", (e) => { if (e.target === back) back.remove(); });
  }

  function editorCategoria(id) {
    const d = Kairos.db();
    const c = id ? d.categorias.find(x => x.id === id) : { nombre: "", imagen: "assets/img/plato-01.svg", orden: d.categorias.length + 1 };
    let imagen = c.imagen;

    const back = document.createElement("div");
    back.className = "modal-backdrop";
    back.innerHTML = `
      <div class="modal" style="max-width:420px">
        <h3>${id ? "Editar categoría" : "Nueva categoría"}</h3>
        <div style="display:flex;gap:16px;align-items:center;margin:16px 0 20px">
          <img id="cvImg" src="${esc(imagen)}" alt="" style="width:76px;height:76px;object-fit:cover;border-radius:var(--r-sm);border:1px solid var(--line)">
          <div>
            <input type="file" id="cvFile" accept="image/*" style="display:none">
            <button class="btn btn--ghost btn--sm" id="cvSubir" type="button">Subir imagen</button>
          </div>
        </div>
        <div class="field field--boxed"><label for="cvNombre">Nombre</label><input id="cvNombre" value="${esc(c.nombre)}"></div>
        <div class="field field--boxed"><label for="cvOrden">Orden en el menú</label><input id="cvOrden" type="number" value="${c.orden}"></div>
        <div class="modal-actions">
          <button class="btn btn--ghost btn--sm" id="cvCancelar">Cancelar</button>
          <button class="btn btn--primary btn--sm" id="cvGuardar">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(back);

    back.querySelector("#cvSubir").onclick = () => back.querySelector("#cvFile").click();
    back.querySelector("#cvFile").onchange = (e) => {
      const f = e.target.files[0];
      if (f) comprimirImagen(f, (u) => { imagen = u; back.querySelector("#cvImg").src = u; });
    };
    back.querySelector("#cvCancelar").onclick = () => back.remove();
    back.querySelector("#cvGuardar").onclick = () => {
      const nombre = back.querySelector("#cvNombre").value.trim();
      if (!nombre) { aviso("La categoría necesita un nombre.", "warn"); return; }
      Kairos.guardarCategoria({ id: id || null, nombre, imagen, orden: parseInt(back.querySelector("#cvOrden").value) || 1 });
      back.remove();
      pintarProductos();
      aviso("Categoría guardada.");
    };
    back.addEventListener("click", (e) => { if (e.target === back) back.remove(); });
  }

  function comprimirImagen(file, cb) {
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ancho = Math.min(img.width, 640);
        const alto = Math.round(img.height * (ancho / img.width));
        const c = document.createElement("canvas");
        c.width = ancho; c.height = alto;
        c.getContext("2d").drawImage(img, 0, 0, ancho, alto);
        cb(c.toDataURL("image/jpeg", 0.72));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(file);
  }

  /* ============================================================
     REPORTES Y ARQUEO
     ============================================================ */
  function construirDenominaciones() {
    $("denoms").innerHTML = DENOMINACIONES.map(v => `
      <div class="denom">
        <label for="den${v}">L ${v}</label>
        <input id="den${v}" type="number" min="0" step="1" value="0" data-den="${v}">
        <em id="sub${v}">L 0.00</em>
      </div>`).join("");
    $("denoms").addEventListener("input", () => pintarArqueo());
    ["arqFondo", "arqPos", "arqTransf"].forEach(id => {
      $(id).addEventListener("input", () => pintarArqueo());
    });
  }

  function efectivoContado() {
    let total = 0;
    DENOMINACIONES.forEach(v => {
      const n = parseInt($("den" + v).value) || 0;
      const sub = n * v;
      total += sub;
      $("sub" + v).textContent = Kairos.dinero(sub);
    });
    return total;
  }

  function datosArqueo() {
    const fecha = $("fechaReporte").value || Kairos.hoy();
    const v = Kairos.ventasDelDia(fecha);
    const fondo = parseFloat($("arqFondo").value) || 0;
    const contado = efectivoContado();
    const pos = parseFloat($("arqPos").value) || 0;
    const transf = parseFloat($("arqTransf").value) || 0;

    const fisico = {
      efectivo: Kairos.redondear(contado - fondo),
      tarjeta: Kairos.redondear(pos),
      transferencia: Kairos.redondear(transf)
    };
    const dif = {
      efectivo: Kairos.redondear(fisico.efectivo - v.porMetodo.efectivo),
      tarjeta: Kairos.redondear(fisico.tarjeta - v.porMetodo.tarjeta),
      transferencia: Kairos.redondear(fisico.transferencia - v.porMetodo.transferencia)
    };
    const totalFisico = Kairos.redondear(fisico.efectivo + fisico.tarjeta + fisico.transferencia);
    const difTotal = Kairos.redondear(totalFisico - v.total);

    return { fecha, sistema: v, fisico, dif, contado, fondo, totalFisico, difTotal };
  }

  function pintarReportes() {
    const fecha = $("fechaReporte").value || Kairos.hoy();
    const pedidos = Kairos.db().pedidos.filter(p => (p.creado || "").slice(0, 10) === fecha);

    $("tablaRegistro").innerHTML = `
      <thead><tr><th>#</th><th>Mesa</th><th>Hora</th><th>Estado</th><th>Pago</th><th>Documento</th><th class="num">Total</th></tr></thead>
      <tbody>${pedidos.length ? pedidos.map(p => {
        const t = Kairos.totalPedido(p);
        const e = Kairos.ESTADOS[p.estado];
        return `<tr>
          <td>${p.numero}</td>
          <td>${esc(p.mesa)}</td>
          <td class="dim">${Kairos.hora(p.creado)}</td>
          <td><span class="chip chip--${e.color}">${e.etiqueta}</span></td>
          <td class="dim">${p.pago ? ({ efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia" })[p.pago.metodo] : "—"}</td>
          <td class="dim">${p.pago ? esc(p.pago.documento) : "—"}</td>
          <td class="num">${Kairos.dinero(p.estado === "pagado" ? p.pago.cobrado : t.total)}</td>
        </tr>`;
      }).join("") : `<tr><td colspan="7" class="dim" style="text-align:center;padding:28px">Sin pedidos en esa fecha.</td></tr>`}</tbody>`;

    pintarArqueo();
    pintarArqueosPrevios();
  }

  function pintarArqueo() {
    const a = datosArqueo();
    const fila = (etq, sis, fis, dif) => `
      <tr>
        <td>${etq}</td>
        <td class="num">${Kairos.dinero(sis)}</td>
        <td class="num">${Kairos.dinero(fis)}</td>
        <td class="num" style="color:${Math.abs(dif) < 0.01 ? "var(--green)" : "var(--red)"}">${Kairos.dinero(dif)}</td>
      </tr>`;

    $("tablaArqueo").innerHTML = `
      <thead><tr><th>Concepto</th><th class="num">Sistema</th><th class="num">Físico</th><th class="num">Diferencia</th></tr></thead>
      <tbody>
        ${fila("Efectivo", a.sistema.porMetodo.efectivo, a.fisico.efectivo, a.dif.efectivo)}
        ${fila("Tarjeta", a.sistema.porMetodo.tarjeta, a.fisico.tarjeta, a.dif.tarjeta)}
        ${fila("Transferencia", a.sistema.porMetodo.transferencia, a.fisico.transferencia, a.dif.transferencia)}
      </tbody>`;

    const cuadra = Math.abs(a.difTotal) < 0.01;
    $("cuadre").innerHTML = `
      <div><span class="dim">Pedidos cobrados</span><span>${a.sistema.cantidad}</span></div>
      <div><span class="dim">Efectivo contado (con fondo)</span><span>${Kairos.dinero(a.contado)}</span></div>
      <div><span class="dim">Total según el sistema</span><span>${Kairos.dinero(a.sistema.total)}</span></div>
      <div><span class="dim">Total físico</span><span>${Kairos.dinero(a.totalFisico)}</span></div>
      <div class="dif ${cuadra ? "ok" : "mal"}">
        <span>${cuadra ? "Cuadra" : a.difTotal > 0 ? "Sobrante" : "Faltante"}</span>
        <span>${Kairos.dinero(Math.abs(a.difTotal))}</span>
      </div>`;

    $("btnImprimirArqueo").disabled = false;
  }

  function pintarArqueosPrevios() {
    const previos = Kairos.db().arqueos.slice(0, 5);
    $("arqueosPrevios").innerHTML = previos.length ? `
      <h4 style="font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-mute);margin-bottom:8px">Cierres guardados</h4>
      <table class="tabla"><tbody>${previos.map(a => `
        <tr>
          <td>${a.fecha}</td>
          <td class="dim">${esc(a.responsable || "—")}</td>
          <td class="num">${Kairos.dinero(a.totalFisico)}</td>
          <td class="num" style="color:${Math.abs(a.difTotal) < 0.01 ? "var(--green)" : "var(--red)"}">${Kairos.dinero(a.difTotal)}</td>
        </tr>`).join("")}</tbody></table>` : "";
  }

  function guardarArqueo() {
    const a = datosArqueo();
    const responsable = $("arqResponsable").value.trim();
    if (!responsable) { aviso("Escriba quién hace el cierre.", "warn"); return; }
    Kairos.guardarArqueo({
      fecha: a.fecha,
      responsable,
      nota: $("arqNota").value.trim(),
      sistema: a.sistema.porMetodo,
      totalSistema: a.sistema.total,
      fisico: a.fisico,
      totalFisico: a.totalFisico,
      difTotal: a.difTotal,
      fondo: a.fondo,
      contado: a.contado
    });
    aviso("Cierre guardado.");
    pintarArqueosPrevios();
  }

  function imprimirArqueo() {
    const a = datosArqueo();
    const cfg = Kairos.db().config;
    const cuadra = Math.abs(a.difTotal) < 0.01;
    const conteo = DENOMINACIONES.map(v => {
      const n = parseInt($("den" + v).value) || 0;
      return n ? `<tr><td>L ${v} × ${n}</td><td class="num">${Kairos.dinero(n * v)}</td></tr>` : "";
    }).join("");

    imprimir(`
      <div class="doc" style="max-width:600px">
        <h2>${esc(cfg.nombre.toUpperCase())}</h2>
        <p class="doc__sub">Arqueo de caja · ${a.fecha}</p>
        <table>
          <tr><td>Responsable</td><td class="num">${esc($("arqResponsable").value.trim() || "—")}</td></tr>
          <tr><td>Impreso</td><td class="num">${new Date().toLocaleString("es-HN")}</td></tr>
          <tr><td>Pedidos cobrados</td><td class="num">${a.sistema.cantidad}</td></tr>
        </table>

        <p style="font-weight:700;margin:18px 0 4px">Conteo de efectivo</p>
        <table>${conteo || `<tr><td colspan="2">Sin billetes registrados</td></tr>`}
          <tr><td><b>Total contado</b></td><td class="num"><b>${Kairos.dinero(a.contado)}</b></td></tr>
          <tr><td>Menos fondo de caja</td><td class="num">${Kairos.dinero(a.fondo)}</td></tr>
          <tr><td><b>Efectivo de ventas</b></td><td class="num"><b>${Kairos.dinero(a.fisico.efectivo)}</b></td></tr>
        </table>

        <p style="font-weight:700;margin:18px 0 4px">Comparación</p>
        <table>
          <thead><tr><th>Concepto</th><th class="num">Sistema</th><th class="num">Físico</th><th class="num">Dif.</th></tr></thead>
          <tbody>
            <tr><td>Efectivo</td><td class="num">${Kairos.dinero(a.sistema.porMetodo.efectivo)}</td><td class="num">${Kairos.dinero(a.fisico.efectivo)}</td><td class="num">${Kairos.dinero(a.dif.efectivo)}</td></tr>
            <tr><td>Tarjeta</td><td class="num">${Kairos.dinero(a.sistema.porMetodo.tarjeta)}</td><td class="num">${Kairos.dinero(a.fisico.tarjeta)}</td><td class="num">${Kairos.dinero(a.dif.tarjeta)}</td></tr>
            <tr><td>Transferencia</td><td class="num">${Kairos.dinero(a.sistema.porMetodo.transferencia)}</td><td class="num">${Kairos.dinero(a.fisico.transferencia)}</td><td class="num">${Kairos.dinero(a.dif.transferencia)}</td></tr>
          </tbody>
        </table>

        <div class="doc__total"><span>${cuadra ? "Cuadra" : a.difTotal > 0 ? "Sobrante" : "Faltante"}</span><span>${Kairos.dinero(Math.abs(a.difTotal))}</span></div>
        ${$("arqNota").value.trim() ? `<p style="margin-top:14px"><b>Observaciones:</b> ${esc($("arqNota").value.trim())}</p>` : ""}

        <div style="display:flex;gap:24px;margin-top:48px">
          <div style="flex:1;border-top:1px solid #111;padding-top:6px;text-align:center;font-size:11px">Entrega caja</div>
          <div style="flex:1;border-top:1px solid #111;padding-top:6px;text-align:center;font-size:11px">Recibe administración</div>
        </div>
        <p class="doc__pie">Documento interno de control. No es un documento fiscal.</p>
      </div>`);
  }

  /* ============================================================
     AJUSTES
     ============================================================ */
  function pintarAjustes() {
    const d = Kairos.db();
    const cfg = d.config;

    $("tablaMesas").innerHTML = `
      <thead><tr><th>Mesa</th><th>Código</th><th>Estado</th><th></th></tr></thead>
      <tbody>${d.mesas.map(m => `
        <tr>
          <td><b>${esc(m.numero)}</b></td>
          <td style="font-family:Montserrat,sans-serif;letter-spacing:.2em;color:var(--orange)">${esc(m.codigo)}</td>
          <td><span class="chip ${m.activa ? "chip--green" : "chip--outline"}">${m.activa ? "Activa" : "Fuera de servicio"}</span></td>
          <td class="num">
            <button class="btn btn--sm btn--ghost" data-mesa-codigo="${m.numero}">Nuevo código</button>
            <button class="btn btn--sm btn--ghost" data-mesa-estado="${m.numero}">${m.activa ? "Desactivar" : "Activar"}</button>
          </td>
        </tr>`).join("")}</tbody>`;

    document.querySelectorAll("[data-mesa-codigo]").forEach(b => b.onclick = () => {
      const m = Kairos.db().mesas.find(x => x.numero === b.dataset.mesaCodigo);
      m.codigo = Kairos.sha256("kairos-" + m.numero + "-" + Date.now()).slice(0, 4).toUpperCase();
      Kairos.guardar();
      pintarAjustes();
      aviso("Mesa " + m.numero + ": código nuevo " + m.codigo);
    });
    document.querySelectorAll("[data-mesa-estado]").forEach(b => b.onclick = () => {
      const m = Kairos.db().mesas.find(x => x.numero === b.dataset.mesaEstado);
      m.activa = !m.activa;
      Kairos.guardar();
      pintarAjustes();
    });

    $("cfgNombre").value = cfg.nombre;
    $("cfgDireccion").value = cfg.direccion;
    $("cfgTelefono").value = cfg.telefono;
    $("cfgCorreo").value = cfg.correo;
    $("cfgHorario").value = cfg.horario;
    $("cfgWhats").value = cfg.redes.whatsapp || "";
    $("cfgIg").value = cfg.redes.instagram || "";
    $("cfgFb").value = cfg.redes.facebook || "";
  }

  function agregarMesa() {
    const num = prompt("Número de la mesa nueva:");
    if (!num) return;
    const d = Kairos.db();
    if (d.mesas.some(m => m.numero === num.trim())) { aviso("Esa mesa ya existe.", "warn"); return; }
    d.mesas.push({ numero: num.trim(), codigo: Kairos.codigoMesa(num.trim()), activa: true });
    Kairos.guardar();
    pintarAjustes();
  }

  function imprimirMesas() {
    const d = Kairos.db();
    imprimir(`
      <div style="background:#fff;color:#111;padding:20px;font-family:Inter,sans-serif">
        ${d.mesas.map(m => `
          <div style="border:2px solid #111;border-radius:8px;padding:22px;text-align:center;margin-bottom:14px;page-break-inside:avoid">
            <div style="font-family:Montserrat,sans-serif;letter-spacing:.25em;font-size:15px">${esc(d.config.nombre.toUpperCase())}</div>
            <div style="font-family:Montserrat,sans-serif;font-size:44px;font-weight:700;margin:6px 0">MESA ${esc(m.numero)}</div>
            <div style="font-size:12px;color:#555">Código para pedir desde su teléfono</div>
            <div style="font-family:Montserrat,sans-serif;font-size:32px;letter-spacing:.35em;margin-top:4px">${esc(m.codigo)}</div>
          </div>`).join("")}
      </div>`);
  }

  function guardarConfig() {
    const d = Kairos.db();
    d.config.nombre = $("cfgNombre").value.trim();
    d.config.direccion = $("cfgDireccion").value.trim();
    d.config.telefono = $("cfgTelefono").value.trim();
    d.config.correo = $("cfgCorreo").value.trim();
    d.config.horario = $("cfgHorario").value.trim();
    d.config.redes.whatsapp = $("cfgWhats").value.trim();
    d.config.redes.instagram = $("cfgIg").value.trim();
    d.config.redes.facebook = $("cfgFb").value.trim();
    Kairos.guardar();
    aviso("Datos guardados.");
  }

  function cambiarPin() {
    const a = $("pinNuevo").value.trim();
    const b = $("pinConfirmar").value.trim();
    if (a.length < 4) { aviso("Use al menos cuatro dígitos.", "warn"); return; }
    if (a !== b) { aviso("Los dos PIN no coinciden.", "warn"); return; }
    Kairos.cambiarPin(a);
    $("pinNuevo").value = "";
    $("pinConfirmar").value = "";
    aviso("PIN actualizado.");
  }

  function reiniciar() {
    if (!confirm("Se borran pedidos, ventas y arqueos. ¿Continuar?")) return;
    Kairos.reiniciar();
    aviso("Datos reiniciados.");
    refrescar();
  }

  /* ============================================================
     Impresión
     ============================================================ */
  function imprimir(html) {
    const area = $("areaImpresion");
    area.innerHTML = html;
    window.print();
  }
})();
