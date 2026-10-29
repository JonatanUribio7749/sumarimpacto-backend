const mongoose = require("mongoose");

const gastoSchema = new mongoose.Schema(
  {
    proyecto_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proyecto",
      required: true,
    },
    concepto: { type: String, required: true, trim: true },
    monto: { type: Number, required: true, min: 1 },
    fecha: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Gasto", gastoSchema, "gastos");