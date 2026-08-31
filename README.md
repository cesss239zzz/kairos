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
assets/img/         Imágenes de referencia (SVG). Reemplácelas por las fotos reales
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

## Nota importante sobre los datos

Todo se guarda en el `localStorage` del navegador. Eso significa que **el pedido que hace un
cliente en su teléfono no llega al panel de otra computadora**: solo se comparte entre
pestañas del mismo navegador. Sirve para demostrar el flujo completo al cliente, pero para
operar de verdad hay que poner un backend detrás (Supabase o una Minimal API en ASP.NET
Core, con la misma forma de datos que `store.js` ya usa).

Cuando llegue ese momento, lo único que hay que cambiar son las funciones de `store.js`:
la interfaz que consumen `menu.js` y `admin.js` ya está aislada ahí.

## Imágenes

Las de `assets/img/` son SVG de relleno. Reemplácelas por las fotos reales con el mismo
nombre, o cárguelas desde el panel en Productos → Editar → Subir foto (se reducen a 640 px
y se guardan como JPEG).
