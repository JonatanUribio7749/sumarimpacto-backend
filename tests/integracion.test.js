const assert = require("node:assert/strict");
const test = require("node:test");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const app = require("../app");
const connectDB = require("../config/db");

test("API MongoDB conserva reglas, relaciones y respuestas HTTP", async (t) => {
  const mongo = await MongoMemoryServer.create({
    instance: { launchTimeout: 60000 },
  });
  t.after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });
  const originalUri = process.env.MONGODB_URI;
  process.env.MONGODB_URI = mongo.getUri();
  try {
    await connectDB();
  } finally {
    if (originalUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalUri;
  }

  let response = await request(app).get("/");
  assert.equal(response.status, 200);
  assert.match(response.text, /Proyectos sociales/);

  response = await request(app).post("/api/organizaciones").send({
    nombre: "Asociación",
    descripcion: "Organización comunitaria",
    contacto: "contacto@example.org",
  });
  assert.equal(response.status, 201);
  const organizacion = response.body;
  assert.ok(organizacion._id);
  assert.ok(organizacion.createdAt);

  response = await request(app).get("/api/organizaciones");
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);
  assert.ok(response.body[0]._id);

  response = await request(app).post("/api/donantes").send({
    nombre: "Donante",
    email: "d@example.org",
    telefono: "+54 11 1234-5678",
  });
  assert.equal(response.status, 201);
  const donante = response.body;
  assert.equal(donante.email, "d@example.org");
  assert.ok(donante.updatedAt);

  response = await request(app).get("/api/donantes");
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);

  response = await request(app).post("/api/proyectos").send({
    nombre: "Huerta comunitaria",
    descripcion: "Producción de alimentos",
    organizacion_id: organizacion._id,
    objetivo_monto: 20000,
  });
  assert.equal(response.status, 201);
  const proyecto = response.body;
  assert.equal(proyecto.organizacion_id, organizacion._id);
  assert.equal(proyecto.objetivo_monto, 20000);

  response = await request(app).post("/api/proyectos").send({
    nombre: "Proyecto inválido",
    descripcion: "Sin organización existente",
    organizacion_id: new mongoose.Types.ObjectId().toString(),
  });
  assert.equal(response.status, 404);

  response = await request(app).post("/api/proyectos").send({
    nombre: "Proyecto malformado",
    descripcion: "ID inválido",
    organizacion_id: "id-invalido",
  });
  assert.equal(response.status, 400);

  response = await request(app).post("/api/proyectos").send({ nombre: "Incompleto" });
  assert.equal(response.status, 400);

  response = await request(app).get(`/api/proyectos/${proyecto._id}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.nombre, "Huerta comunitaria");

  response = await request(app)
    .get(`/api/proyectos/${new mongoose.Types.ObjectId()}`);
  assert.equal(response.status, 404);

  response = await request(app).get("/api/proyectos/id-malformado");
  assert.equal(response.status, 400);

  response = await request(app).get(`/api/proyectos?organizacion_id=${organizacion._id}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);

  response = await request(app).post("/api/donaciones").send({ donante_id: donante._id, monto: 50 });
  assert.equal(response.status, 201);
  assert.equal(response.body.proyecto_id, undefined);
  response = await request(app).post("/api/gastos").send({ concepto: "Sin proyecto", monto: 1 });
  assert.equal(response.status, 400);

  response = await request(app).post("/api/donaciones").send({
    donante_id: donante._id,
    proyecto_id: proyecto._id,
    monto: 10000,
  });
  assert.equal(response.status, 201);
  const donacion = response.body;
  assert.ok(donacion.fecha);

  response = await request(app).get(`/api/proyectos/${proyecto._id}/saldo`);
  assert.equal(response.status, 200);
  assert.equal(response.body.total_donado, 10000);
  assert.equal(response.body.total_gastado, 0);
  assert.equal(response.body.saldo_disponible, 10000);

  response = await request(app).post("/api/gastos").send({
    proyecto_id: proyecto._id,
    concepto: "Materiales",
    monto: 4000,
  });
  assert.equal(response.status, 201);

  response = await request(app).get(`/api/proyectos/${proyecto._id}/saldo`);
  assert.equal(response.body.total_donado, 10000);
  assert.equal(response.body.total_gastado, 4000);
  assert.equal(response.body.saldo_disponible, 6000);

  response = await request(app).post("/api/gastos").send({
    proyecto_id: proyecto._id,
    concepto: "Gasto excesivo",
    monto: 7000,
  });
  assert.equal(response.status, 400);
  assert.match(response.body.mensaje, /supera el saldo disponible/);

  response = await request(app).get(`/api/proyectos/${proyecto._id}/saldo`);
  assert.equal(response.body.saldo_disponible, 6000);

  response = await request(app).put(`/api/donaciones/${donacion._id}`).send({
    donante_id: donante._id,
    proyecto_id: proyecto._id,
    monto: 11000,
  });
  assert.equal(response.status, 400);
  assert.match(response.body.mensaje, /ya registró gastos/);

  const otroProyecto = await request(app).post("/api/proyectos").send({
    nombre: "Taller comunitario",
    descripcion: "Proyecto sin gastos",
    organizacion_id: organizacion._id,
  });
  assert.equal(otroProyecto.status, 201);

  const donacionSecundaria = await request(app).post("/api/donaciones").send({
    donante_id: donante._id,
    proyecto_id: otroProyecto.body._id,
    monto: 1000,
  });
  assert.equal(donacionSecundaria.status, 201);

  response = await request(app)
    .put(`/api/donaciones/${donacionSecundaria.body._id}`)
    .send({
      donante_id: donante._id,
      proyecto_id: otroProyecto.body._id,
      monto: 1500,
    });
  assert.equal(response.status, 200);
  assert.equal(response.body.monto, 1500);

  response = await request(app).put(`/api/proyectos/${otroProyecto.body._id}`)
    .send({ $set: { organizacion_id: new mongoose.Types.ObjectId().toString() } });
  assert.equal(response.status, 400);
  response = await request(app).put(`/api/donaciones/${donacionSecundaria.body._id}`)
    .send({ $set: { donante_id: new mongoose.Types.ObjectId().toString() } });
  assert.equal(response.status, 400);

  response = await request(app).delete(`/api/proyectos/${proyecto._id}`);
  assert.equal(response.status, 400);

  response = await request(app).delete(`/api/proyectos/${otroProyecto.body._id}`);
  assert.equal(response.status, 400);

  response = await request(app)
    .get(`/api/proyectos/${proyecto._id}/donaciones`);
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);

  response = await request(app).get(`/api/proyectos/${proyecto._id}/gastos`);
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);

  const proyectoVacio = await request(app).post("/api/proyectos").send({
    nombre: "Proyecto sin movimientos",
    descripcion: "Puede eliminarse",
    organizacion_id: organizacion._id,
  });
  response = await request(app).delete(`/api/proyectos/${proyectoVacio.body._id}`);
  assert.equal(response.status, 200);

  response = await request(app).post("/api/donantes").send({
    nombre: "Email inválido",
    email: "no-es-email",
  });
  assert.equal(response.status, 400);

  assert.match(response.body.mensaje, /email.*formato inválido/);

  // Dos gastos simultáneos no pueden consumir más de los 100 disponibles.
  const proyectoConcurrente = await request(app).post("/api/proyectos").send({
    nombre: "Concurrencia", descripcion: "Prueba", organizacion_id: organizacion._id,
  });
  await request(app).post("/api/donaciones").send({
    donante_id: donante._id, proyecto_id: proyectoConcurrente.body._id, monto: 100,
  });
  const gastosSimultaneos = await Promise.all([1, 2].map(() =>
    request(app).post("/api/gastos").send({
      proyecto_id: proyectoConcurrente.body._id, concepto: "Prueba", monto: 70,
    })
  ));
  assert.deepEqual(gastosSimultaneos.map(r => r.status).sort(), [201, 400]);
  response = await request(app).get(`/api/proyectos/${proyectoConcurrente.body._id}/saldo`);
  assert.equal(response.body.saldo_disponible, 30);

  response = await request(app).get("/api/ruta-inexistente");
  assert.equal(response.status, 404);
});