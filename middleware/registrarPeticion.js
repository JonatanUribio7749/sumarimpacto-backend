// Middleware propio: permite explicar y verificar el recorrido de cada solicitud.
module.exports = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
};
