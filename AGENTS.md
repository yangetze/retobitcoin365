# Instrucciones para Agentes de IA (#RetoBitcoin365)

Este documento contiene las reglas de negocio, guías de estilo, arquitectura y comportamientos esperados para cualquier Agente de IA (como Jules) trabajando en este proyecto.

## 1. Identidad y Tono del Proyecto
- **Nombre y Marca:** El proyecto se llama `RetoBitcoin365` y utiliza activamente el hashtag `#RetoBitcoin365`.
- **Idioma Obligatorio:** Todo el texto visible para los usuarios finales y el contenido del proyecto **debe estar en Español**.
- **Tono de Voz:** Profesional, útil y directo.

## 2. Reglas de Comportamiento del Agente (Jules)
- **Modo de Planificación Profunda (Deep Planning Mode):** Antes de realizar cualquier cambio en el código, es obligatorio preguntar activamente usando herramientas de comunicación (`request_user_input` o `message_user`) para asegurar certeza absoluta de los requerimientos. No hacer preguntas que puedan derivarse leyendo el código. Una vez que se cree un plan vía `set_plan` y el usuario lo apruebe, procede autónomamente sin pedir más confirmaciones.

## 3. Stack Tecnológico y Arquitectura
- **Tipo de Aplicación:** El proyecto es una aplicación web estática construida principalmente con HTML, CSS y JavaScript vainilla.
- **PWA (Progressive Web App):** El proyecto es una PWA que utiliza `manifest.json` y un Service Worker (`sw.js`) para el almacenamiento en caché de recursos.
- **Nuevas Funcionalidades:** Deben implementarse como páginas HTML separadas enlazadas desde el archivo principal `index.html`.
- **Ejecución Local:** Usa `python3 -m http.server` para levantar el proyecto localmente para verificaciones.
- **Pruebas (Testing):** Se utilizan scripts de prueba en JavaScript vainilla ejecutados vía Node.js (`npm test`). No se usan frameworks pesados como Jest. Los archivos de prueba deben ubicarse en la carpeta `/tests` y deben usar "mocks" simples para las variables globales del navegador (como `window`, `document`, `localStorage`) si se requiere evaluar la base de código.
- **Librerías Externas Permitidas:** Se utiliza la librería `html2canvas` para la generación de imágenes del lado del cliente.
- **Fuentes de Datos:**
  - CoinGecko (para BTC/USD)
  - CriptoYa (para USDT/VES en Binance P2P - se obtienen tasas *ask* y *bid*)
  - DolarVzla (rates.dolarvzla.com para tasas Oficiales de USD/VES y EUR/VES)
  - FawazAhmed0 (cdn.jsdelivr.net para COP)
  - *Nota Importante:* Todas las conversiones entre diferentes monedas se deben calcular matemáticamente usando el Bolívar Venezolano (VES) como "puente universal" para preservar de forma precisa las primas de mercado y los márgenes de compra/venta (spreads).

## 4. Reglas de Negocio e Interfaz de Usuario (UI/UX)
- **Modo Claro/Oscuro:** La interfaz soporta modos claro y oscuro (el valor por defecto es claro). La preferencia del usuario se guarda en `localStorage`.
- **Formato de Fechas:** El formato preferido para mostrar fechas y horas en la UI es `dd/MM/yyyy HH:mm`.
- **Precisión Numérica de Divisas:**
  - Monedas Fiat y Stablecoins (VES, USDT, USD, EUR): Mostrar exactamente **2 decimales**.
  - Bitcoin (BTC): Mostrar exactamente **8 decimales**.
  - Pesos Colombianos (COP): Mostrar exactamente **0 decimales**.
