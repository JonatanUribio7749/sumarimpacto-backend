const mongoose = require("mongoose");

const proyectoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    organizacion_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizacion",
      required: true,
    },
    objetivo_monto: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Proyecto", proyectoSchema, "proyectos");