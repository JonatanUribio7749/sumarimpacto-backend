const mongoose = require("mongoose");

const organizacionSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    contacto: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "Organizacion",
  organizacionSchema,
  "organizaciones",
);