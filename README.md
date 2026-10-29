# SumarImpacto — Segunda entrega

**Caso 5: Donaciones**  
**Materia:** Desarrollo Web Backend  
**Comisión:** 2C  
**Docente:** Emir Eliezer García Pontivero  
**Integrantes:** Damián Toledo y Jonatan Uribio

## Descripción

SumarImpacto es una aplicación backend para registrar donaciones destinadas a proyectos sociales y controlar sus gastos. Permite administrar organizaciones, donantes y proyectos, registrar donaciones y gastos, y consultar cuánto recibió, cuánto gastó y qué saldo tiene disponible cada proyecto.

La aplicación ofrece una API REST desarrollada con Node.js y Express. Utiliza MongoDB con Mongoose para la persistencia y conserva una vista básica construida con Pug para mostrar los proyectos registrados.

## Tecnologías utilizadas

- **Node.js:** entorno de ejecución de JavaScript.
- **Express:** servidor web, rutas y middleware.
- **MongoDB:** almacenamiento de los datos.
- **Mongoose:** definición de esquemas y consultas a MongoDB.
- **Pug:** generación de la vista web.
- **Thunder Client o Postman:** pruebas manuales de la API.
- **Node Test, Supertest y MongoDB Memory Server:** pruebas automatizadas de integración.

## Funcionalidades principales

- Registrar y listar organizaciones y donantes.
- Crear, consultar, modificar y eliminar proyectos, con las restricciones correspondientes.
- Registrar donaciones con un donante y, opcionalmente, un proyecto.
- Registrar gastos asociados a proyectos.
- Consultar el saldo, las donaciones y los gastos de un proyecto.
- Filtrar proyectos por organización.
- Validar datos, referencias y reglas de negocio, con respuestas HTTP y mensajes de error.
- Mostrar los proyectos en una vista básica con Pug.

## Reglas de negocio

- Toda donación debe estar asociada a un donante existente. El proyecto es opcional; una donación sin proyecto no modifica el saldo de ningún proyecto.
- Todo gasto debe estar asociado a un proyecto existente y no puede superar su saldo disponible.
- El saldo se calcula como **total de donaciones del proyecto menos total de gastos del proyecto**.
- Si un proyecto ya tiene gastos, la aplicación bloquea la modificación de todas sus donaciones. Es una interpretación conservadora: no se identifica qué donación concreta financió cada gasto.
- Un proyecto con donaciones o gastos asociados no puede eliminarse.

## Estructura del proyecto

```text
SumarImpacto_revision_corregida/
├── app.js                     # Configuración de Express y arranque
├── config/                    # Conexión a MongoDB
├── controllers/               # Lógica y reglas de negocio
├── routes/                    # Rutas de la API
├── models/                    # Esquemas y modelos Mongoose
├── middleware/                # Registro de solicitudes
├── views/                     # Plantillas Pug
├── public/                    # Archivos estáticos y estilos
├── tests/                     # Prueba automatizada de integración
├── docs/                      # Colección de solicitudes para importar
├── data/                      # Archivos JSON históricos de la primera entrega
├── .env.example               # Ejemplo de configuración
├── package.json               # Dependencias y comandos
└── package-lock.json          # Versiones exactas de las dependencias
```

Los archivos de `data/` son históricos: la aplicación actual no los usa como base activa ni los importa automáticamente. La clase `JsonDAO` también pertenece a esa etapa y no participa en el funcionamiento actual.

## Requisitos

- Node.js 20 o superior y npm.
- MongoDB instalado y en ejecución, o una conexión MongoDB configurada.
- Thunder Client o Postman para ejecutar las pruebas manuales.

## Instalación y ejecución

1. Abrí una terminal en la carpeta que contiene `package.json`.
2. Instalá las dependencias:

   ```bash
   npm ci
   ```

3. Creá un archivo `.env` a partir de `.env.example`. En PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Para la configuración local incluida, el archivo contiene:

   ```env
   PORT=3001
   MONGODB_URI=mongodb://127.0.0.1:27017/sumarimpacto_revision
   ```

   Si utilizás otra instalación, ajustá esos valores según tu entorno. El archivo `.env` puede contener credenciales: no debe publicarse ni subirse al repositorio.

5. Comprobá que MongoDB esté funcionando e iniciá la aplicación:

   ```bash
   npm start
   ```

