# Roselle · Landing de producto

Primera versión para `roselle-crema/roselle-horizon-theme`, rama `main`. El repositorio está conectado al theme borrador indicado por la marca. Esta implementación no ejecuta ninguna acción de publicación en Shopify.

## Referencia y decisiones

Se analizaron la [portada de Altier](https://altierbeauty.com/) y su [página de crema corporal](https://altierbeauty.com/products/crema-anti), además de observar la portada en un ancho mobile.

La portada prioriza una promesa amplia y un CTA hacia catálogo. Alterna bloques claros y oscuros, fotos de personas, testimonios, comparaciones y beneficios comerciales. La prueba social aparece pronto y se repite cerca de las decisiones de compra. En mobile, el contenido pasa a una columna con botones amplios. La densidad de mensajes comerciales y carruseles compite en algunos puntos con la lectura del beneficio principal.

La página de producto desarrolla un recorrido más largo: oferta por cantidades y compra, problema, experiencias, explicaciones y evidencia presentada por la marca, confianza y preguntas frecuentes. Repite CTAs después de bloques persuasivos. El FAQ cubre fórmula, aplicación, expectativas y entrega. La oferta utiliza descuentos por cantidad, regalos y mensajes de urgencia. Estas observaciones describen la estructura; no verifican la eficacia ni los claims de esa marca.

La versión Roselle organiza un solo producto: presentación y compra → beneficios → problema empático → solución → cinco ingredientes → aplicación → textura → reseñas → confianza → FAQ → cierre. La cafeína ocupa la tarjeta principal. Los CTA regresan a una misma selección de producto para evitar variantes o cantidades contradictorias. En mobile hay un CTA temprano y una barra de compra después de pasar el formulario.

La identidad es original: tipografía serif editorial, crema cálido, rosa empolvado y bordó; sin activos gráficos, textos, nombres, reseñas o cifras de Altier. No se incorporan urgencia artificial, certificaciones, garantías de resultados ni promociones sin confirmar. La oferta toma únicamente el precio y precio comparativo reales del catálogo. La barra inicial dice “Envíos a toda Argentina”: cambiar a envío gratis solamente si la tarifa correspondiente está configurada.

## Arquitectura

- `templates/index.json`: portada con once instancias de contenido. `roselle-story` se reutiliza para problema, solución y textura.
- `sections/roselle-header.liquid` y `roselle-footer.liquid`: encabezado y pie globales. El encabezado reutiliza `header-actions` de Horizon para carrito, contador y panel nativos.
- `sections/roselle-hero.liquid`: presentación, producto seleccionado y barra de compra mobile.
- `sections/roselle-benefits.liquid`, `roselle-story.liquid`, `roselle-ingredients.liquid`, `roselle-routine.liquid`, `roselle-reviews.liquid`, `roselle-trust.liquid`, `roselle-faq.liquid`, `roselle-closing.liquid`: contenido editable con bloques donde corresponde.
- `snippets/roselle-media.liquid`: imágenes responsive y placeholders CSS sin archivos inventados.
- `snippets/roselle-purchase.liquid`: formulario `form 'product'`, variantes, cantidad y precio formateado por Shopify.
- `snippets/roselle-colors.liquid`: paleta configurable.
- `assets/roselle.css`: estilos limitados a componentes Roselle y responsive desde 320 px.
- `assets/roselle.js`: actualización de precio/variantes, reglas de cantidad y barra fija; sin librerías externas.
- `config/settings_schema.json`: grupos “Roselle” y “Roselle · Textos”.
- `sections/header-group.json`, `sections/footer-group.json` y `layout/theme.liquid`: conexión con el layout existente.

Se mantienen las plantillas de producto, carrito y checkout de Horizon. El formulario de portada usa el envío normal a Shopify y lleva al carrito nativo; no intercepta el checkout. Los productos que requieren un plan de venta, precios por volumen o un catálogo grande de variantes se derivan a su página nativa para elegir opciones. Sin JavaScript se conserva el formulario y se muestran precios en cada opción; Shopify valida disponibilidad y cantidades al recibirlo.

## Completar en Shopify

1. Abrir **Tienda online → Temas → theme borrador conectado → Personalizar**. Verificar que es el borrador de este repositorio.
2. En **Configuración del tema → Roselle**, seleccionar el producto real. Sin selección no se muestran precios inventados y la compra queda deshabilitada.
3. Cargar título, precio, inventario, variantes y medios en el producto de Shopify. Publicarlo en el canal Tienda online cuando corresponda; no se necesita publicar el theme.
4. En **Encabezado**, subir el logo y confirmar el anuncio comercial. La configuración actual no promete envío gratis.
5. Revisar textos de fórmula y uso contra la información final del envase, especialmente frecuencia y precauciones. No se inventó un tiempo de absorción ni una frecuencia exacta.
6. En **Reseñas**, mantener los placeholders o cargar testimonios reales con autorización. Desactivar “Mostrar como placeholder” solamente después de ingresar la reseña y el nombre. Se puede ocultar la sección hasta tener contenido.
7. En **Confianza** y **Pie**, agregar el enlace de atención y menú de contacto. Completar políticas en Shopify; el pie muestra automáticamente las que tienen contenido.
8. Configurar tarifas y cobertura de envío, medios de pago y políticas en la administración de Shopify. La landing no crea tarifas, descuentos ni métodos de pago.
9. Los textos operativos, etiquetas de placeholders y mensajes sin stock también se editan en **Configuración del tema → Roselle · Textos**. El contenido inicial está en español argentino.

## Imágenes pendientes

- Logo: SVG o PNG transparente, aproximadamente 360 px de ancho o más.
- Producto principal: foto real, idealmente 1600 × 1800 px, fondo limpio. Se puede seleccionar en Presentación; si se omite, usa la imagen destacada del producto.
- Problema/uso: fotos propias de cuidado corporal o aplicación, aproximadamente 1400 × 1200 px; para Modo de uso, una imagen vertical de 1200 × 1400 px.
- Solución y cierre: fotografías adicionales de producto. El cierre puede reutilizar la imagen destacada.
- Ingredientes: hasta cinco imágenes propias, una por bloque. Cafeína tiene mayor superficie visible.
- Textura: macro real de la crema blanca, aproximadamente 1400 × 1200 px.
- Reseñas: fotos autorizadas opcionales. No se incluyen imágenes ni reseñas de terceros.

Los placeholders son ilustraciones CSS rotuladas; no representan el envase final ni una fotografía del producto. Subir imágenes reales sustituye automáticamente la ilustración correspondiente. La imagen del hero carga con prioridad; las demás cargan de forma diferida.

## Previsualización y verificación

Una vez sincronizado `main`, usar **Vista previa** en el menú del theme borrador. No pulsar **Publicar**. En el editor revisar las vistas desktop y mobile.

Validación local: Theme Check oficial de Shopify, sintaxis JavaScript, estructura de JSON/schema, renderizado Liquid de las secciones con datos de prueba y revisión responsive. Los datos ficticios de producto usados en esas pruebas no están incluidos en el theme.

Theme Check: cero errores y ninguna observación en los archivos de Roselle. El Horizon original conserva seis advertencias: una de cantidad de ajustes en `sections/header.liquid` y cinco de parámetros documentados sin uso en `snippets/divider.liquid`.

La vista local verifica la composición y el formulario, pero no sustituye la ejecución del servidor de Shopify. Pendiente con acceso a la tienda: confirmar sincronización del borrador y probar un agregado al carrito con el producto real, cambio de variante, cantidad, stock, costo de envío y paso al checkout. No es necesario completar ni pagar un pedido para revisar el recorrido.

Para volver a la portada anterior, revertir el commit de esta implementación en GitHub. No restaurar archivos de configuración a ciegas después de haber hecho cambios posteriores en el editor de Shopify.
