const Organizacion = require("../models/Organizacion");
const Donante = require("../models/Donante");
const Proyecto = require("../models/Proyecto");
const Donacion = require("../models/Donacion");
const Gasto = require("../models/Gasto");

function conErrores(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

// Una sola aplicación procesa las modificaciones financieras en orden.
// No coordina servidores Node.js distintos ni accesos directos a MongoDB.
let ultimaOperacion = Promise.resolve();
function serializar(handler) {
  return (req, res, next) => {
    const siguiente = ultimaOperacion.then(() => handler(req, res, next));
    ultimaOperacion = siguiente.catch(() => {});
    return siguiente;
  };
}

function errorHttp(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validarCamposActualizacion(body, camposPermitidos) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw errorHttp(400, "Los datos deben ser un objeto JSON");
  }
  const campos = Object.keys(body);
  if (!campos.length || campos.some((campo) => !camposPermitidos.includes(campo))) {
    throw errorHttp(400, "La actualización contiene campos no permitidos o está vacía");
  }
}

async function requerir(Model, id, entidad) {
  const documento = await Model.findById(id);
  if (!documento) throw errorHttp(404, `${entidad} no encontrado`);
  return documento;
}

async function validarReferencia(Model, id, entidad) {
  if (id !== undefined && id !== null && id !== "") {
    await requerir(Model, id, entidad);
  }
}

async function totalPorProyecto(Model, proyectoId) {
  const [resultado] = await Model.aggregate([
    { $match: { proyecto_id: proyectoId } },
    { $group: { _id: null, total: { $sum: "$monto" } } },
  ]);
  return resultado?.total || 0;
}

async function calcularSaldo(proyectoId) {
  const [totalDonado, totalGastado] = await Promise.all([
    totalPorProyecto(Donacion, proyectoId),
    totalPorProyecto(Gasto, proyectoId),
  ]);
  return {
    totalDonado,
    totalGastado,
    saldoDisponible: Math.round((totalDonado - totalGastado) * 100) / 100,
  };
}

const listarDonantes = conErrores(async (req, res) => {
  res.json(await Donante.find());
});

const crearDonante = conErrores(async (req, res) => {
  const donante = await Donante.create(req.body || {});
  res.status(201).json(donante);
});

const listarOrganizaciones = conErrores(async (req, res) => {
  res.json(await Organizacion.find());
});

const crearOrganizacion = conErrores(async (req, res) => {
  const organizacion = await Organizacion.create(req.body || {});
  res.status(201).json(organizacion);
});

const listarProyectos = conErrores(async (req, res) => {
  const filtro = {};
  if (req.query.organizacion_id !== undefined) {
    await requerir(Organizacion, req.query.organizacion_id, "Organización");
    filtro.organizacion_id = req.query.organizacion_id;
  }
  res.json(await Proyecto.find(filtro));
});

const obtenerProyecto = conErrores(async (req, res) => {
  res.json(await requerir(Proyecto, req.params.id, "Proyecto"));
});

const crearProyecto = conErrores(async (req, res) => {
  const body = req.body || {};
  await validarReferencia(Organizacion, body.organizacion_id, "Organización");
  const proyecto = await Proyecto.create(body);
  res.status(201).json(proyecto);
});

const actualizarProyecto = conErrores(async (req, res) => {
  const body = req.body || {};
  validarCamposActualizacion(body, ["nombre", "descripcion", "organizacion_id", "objetivo_monto"]);
  await validarReferencia(Organizacion, body.organizacion_id, "Organización");
  const proyecto = await Proyecto.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  });
  if (!proyecto) throw errorHttp(404, "Proyecto no encontrado");
  res.json(proyecto);
});

const eliminarProyecto = serializar(conErrores(async (req, res) => {
  await requerir(Proyecto, req.params.id, "Proyecto");
  const [donacion, gasto] = await Promise.all([
    Donacion.exists({ proyecto_id: req.params.id }),
    Gasto.exists({ proyecto_id: req.params.id }),
  ]);
  if (donacion || gasto) {
    throw errorHttp(
      400,
      "No se puede eliminar un proyecto con movimientos asociados",
    );
  }
  await Proyecto.findByIdAndDelete(req.params.id);
  res.json({ mensaje: "Proyecto eliminado" });
}));

const registrarDonacion = serializar(conErrores(async (req, res) => {
  const body = req.body || {};
  await validarReferencia(Donante, body.donante_id, "Donante");
  await validarReferencia(Proyecto, body.proyecto_id, "Proyecto");
  const donacion = await Donacion.create(body);
  res.status(201).json(donacion);
}));

const actualizarDonacion = serializar(conErrores(async (req, res) => {
  const donacionActual = await requerir(Donacion, req.params.id, "Donación");
  const hayGastos = donacionActual.proyecto_id && await Gasto.exists({
    proyecto_id: donacionActual.proyecto_id,
  });
  if (hayGastos) {
    throw errorHttp(
      400,
      "No se puede modificar la donación: el proyecto ya registró gastos",
    );
  }
  const body = req.body || {};
  validarCamposActualizacion(body, ["donante_id", "proyecto_id", "monto", "fecha"]);
  await validarReferencia(Donante, body.donante_id, "Donante");
  await validarReferencia(Proyecto, body.proyecto_id, "Proyecto");
  const donacion = await Donacion.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  });
  res.json(donacion);
}));

const registrarGasto = serializar(conErrores(async (req, res) => {
  const body = req.body || {};
  if (!body.proyecto_id) throw errorHttp(400, "El proyecto es obligatorio");
  const proyecto = await requerir(Proyecto, body.proyecto_id, "Proyecto");
  const { saldoDisponible } = await calcularSaldo(proyecto._id);
  if (Number(body.monto) > saldoDisponible) {
    throw errorHttp(
      400,
      `El gasto supera el saldo disponible (${saldoDisponible})`,
    );
  }
  const gasto = await Gasto.create({
    ...body,
    concepto: body.concepto ?? body.descripcion,
  });
  res.status(201).json(gasto);
}));

const consultarSaldo = conErrores(async (req, res) => {
  const proyecto = await requerir(Proyecto, req.params.id, "Proyecto");
  const { totalDonado, totalGastado, saldoDisponible } = await calcularSaldo(
    proyecto._id,
  );
  res.json({
    proyecto_id: proyecto._id,
    total_donado: totalDonado,
    total_gastado: totalGastado,
    saldo_disponible: saldoDisponible,
  });
});

const listarDonacionesProyecto = conErrores(async (req, res) => {
  await requerir(Proyecto, req.params.id, "Proyecto");
  res.json(await Donacion.find({ proyecto_id: req.params.id }));
});

const listarGastosProyecto = conErrores(async (req, res) => {
  await requerir(Proyecto, req.params.id, "Proyecto");
  res.json(await Gasto.find({ proyecto_id: req.params.id }));
});

module.exports = {
  listarDonantes,
  crearDonante,
  listarOrganizaciones,
  crearOrganizacion,
  listarProyectos,
  obtenerProyecto,
  crearProyecto,
  actualizarProyecto,
  eliminarProyecto,
  registrarDonacion,
  actualizarDonacion,
  registrarGasto,
  consultarSaldo,
  listarDonacionesProyecto,
  listarGastosProyecto,
};