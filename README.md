# Kairos — sitio web, menú digital y panel

Sitio estático en HTML, CSS y JavaScript puro. No requiere compilar nada.

## Estructura

```
index.html          Landing: el lugar, carta destacada, ubicación, reservaciones, redes
menu.html           Menú digital del cliente: mesa + código, carrito, pedidos en curso
admin.html          Panel: pedidos, caja, ventas, productos, reportes, ajustes
css/base.css        Sistema de diseño (colores, tipografía, botones, modales, totales)
css/site.css        Estilos de la landing
css/menu.css        Estilos del menú digital
css/admin.css       Estilos del panel, incluida la hoja de impresión
js/store.js         Capa de datos: catálogo, pedidos, ventas, arqueo, SHA-256 del PIN
js/acceso.js        Entrada discreta al panel
js/site.js          Landing
js/menu.js          Menú digital
js/admin.js         Panel
assets/img/         Portadas del sitio y fotos del local
assets/img/platos/  Una ilustración por platillo (SVG), servidas según el nombre
tools/              Generador de las ilustraciones (opcional, solo para regenerarlas)
```

## Cómo abrirlo

Súbalo a cualquier hosting estático (Netlify, Vercel, GitHub Pages, hosting compartido).
Para probarlo en la máquina, desde la carpeta del proyecto:

```bash
python3 -m http.server 8080
```

y abra `http://localhost:8080`. Conviene usar un servidor y no abrir el archivo con doble
clic, porque algunos navegadores restringen `localStorage` en `file://`.

## Acceso al panel

- **Botón oculto:** cinco toques seguidos sobre el punto gris que está junto al logotipo
  del pie de página (en la landing y en el menú digital).
- **Atajo de teclado:** `Ctrl + Alt + K`.
- **PIN inicial:** `2580`. Cámbielo en Ajustes → Acceso del personal. El PIN nunca se
  guarda en texto plano: se guarda su hash SHA-256, calculado en tiempo de ejecución.

## Flujo de un pedido

1. El cliente entra a `menu.html`, escribe número de mesa y código de mesa.
2. Arma el pedido y lo envía. Entra al panel como **pendiente**.
3. En Pedidos usted lo pasa a **en preparación** y luego a **preparado**. Al marcarlo
   preparado desaparece del teléfono del cliente.
4. En Caja selecciona el pedido, ve el totalizador, elige efectivo, tarjeta o
   transferencia y cobra. El pedido pasa a **pagado**: sale de la vista del cliente pero
   queda en el registro del día.
5. Al cobrar se imprime un **comprobante de entrega**. No es factura fiscal: Kairos
   todavía no está inscrito en régimen de facturación del SAR, y el documento lo dice.

## Códigos de mesa

Cada mesa tiene un código de cuatro caracteres. En Ajustes puede generar uno nuevo,
desactivar mesas y usar **Imprimir letreros** para sacar los rótulos con número y código
listos para poner en cada mesa.

## Arqueo

En Reportes cuenta el efectivo por denominación, anota el fondo de caja, el cierre del POS
y las transferencias. El sistema compara contra lo registrado y marca sobrante o faltante.
Si cuadra, imprime el arqueo con espacio para las dos firmas.

El total de ventas incluye propinas, porque es el dinero que realmente entró y es lo que se
compara contra el conteo físico.

## Al subir una versión nueva

Los navegadores guardan el `.js`, el `.css` y las imágenes por su nombre, así que un
cliente que ya visitó el sitio puede seguir viendo la versión vieja aunque recargue.
Por eso los archivos propios se piden con un sello de versión:

```html
<script src="js/store.js?v=2"></script>
```

**Cuando cambie algo de `js/`, `css/` o de las imágenes fijas, suba el número del sello**
(`?v=2` → `?v=3`) en `index.html`, `menu.html` y `admin.html`. Con eso el navegador
entiende que es un archivo distinto y lo baja de nuevo.

Si a usted mismo no le aparece el cambio después de subirlo:

1. Compruebe que los archivos llegaron al hosting: abra
   `su-sitio.com/assets/img/platos/mojito.svg` en el navegador. Si sale el vaso de mojito,
   están subidos; si sale «no encontrado», falta subirlos.
2. Recargue saltándose lo guardado: **Ctrl + Shift + R** (Windows) o **Cmd + Shift + R**
   (Mac). En el teléfono, abra el sitio en una pestaña privada.

## Nota importante sobre los datos

Todo se guarda en el `localStorage` del navegador. Eso significa que **el pedido que hace un
cliente en su teléfono no llega al panel de otra computadora**: solo se comparte entre
pestañas del mismo navegador. Sirve para demostrar el flujo completo al cliente, pero para
operar de verdad hay que poner un backend detrás (Supabase o una Minimal API en ASP.NET
Core, con la misma forma de datos que `store.js` ya usa).

Cuando llegue ese momento, lo único que hay que cambiar son las funciones de `store.js`:
la interfaz que consumen `menu.js` y `admin.js` ya está aislada ahí.

## Imágenes de la carta

Cada platillo trae su propia ilustración, dibujada para ese plato: la tabla de quesos, el
ceviche en copa, el corte a la parrilla, la cazuela de camarones, el vaso de mojito. Son
SVG vectoriales, viven en `assets/img/platos/` y pesan poco, así que el menú abre rápido
aunque el cliente esté con datos móviles.

**No hay que elegirlas a mano.** La imagen sale del *nombre* del platillo: al escribir
«Sopa de caracol», «Baleada sencilla» o «Copa de vino tinto» en Productos → Nuevo producto,
la ilustración cambia sola mientras usted escribe. Si el nombre no se parece a nada
conocido, se usa la ilustración de la categoría y, en último caso, un plato genérico.
El botón **Usar ilustración** vuelve a la automática en cualquier momento.

**Para poner la foto real** de un plato: Productos → Editar → **Subir foto**. La foto se
reduce a 640 px, se guarda como JPEG y manda sobre la ilustración; ya no vuelve a cambiar
sola aunque se edite el nombre.

Las bases guardadas de antes se actualizan solas al abrir el sitio: los rellenos viejos
pasan a la ilustración que les toca y las fotos que usted ya había subido no se tocan.

### Regenerar o agregar ilustraciones

Las láminas las dibuja un script de Python. Solo hace falta si quiere retocarlas o agregar
un platillo nuevo al repertorio:

```bash
python3 tools/generar-imagenes.py
```

Para sumar un dibujo nuevo: escriba su función en `tools/generar-imagenes.py`, agréguelo a
la lista `CARTA` del final y anote sus palabras clave en la tabla `ARTE_PLATO` de
`js/store.js` (el orden importa: lo más específico va primero).

Las tres fotos del local (`assets/img/lugar-*.svg`) siguen siendo de relleno: reemplácelas
por las fotografías reales con el mismo nombre.
