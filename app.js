require("dotenv").config();

const express = require("express");
const path = require("path");
const Proyecto = require("./models/Proyecto");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.use(require("./middleware/registrarPeticion"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.get("/", async (req, res, next) => {
  try {
    const proyectos = await Proyecto.find();
    return res.render("index", { proyectos });
  } catch (error) {
    return next(error);
  }
});
app.use("/api", require("./routes/apiRoutes"));
app.use((req, res) =>
  req.path === "/api" || req.path.startsWith("/api/")
    ? res.status(404).json({ mensaje: "Ruta no encontrada" })
    : res.status(404).send("Página no encontrada"),
);
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const estado =
    err.name === "CastError" || err.name === "ValidationError"
      ? 400
      : [400, 404].includes(err.status)
        ? err.status
        : 500;
  if (estado === 500) console.error(err);
  let mensaje;
  if (estado === 500) mensaje = "Error interno del servidor";
  else if (err.name === "CastError") mensaje = `Valor inválido para ${err.path}`;
  else if (err.name === "ValidationError") {
    mensaje = Object.values(err.errors).map((detalle) => {
      if (detalle.kind === "required") return `El campo ${detalle.path} es obligatorio`;
      if (detalle.kind === "regexp") return `El campo ${detalle.path} tiene un formato inválido`;
      if (detalle.kind === "min") return `El campo ${detalle.path} debe ser mayor o igual a ${detalle.properties.min}`;
      if (detalle.name === "CastError") return `Valor inválido para ${detalle.path}`;
      return `Valor inválido para ${detalle.path}`;
    }).join("; ");
  } else if (err.type === "entity.parse.failed") mensaje = "JSON inválido";
  else mensaje = err.message || "Datos inválidos";
  return req.path === "/api" || req.path.startsWith("/api/")
    ? res.status(estado).json({ mensaje })
    : res.status(estado).send(mensaje);
});
if (require.main === module) {
  require("./config/db")()
    .then(() =>
      app.listen(PORT, () =>
        console.log(`Servidor corriendo en http://localhost:${PORT}`),
      ),
    )
    .catch((error) => {
      console.error("No se pudo conectar a MongoDB:", error.message);
      process.exitCode = 1;
    });
}
module.exports = app;
