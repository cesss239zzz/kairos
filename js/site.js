/* ============================================================
   KAIROS — site.js (landing pública)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const cfg = Kairos.db().config;

  document.getElementById("anio").textContent = new Date().getFullYear();
  document.getElementById("dirTexto").textContent = cfg.direccion;
  document.getElementById("horarioTexto").textContent = cfg.horario;
  document.getElementById("telTexto").textContent = cfg.telefono;
  document.getElementById("correoTexto").textContent = cfg.correo;

  document.getElementById("btnMapa").href =
    "https://www.google.com/maps/search/" + encodeURIComponent(cfg.direccion);

  const redes = cfg.redes || {};
  const enlaces = { lnkIg: redes.instagram, lnkFb: redes.facebook, lnkTk: redes.tiktok, lnkWa: redes.whatsapp, btnWhats: redes.whatsapp };
  Object.entries(enlaces).forEach(([id, url]) => {
    const el = document.getElementById(id);
    if (el && url) el.href = url;
  });

  /* ---------- Platos destacados (se alimentan del mismo catálogo del panel) ---------- */
  const destacados = Kairos.db().productos.filter(p => p.disponible).slice(0, 6);
  document.getElementById("picks").innerHTML = destacados.map(p => `
    <article class="card pick">
      <img src="${esc(p.imagen)}" alt="${esc(p.nombre)}">
      <div class="pick__body">
        <div class="pick__top">
          <h3>${esc(p.nombre)}</h3>
          <span class="pick__price">${Kairos.dinero(p.precio)}</span>
        </div>
        <p>${esc(p.descripcion || "")}</p>
      </div>
    </article>`).join("");

  /* ---------- Reservaciones ---------- */
  const form = document.getElementById("formReserva");
  const fecha = document.getElementById("rFecha");
  fecha.min = Kairos.hoy();
  fecha.value = Kairos.hoy();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form).entries());

    if (!d.nombre.trim() || !d.telefono.trim()) {
      aviso("Escriba su nombre y su teléfono para poder confirmarle.", "warn");
      return;
    }

    const texto =
      `Hola Kairos, quiero reservar.\n` +
      `Nombre: ${d.nombre}\n` +
      `Teléfono: ${d.telefono}\n` +
      `Fecha: ${d.fecha} a las ${d.hora}\n` +
      `Personas: ${d.personas}\n` +
      `Ambiente: ${d.ambiente}` +
      (d.nota.trim() ? `\nComentarios: ${d.nota}` : "");

    const base = (redes.whatsapp || "https://wa.me/504").replace(/\?.*$/, "");
    window.open(base + "?text=" + encodeURIComponent(texto), "_blank", "noopener");
    aviso("Solicitud lista. Envíela en WhatsApp para confirmar.");
    form.reset();
    fecha.value = Kairos.hoy();
    document.getElementById("rHora").value = "19:00";
  });
});