6. Abrí [http://localhost:3001](http://localhost:3001). La API está disponible bajo el prefijo `/api`.

Para detener el servidor, presioná `Ctrl + C` en la terminal donde está ejecutándose.

## Rutas principales de la API

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/organizaciones` | Listar organizaciones. |
| POST | `/api/organizaciones` | Crear una organización. |
| GET | `/api/donantes` | Listar donantes. |
| POST | `/api/donantes` | Crear un donante. |
| GET | `/api/proyectos` | Listar proyectos. Admite el filtro `?organizacion_id=ID`. |
| POST | `/api/proyectos` | Crear un proyecto. |
| GET | `/api/proyectos/:id` | Consultar un proyecto por su identificador. |
| PUT | `/api/proyectos/:id` | Modificar un proyecto. |
| DELETE | `/api/proyectos/:id` | Eliminar un proyecto sin movimientos asociados. |
| GET | `/api/proyectos/:id/saldo` | Consultar donaciones, gastos y saldo disponible. |
| GET | `/api/proyectos/:id/donaciones` | Consultar las donaciones del proyecto. |
| GET | `/api/proyectos/:id/gastos` | Consultar los gastos del proyecto. |
| POST | `/api/donaciones` | Registrar una donación. |
| PUT | `/api/donaciones/:id` | Modificar una donación permitida por las reglas del proyecto. |
| POST | `/api/gastos` | Registrar un gasto. |

Los identificadores utilizados en las rutas y relaciones son **ObjectId** de MongoDB. En las solicitudes con datos se debe enviar un cuerpo JSON.

### Ejemplo: registrar una organización

**Solicitud:** `POST /api/organizaciones`

```json
{
  "nombre": "Organización comunitaria",
  "descripcion": "Apoyo a proyectos sociales",
  "contacto": "contacto@example.org"
}
```

Si los datos son válidos, la respuesta es `201 Created` e incluye el registro creado y su `_id`. Ese identificador puede utilizarse en el campo `organizacion_id` al crear un proyecto.

### Ejemplo: consultar un saldo

**Solicitud:** `GET /api/proyectos/ID_DEL_PROYECTO/saldo`

Si un proyecto recibió 50 y registró gastos por 30, la respuesta incluye:

```json
{
  "proyecto_id": "ID_DEL_PROYECTO",
  "total_donado": 50,
  "total_gastado": 30,
  "saldo_disponible": 20
}
```

El identificador mostrado es ilustrativo; debe reemplazarse por el `_id` real del proyecto.

## Pruebas

### Pruebas manuales

Se puede importar `docs/SumarImpacto_Postman.json` en Thunder Client o Postman. La colección utiliza `localhost:3001`.

1. Crear una organización y un donante; copiar sus identificadores `_id`.
2. Crear un proyecto asociado a la organización y copiar su `_id`.
3. Registrar una donación de 50 para el proyecto.
4. Registrar un gasto válido de 30.
5. Consultar el saldo: se esperan 50 donados, 30 gastados y 20 disponibles.
6. Intentar registrar un gasto de 25: se espera `400 Bad Request`, ya que supera el saldo disponible.
7. Consultar las donaciones y los gastos del proyecto.

Los marcadores de la colección deben reemplazarse por los identificadores reales obtenidos en las respuestas. Las solicitudes `POST` crean registros: si se envían varias veces, los totales pueden cambiar. Para la entrega se deben conservar capturas reales que muestren el método, la dirección, los datos enviados y la respuesta.

### Prueba automatizada

Desde la carpeta del proyecto, ejecutar:

```bash
npm test
```

La prueba de integración utiliza una instancia temporal de MongoDB y comprueba, entre otros casos, referencias, validaciones, saldo, gastos y dos solicitudes simultáneas dentro de una instancia de la aplicación. La primera ejecución puede requerir descargar un binario de MongoDB. La prueba no utiliza la base local de trabajo.

## Respuestas HTTP

- **200 OK:** consulta, modificación o eliminación realizada correctamente.
- **201 Created:** registro creado correctamente.
- **400 Bad Request:** datos inválidos o incumplimiento de una regla de negocio.
- **404 Not Found:** ruta o registro inexistente.
- **500 Internal Server Error:** error interno del servidor.

## Alcance y limitaciones

Las operaciones que modifican movimientos y eliminan proyectos se procesan en orden dentro de **una sola instancia** de Node.js. Esta protección no coordina varios servidores ni escrituras realizadas directamente en MongoDB. El proyecto tiene un alcance académico y no está preparado para gestionar fondos reales.

La aplicación utiliza modelos y documentos de Mongoose. La clase propia `JsonDAO` quedó como referencia de la primera entrega y no se utiliza en la versión actual.


## Enlaces de la entrega

- **Repositorio de GitHub:** https://github.com/JonatanUribio7749/sumarimpacto-backend.git
- **Carpeta de Google Drive:** https://drive.google.com/drive/folders/1Eo4X1210gfa6nexCMV-3yM_HyxGljfI8?usp=drive_link
- **Video explicativo:** https://drive.google.com/file/d/1NSZr-RGTwqtt5k_fmeVYIcf_Xm6VrTkj/view?usp=drive_link




