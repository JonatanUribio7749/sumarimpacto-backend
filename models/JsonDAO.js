const fs = require("node:fs/promises");
const path = require("node:path");

class JsonDAO {
  // Guarda la ruta de la colección JSON administrada por este DAO.
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
  }

  // Lee y parsea la colección completa.
  async getAll() {
    const content = await fs.readFile(this.filePath, "utf8");
    return JSON.parse(content);
  }

  // Busca un registro mediante su ID.
  async getById(id) {
    const records = await this.getAll();
    return records.find((record) => record.id === id) || null;
  }

  // Agrega un registro y evita IDs duplicados.
  async save(record) {
    const records = await this.getAll();
    if (records.some((item) => item.id === record.id)) {
      const error = new Error("El registro ya existe");
      error.status = 409;
      throw error;
    }
    records.push(record);
    await this.writeAll(records);
    return record;
  }

  // Mezcla cambios con el registro existente y lo guarda.
  async update(id, changes) {
    const records = await this.getAll();
    const index = records.findIndex((record) => record.id === id);
    if (index === -1) return null;
    records[index] = { ...records[index], ...changes, id };
    await this.writeAll(records);
    return records[index];
  }

  // Elimina un registro por ID y señala si lo encontró.
  async delete(id) {
    const records = await this.getAll();
    const remaining = records.filter((record) => record.id !== id);
    if (remaining.length === records.length) return false;
    await this.writeAll(remaining);
    return true;
  }

  // Serializa y escribe la colección completa en JSON.
  async writeAll(records) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(
      this.filePath,
      `${JSON.stringify(records, null, 2)}\n`,
      "utf8",
    );
  }
}

module.exports = JsonDAO;
