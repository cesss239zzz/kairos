/* ============================================================
   KAIROS — acceso.js
   Entrada discreta al panel de administración.
   Se activa con cinco toques seguidos sobre el punto del
   logotipo del pie de página, o con Ctrl + Alt + K.
   ============================================================ */

(function () {
  let toques = 0;
  let reloj = null;

  function contar() {
    toques++;
    clearTimeout(reloj);
    reloj = setTimeout(() => (toques = 0), 1600);
    if (toques >= 5) {
      toques = 0;
      pedirPin();
    }
  }

  function pedirPin() {
    if (document.getElementById("pinBackdrop")) return;

    const back = document.createElement("div");
    back.className = "modal-backdrop";
    back.id = "pinBackdrop";
    back.innerHTML = `
      <div class="modal" style="max-width:340px" role="dialog" aria-modal="true" aria-label="Acceso del personal">
        <h3>Acceso del personal</h3>
        <p class="dim" style="margin:4px 0 20px;font-size:14px">Escriba su PIN para abrir el panel.</p>
        <div class="field field--boxed">
          <label for="pinInput">PIN</label>
          <input id="pinInput" type="password" inputmode="numeric" autocomplete="off"
                 maxlength="8" style="letter-spacing:.5em;text-align:center;font-size:20px">
        </div>
        <p id="pinError" class="hidden" style="color:var(--red);font-size:13px;margin:0"></p>
        <div class="modal-actions">
          <button class="btn btn--ghost btn--sm" id="pinCancelar" type="button">Cancelar</button>
          <button class="btn btn--primary btn--sm" id="pinEntrar" type="button">Entrar</button>
        </div>
      </div>`;
    document.body.appendChild(back);

    const input = back.querySelector("#pinInput");
    const error = back.querySelector("#pinError");
    input.focus();

    const cerrar = () => back.remove();

    const intentar = () => {
      if (Kairos.verificarPin(input.value)) {
        Kairos.abrirSesionAdmin();
        window.location.href = "admin.html";
      } else {
        error.textContent = "PIN incorrecto. Intente de nuevo.";
        error.classList.remove("hidden");
        input.value = "";
        input.focus();
      }
    };

    back.querySelector("#pinCancelar").onclick = cerrar;
    back.querySelector("#pinEntrar").onclick = intentar;
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") intentar(); });
    back.addEventListener("click", (e) => { if (e.target === back) cerrar(); });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { cerrar(); document.removeEventListener("keydown", esc); }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const punto = document.getElementById("accesoPersonal");
    if (punto) punto.addEventListener("click", contar);
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.altKey && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      pedirPin();
    }
  });

  window.KairosAcceso = { pedirPin };
})();
