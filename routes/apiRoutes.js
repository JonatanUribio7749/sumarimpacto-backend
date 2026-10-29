const router = require("express").Router();
const impactoController = require("../controllers/impactoController");

// Rutas para consultar y registrar entidades base.
router.get("/donantes", impactoController.listarDonantes);
router.post("/donantes", impactoController.crearDonante);
router.get("/organizaciones", impactoController.listarOrganizaciones);
router.post("/organizaciones", impactoController.crearOrganizacion);

// CRUD de proyectos y consultas de sus movimientos y saldo.
router.get("/proyectos", impactoController.listarProyectos);
router.post("/proyectos", impactoController.crearProyecto);
router.get("/proyectos/:id/saldo", impactoController.consultarSaldo);
router.get(
  "/proyectos/:id/donaciones",
  impactoController.listarDonacionesProyecto,
);
router.get("/proyectos/:id/gastos", impactoController.listarGastosProyecto);
router.get("/proyectos/:id", impactoController.obtenerProyecto);
router.put("/proyectos/:id", impactoController.actualizarProyecto);
router.delete("/proyectos/:id", impactoController.eliminarProyecto);

// Rutas para registrar movimientos financieros.
router.post("/donaciones", impactoController.registrarDonacion);
router.put("/donaciones/:id", impactoController.actualizarDonacion);
router.post("/gastos", impactoController.registrarGasto);

module.exports = router;
