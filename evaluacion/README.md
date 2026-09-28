# Evaluación LH — 28/09/2026

Entrada pública: `index.html`. La aplicación real se ejecuta en Google Apps Script y mantiene los intentos en Script Properties. GitHub Pages no controla identidades, horarios ni intentos por sí solo.

## Material y criterios

M1: clases 1–4 públicas de Drive; M2: clases 5–7; M3: clases 8–11; M4: clases 12–15. Se excluyen libros y guías de apoyo. El banco privado contiene una fuente por pregunta, variantes de respuestas cortas y retroalimentación. Hay 30, 30, 50 y 48 preguntas, respectivamente. Duraciones: 35, 35, 55 y 55 minutos (180 minutos totales dentro de 240 disponibles).

Apertura 2026-09-28 18:00, cierre 22:00, America/Argentina/Buenos_Aires. Fechas ISO con UTC−3 en la configuración privada. Todas las preguntas valen un punto. Aprobación exacta sin redondear: al menos 70 % por módulo **y** 70 % de los 158 puntos totales. Mínimos: 21/30, 21/30, 35/50, 34/48; global 111/158. Un módulo desaprobado impide el aprobado integral aunque el porcentaje global alcance 70 %. Se permite continuar y desbloquear el práctico al entregar los cuatro módulos.

## Instalación

1. El archivo JSON privado contiene `id`, `opens`, `closes`, `students` (SHA-256 del código normalizado → nombre), `parts`, `practical` y `html`. No se guarda en Git. El HTML se obtiene incorporando `exam.css` y `exam.js` dentro de `app.html` para HtmlService. El banco y los hashes no deben compartirse con alumnos.
2. Crear un proyecto Apps Script del docente con `servidor.gs`. Configurar la propiedad de script `DATA_FILE_ID` con el ID del JSON privado, accesible por esa misma cuenta.
3. Implementar como aplicación web, ejecutada como el docente y accesible a los estudiantes. Autorizar el acceso de Drive del proyecto. El control de acceso de la evaluación se realiza con códigos; la app nunca entrega la nómina ni los hashes al cliente.
4. Probar la URL `/exec` y guardarla en `config.js`. Un valor vacío mantiene explícitamente el acceso pendiente; no existe modo alternativo que simule seguridad local.
5. Ejecutar `node --test evaluacion/tests/servidor.test.cjs` para verificar el motor sin tocar intentos reales. Las pruebas de integración deben usar un proyecto/configuración separados, nunca códigos de estudiantes.

## Operación docente

Los códigos ya generados no deben regenerarse. La lista de entrega y la revisión docente están en Drive como archivos privados. El archivo de revisión contiene claves: no compartirlo con estudiantes.

Para ajustar la duración antes del examen, editar `parts[i].minutes` en la configuración privada. El plazo de una parte se fija al comenzar: cambios posteriores no modifican intentos en curso. Mantener el ID estable; cambiarlo crea otro conjunto de intentos. No sobrescribir el banco después de iniciar el examen, porque la corrección utiliza ese banco.

Para obtener un informe, ejecutar `informeDocente_` desde el editor del proyecto. Crea un TXT privado en Drive con porcentajes, estado por módulo y estado integral; el enlace aparece en el registro de ejecución. Esa función no es invocable desde `google.script.run` por terminar en `_`.

## Garantías y límites

- Servidor: apertura, cierre general, secuencia, un intento por parte, fecha límite persistida, corrección, bloqueo de cambios posteriores y desbloqueo del práctico. LockService serializa mutaciones; una revisión detecta escrituras desactualizadas de otra pestaña.
- La expiración es lógica e inmediata al vencer el plazo: en la próxima solicitud se materializa la entrega con esa fecha. No depende de que el navegador siga abierto. Un informe docente también materializa expiraciones.
- Se guarda tras editar y periódicamente. Solo se califican respuestas que llegaron al servidor antes del plazo. Una caída de Internet deja copia local, recuperable si se sincroniza antes del vencimiento. No es posible acreditar de forma confiable respuestas enviadas tarde mediante un reloj del cliente.
- Un código identifica un registro, pero puede compartirse: no verifica la identidad física. No existe un segundo intento al cambiar de navegador.
- Copiar/pegar y menú contextual se bloquean solo en preguntas. Son medidas disuasorias. HTML no garantiza impedir capturas de pantalla. No se bloquean atajos globales, zoom, navegación ni accesibilidad.
- Resultados y respuestas se guardan en el proyecto privado de Apps Script. No hay datos de estudiantes en el repositorio público. Drive y Apps Script deben mantener acceso docente.
- La URL de la consigna no es pública: el servidor entrega su contenido únicamente al completar las cuatro partes. El trabajo práctico se presenta en Classroom; esta aplicación no envía ni califica archivos `.pkt`.

Documentación de despliegue: https://developers.google.com/apps-script/guides/web
