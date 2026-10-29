const mongoose = require("mongoose");

const connection = mongoose.connection;

connection.on("connected", () => console.log("MongoDB conectado"));
connection.on("error", (error) =>
  console.error("Error de conexión a MongoDB:", error.message),
);
connection.on("disconnected", () => console.log("MongoDB desconectado"));

async function connectDB(uri = process.env.MONGODB_URI) {
  return mongoose.connect(uri || "mongodb://127.0.0.1:27017/sumarimpacto");
}

module.exports = connectDB;