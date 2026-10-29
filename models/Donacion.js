const mongoose = require("mongoose");

const donacionSchema = new mongoose.Schema(
  {
    donante_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Donante",
      required: true,
    },
    proyecto_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proyecto",
    },
    monto: { type: Number, required: true, min: 1 },
    fecha: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Donacion", donacionSchema, "donaciones");