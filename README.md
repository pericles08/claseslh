# Laboratorio de Hardware de Redes

Sitio estático en español, preparado para funcionar localmente y en GitHub Pages. No requiere instalación de paquetes, compilación ni un servidor de aplicación.

## Ejecutar

Para consultar el material, abrir `index.html` en el navegador.

Para trabajar con un origen local estable y probar las funciones del navegador, ejecutar desde esta carpeta, con Python instalado:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Abrir <http://127.0.0.1:8765/>. Detener el servidor con `Ctrl+C`. Mantener esta dirección y este puerto durante el trabajo local para conservar el acceso a las respuestas guardadas.

El sitio no necesita Internet para cargar las clases, los estilos ni las actividades. Solo los enlaces externos de bibliografía requieren conexión.

## Publicación en GitHub Pages

Conservar `index.html`, `style.css` y `script.js` en la raíz del sitio, junto con las carpetas `clases/` y `assets/`. Los enlaces relativos permiten usar la misma estructura tanto localmente como dentro de la ruta de un repositorio publicado. El archivo `.nojekyll` indica que los archivos se sirven sin procesamiento de plantillas.

GitHub Pages utiliza la raíz de la rama `main`. Los cambios se publican después de confirmarlos y enviarlos al repositorio. No guardar credenciales ni respuestas de estudiantes en el repositorio. Exportar las respuestas locales antes de pasar al sitio online, porque el almacenamiento del navegador no se comparte entre ambas direcciones.

## Organización

- `index.html`: entrada y enlaces a las clases 5 a 13.
- `clases/claseN.html`: contenido, estructura semántica y geometría de los diagramas SVG.
- `style.css`: única hoja de estilos; incluye componentes, diagramas, adaptación móvil, accesibilidad e impresión.
- `script.js`: búsqueda, progreso, respuestas, exportación, copia de comandos e impresión de las clases interactivas.
- `assets/clase13/`: fotografías locales de los dispositivos de red; conservar esta carpeta al publicar el sitio.

Los HTML enlazan el CSS y el JavaScript mediante rutas relativas. No agregar bloques `<style>`, atributos `style`, JavaScript embebido ni dependencias externas para cambios de presentación. Los atributos geométricos de SVG (coordenadas, tamaños y trazados) permanecen en el HTML; su presentación se define en el CSS.

Las variables principales de color están al inicio de `style.css`. Los nombres usados por las clases 8–10 remiten a la misma paleta. Al agregar una clase interactiva, usar identificadores únicos y agregar su configuración al objeto `settings` en `script.js`.

## Respuestas y privacidad

Las respuestas se guardan únicamente en el navegador, mediante `localStorage`; no se envían a un servidor. Las claves anteriores se conservan. El almacenamiento pertenece al origen: cambiar de dominio, puerto, navegador o perfil no transfiere las respuestas existentes. Exportarlas antes de una migración. El comportamiento de almacenamiento al abrir archivos directamente puede variar entre navegadores.

Si el almacenamiento está bloqueado o sin espacio, la página avisa y permite seguir editando y exportando. Reiniciar solo elimina las respuestas y el progreso de la clase actual. La copia al portapapeles depende de los permisos del navegador y del contexto seguro; si falla, selecciona el texto para copiarlo manualmente.

## Alcance de esta revisión técnica

Se conservaron los textos didácticos de los nueve HTML y se comprobaron contra los originales. Toda la navegación utiliza archivos HTML locales; no hay plantillas de servidor ni dependencias de servicios externos para ejecutar el sitio.

La clase 12 se recuperó del archivo completo proporcionado por el docente y se integró al sitio local con sus 24 secciones, ejercicios y soluciones. Utiliza los estilos y el comportamiento compartidos, conserva sus claves de almacenamiento y cuenta con navegación al índice y botón flotante para volver arriba.

La clase 13 se integró desde el adjunto del docente con 17 secciones y 14 actividades, sin modificar el texto didáctico. Sus fotografías se guardaron localmente y sus componentes visuales se incorporaron a `style.css`. Incluye búsqueda, progreso, exportación y navegación al inicio. Las instrucciones de Windows y Packet Tracer son material de estudio: no se ejecutan desde la web.

Fotografías de la clase 13 (se conservan las atribuciones del material recibido):

- [Hub Netgear, Plugwash, dominio público](https://commons.wikimedia.org/wiki/File:4_port_netgear_ethernet_hub.jpg).
- [Switch, JBequio, CC BY 4.0](https://commons.wikimedia.org/wiki/File:Network_Device_%28Switch%29.jpg).
- [Router Cisco 1900, Maraguache, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Router_Cisco_1900_series.jpg).

Verificado: una hoja CSS por página, ausencia de estilos embebidos, etiquetas cerradas, identificadores únicos, enlaces locales y anclas existentes, sintaxis JavaScript, y ausencia de desbordamiento horizontal en las ocho clases a anchos de 390 y 1280 píxeles. Se probó en el navegador búsqueda sin resultados, regreso a secciones filtradas, progreso, conservación de respuestas tras recargar y descarga del TXT. La impresión se ajustó en código; no se realizó una impresión física.
