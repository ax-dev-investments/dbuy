# Memoria del Proyecto: dbuy Dominican Buy

## Sesión del 10 de Agosto de 2026

Este archivo es un registro permanente para mantener el contexto entre diferentes sesiones de chat con Antigravity. **No borrar**.

---

## 1. Estado y Contexto del Proyecto
* **Nombre de la Aplicación**: dbuy
* **Tecnologías**: HTML5, CSS Vanilla, JavaScript, Supabase Client SDK, LocalStorage, Python HTTP Server (para desarrollo)
* **Descripción**: Plataforma de comercio electrónico de alta fidelidad adaptada al mercado de República Dominicana para la venta directa y subasta express de toda clase de artículos, con persistencia local de datos y simulación de competencia interactiva de pujas en tiempo real.

---

## 2. Estado Actual del Código
* **Frontend interactivo completado**: Creada la estructura base responsive en [index.html](file:///c:/Users/4L3X/.gemini/antigravity/scratch/dbuy%20Dominican%20Buy/index.html) con soporte para inicio, detalle de artículo, publicación de anuncios, panel de usuario, autenticación condicional mediante Google, y un sistema expandido de **5 pestañas de filtrado rápido** (Todos, Venta Fija, Subasta Venta, Alquiler Fijo, Subasta Renta).
* **Diseño Premium**: Implementado un diseño oscuro glassmorphic en [styles.css](file:///c:/Users/4L3X/.gemini/antigravity/scratch/dbuy%20Dominican%20Buy/styles.css) con acentos tricolores inspirados en RD, animaciones de interacción de subasta y una pequeña bandera dominicana en formato SVG integrada en el logotipo principal junto al subtítulo de marca.
* **Integración con Supabase y CRUD**: Cliente oficial cargado en el frontend e inicializado con la base de datos real. Configurado el flujo OAuth de Google Sign-in/Sign-out. Las acciones de publicar, pujar y **editar anuncios propios** (CRUD completo) están completamente integradas con los perfiles reales de los usuarios.
* **Carga de Múltiples Imágenes y Asesoría**: Carga de hasta 25 fotos locales. Módulo de Asesoría de Mercado integrado que vincula URLs externas y muestra valores numéricos formateados en tiempo real.
* **Flujo de Pago y Comisión del 5%**: Implementación del Modal de Checkout "dBuy Pago Seguro" con enmascaramiento de tarjeta (vencimiento y CVC) en tiempo real. Permite cobrar el 5% de comisión por pasarela virtual simulada para reservar un artículo o para liberar los datos de contacto del vendedor al ganar una subasta, actualizando el estado a "Reservado/Vendido".
* **Protección contra Auto-Ofertas (Shill Bidding)**: Agregadas validaciones al renderizar detalles en [app.js](file:///c:/Users/4L3X/.gemini/antigravity/scratch/dbuy%20Dominican%20Buy/app.js) para que los vendedores no puedan ofertar, pujar ni auto-reservarse sus propios anuncios, ocultando los controles y mostrando una tarjeta de información en su lugar.
* **Precio de Reserva y Botón de Cancelación**: Añadido el campo opcional "Precio Mínimo de Reserva" en el formulario de creación de subastas, que despliega una insignia visual indicadora en tiempo real en la vista de detalle. Si la subasta finaliza sin superarlo, se declara desierta. Los vendedores también disponen de un botón "Cancelar Subasta" que retira el anuncio de los resultados públicos del catálogo.
* **Lógica y simulador de pujas**: Implementados en [app.js](file:///c:/Users/4L3X/.gemini/antigravity/scratch/dbuy%20Dominican%20Buy/app.js) el buscador, enrutador simple, y el motor de contra-pujas simuladas por IA que responde activamente al usuario a los pocos segundos de realizar una oferta, ahora con soporte completo para la modalidad de **Subasta de Renta Ascendente** (`/ mes`).
* **Servidor Local Activo**: Corriendo en el puerto local 3099 (`python -m http.server 3099`).

---

## 3. Tareas Pendientes / Siguientes Pasos
* Añadir pasarela de pago virtual para el cobro de comisiones de subasta si el usuario lo requiere.
* Implementar registro de usuarios real utilizando Firebase o Supabase si se desea escalar.
* Configurar despliegue automático a Surge o Vercel.