- **Visualización de Bitcoin:** Los precios de Bitcoin se deben mostrar en Dólares Estadounidenses (USD). En los resultados de la Calculadora Dinámica, debe incluirse un texto de ayuda debajo del precio mostrando el equivalente en Satoshis (formateado con separadores de miles con puntos y el sufijo `sats`).
- **Página "Precios":**
  - El botón de refresco manual incluye un tooltip que indica el tiempo relativo transcurrido desde la última obtención de datos (ej. "hace 5 min").
  - Existe un icono de refresco manual en el encabezado.
  - El layout en tablets y pantallas de escritorio (>=768px) debe forzar una cuadrícula (grid) de **4 columnas** para mostrar todas las tarjetas en una sola línea.
  - Las tarjetas de monedas se renderizan dinámicamente según las preferencias del usuario (visibilidad y orden) guardadas en `localStorage`.
  - El panel (dashboard) principal de precios debe mostrar una **única tasa de referencia** para las monedas. Si la calculadora usa tasas de compra y venta separadas (ej. USDT), usa la tasa de venta (*ask*) como precio a mostrar por defecto.

## 5. Calculadora Dinámica
- Es una sección persistente en la página de "Precios" que permite encadenar conversiones (VES, USDT, USD, EUR, BTC, COP).
- **Seguridad y Estado:** El estado de la calculadora (filas y valores) se guarda en `localStorage` y **debe ser sanitizado** al cargarse para evitar vulnerabilidades XSS.
- **Comportamiento UX:**
  - Automáticamente la moneda de origen de una nueva fila predetermina la moneda de destino de la fila anterior (creando un encadenamiento o "chaining").
  - Se inicializa por defecto con una conversión de USDT a VES.
  - La función de "Intercambiar" (swap) moneda debe preservar el valor (la cantidad) ingresada en lugar de convertirlo.
- **Funcionalidades Nativas:**
  - La funcionalidad de compartir en redes sociales usa la Web Share API nativa (`navigator.share`), priorizando la compatibilidad móvil sobre URLs de intento de aplicaciones específicas.
  - Para la funcionalidad de "Copiar al portapapeles" en los precios, solo se debe copiar el valor numérico formateado (usando la localización `es-VE`), sin incluir símbolos ni códigos de monedas.

## 6. Diseño Responsivo y Móvil
- **Orientación:** Los elementos direccionales de la UI (como el botón de swap de la calculadora) deben usar orientación vertical en pantallas móviles.
- **Layout de la Calculadora:** En móviles, usa un esquema flexbox apilado verticalmente (`flex-direction: column` para `.calc-row`) para asegurar que los campos de entrada sean visibles y no causen scroll horizontal.
- **Controles de Fila:** En móviles, los controles de acción (botones swap, remover) se agrupan en un contenedor central (`.calc-controls`) dentro del flujo del documento. No se debe usar posicionamiento absoluto (`position: absolute`) para evitar interacciones accidentales.
- **Paneles de Configuración:** Deben apilarse por encima de las áreas de previsualización (preview). El usuario **detesta los botones flotantes (FABs)**. Los botones de acción (como "Descargar" o "Compartir") deben permanecer en el flujo normal (ej. apilados uno sobre el otro).
- **Espacio en el Encabezado:** La información secundaria, como la fecha de "Última Sincronización", debe ocultarse en móviles para ahorrar espacio en la cabecera.
- **Ordenamiento de Listas:** Para interfaces donde se ordenen elementos de una lista, usar **botones explícitos** de "Subir" (Up) y "Bajar" (Down) en lugar de mecanismos de arrastrar y soltar (drag-and-drop).

## 7. Consideraciones Técnicas Especiales
- **Generación de Imágenes con html2canvas:** Al usar `html2canvas` sobre elementos escalados mediante CSS (`transform: scale()`), es obligatorio utilizar el callback `onclone` para **restablecer las transformaciones y márgenes** en el DOM clonado; esto asegura que la imagen se capture en alta resolución.
- **Responsividad de Ancho Fijo:** La adaptación en móviles para contenidos de ancho fijo (como tarjetas de imagen generadas) se implementa usando JavaScript aplicando `transform: scale()` para ajustar el contenido al tamaño de la pantalla ("zoom out"), preservando su layout original para la generación de la imagen.
- **Verificación UI (Playwright):** Las modificaciones del frontend UI requieren verificación visual local. Esto se puede lograr utilizando scripts de Playwright para tomar capturas de pantalla del servidor local antes de hacer commits o someter cambios.
