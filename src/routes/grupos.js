const express = require("express");
const Grupo = require("../models/Grupo");
const Miembro = require("../models/Miembro");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware"); // Importa el middleware

// Obtener todos los grupos
// Obtener todos los grupos con sus miembros
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Consultamos los grupos, incluyendo los miembros
    const grupos = await Grupo.findAll({
      where: { uuid: userId }, // Filtramos por el UUID del usuario
      include: [
        {
          model: Miembro,
          as: "miembros", // Relación que has definido en el modelo Grupo
          attributes: ["id", "nombre", "telefono"], // Seleccionamos solo los campos que necesitas
        },
      ],
    });

    if (grupos.length === 0) {
      return res
        .status(404)
        .json({ message: "No se encontraron grupos registrados" });
    }

    // Transformamos la respuesta para que tenga el formato esperado
    const gruposData = grupos.map((grupo) => ({
      id: grupo.id,
      nombre: grupo.nombre,
      miembros: grupo.miembros.map((miembro) => ({
        id: miembro.id,
        nombre: miembro.nombre,
        telefono: miembro.telefono,
      })),
    }));

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).json(gruposData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo los grupos" });
  }
});

// Crear un nuevo grupo
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { nombre } = req.body;
    const userId = req.user.id;

    const grupo = await Grupo.create({ nombre, uuid: userId });
    res.status(201).json({ status: true, grupo });
  } catch (error) {
    res.status(500).json({ status: false, message: "Error creando grupo" });
  }
});

// Actualizar un grupo
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;
    const userId = req.user.id;
    const updated = await Grupo.update(
      { nombre },
      { where: { id, uuid: userId } }
    );
    console.log(updated);
    if (updated === 0) {
      return res
        .status(404)
        .json({ message: "Grupo no encontrado o no pertenece al usuario" });
    }

    // Busca el grupo actualizado con el id y uuid del usuario
    const grupo = await Grupo.findOne({
      where: { id, uuid: userId },
      include: [
        {
          model: Miembro,
          as: "miembros",
          attributes: ["id", "nombre", "telefono"],
        },
      ],
    });

    if (!grupo) {
      return res
        .status(404)
        .json({ message: "Grupo no encontrado después de actualizar" });
    }

    // Estructura de respuesta
    const grupoData = {
      id: grupo.id,
      nombre: grupo.nombre,
      miembros: grupo.miembros.map((miembro) => ({
        id: miembro.id,
        nombre: miembro.nombre,
        telefono: miembro.telefono,
      })),
    };

    res.json(grupoData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error actualizando grupo" });
  }
});

// Eliminar un grupo
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await Grupo.destroy({ where: { id, uuid: userId } });
    res.status(204).json({ message: "Eliminado con éxito" });
  } catch (error) {
    res.status(500).json({ message: "Error eliminando grupo" });
  }
});

// Miembros CRUD

// Agregar un miembro a un grupo
router.post("/:grupoId/miembros", authenticateToken, async (req, res) => {
  try {
    const { grupoId } = req.params;
    const { nombre, telefono } = req.body;
    const userId = req.user.id;

    const grupo = await Grupo.findOne({ where: { id: grupoId, uuid: userId } });

    if (!grupo) {
      return res
        .status(404)
        .json({ message: "Grupo no encontrado o no pertenece al usuario" });
    }

    const miembro = await Miembro.create({ nombre, telefono, grupoId, uuid: userId });
    res.status(201).json(miembro);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error agregando miembro" });
  }
});

// Actualizar un miembro
router.put(
  "/:grupoId/miembros/:miembroId",
  authenticateToken,
  async (req, res) => {
    try {
      const { grupoId, miembroId } = req.params;
      const { nombre, telefono } = req.body;
      const userId = req.user.id;

      const grupo = await Grupo.findOne({
        where: { id: grupoId, uuid: userId },
      });

      if (!grupo) {
        return res
          .status(404)
          .json({ message: "Grupo no encontrado o no pertenece al usuario" });
      }

      const miembro = await Miembro.update(
        { nombre, telefono },
        { where: { id: miembroId, uuid: userId } }
      );

      if (!miembro[0]) {
        return res.status(404).json({ message: "Miembro no encontrado" });
      }

      res.status(200).json({ message: "Miembro actualizado con éxito" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error actualizando miembro" });
    }
  }
);

// Eliminar un miembro
router.delete(
  "/:grupoId/miembros/:miembroId",
  authenticateToken,
  async (req, res) => {
    try {
      const { grupoId, miembroId } = req.params;
      const userId = req.user.id;

      const grupo = await Grupo.findOne({
        where: { id: grupoId, uuid: userId },
      });

      if (!grupo) {
        return res
          .status(404)
          .json({ message: "Grupo no encontrado o no pertenece al usuario" });
      }

      await Miembro.destroy({ where: { id: miembroId, grupoId } });
      res.status(204).json({ message: "Miembro eliminado con éxito" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error eliminando miembro" });
    }
  }
);


// Importar miembros en masa
router.post("/:grupoId/miembros/bulk", authenticateToken, async (req, res) => {
    try {
      const { grupoId } = req.params;
      const { miembros } = req.body;
      const userId = req.user.id;
  
      // Verifica que el grupo pertenece al usuario autenticado
      const grupo = await Grupo.findOne({
        where: { id: grupoId, uuid: userId },
      });
  
      if (!grupo) {
        return res
          .status(404)
          .json({ message: "Grupo no encontrado o no pertenece al usuario" });
      }
  
      // Valida que los datos de miembros sean correctos
      if (!Array.isArray(miembros) || miembros.length === 0) {
        return res.status(400).json({ message: "No hay miembros para agregar" });
      }
  
      // Formatea y valida los miembros
      const miembrosFormat = miembros.map((m) => ({
        nombre: m.nombre,
        telefono: m.telefono,
        grupoId: grupo.id,
      }));
  
      // Inserta los miembros en la base de datos
      const nuevosMiembros = await Miembro.bulkCreate(miembrosFormat, {
        returning: true,
      });
  
      res.status(201).json(nuevosMiembros);
    } catch (error) {
      console.error("Error al importar miembros:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  
// Obtener solo los nombres de los grupos
router.get("/nombres", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Consultar solo los nombres de los grupos asociados al usuario
    const nombresGrupos = await Grupo.findAll({
      where: { uuid: userId },
      attributes: ["nombre"], // Solo seleccionamos el campo "nombre"
    });

    if (nombresGrupos.length === 0) {
      return res.status(404).json({ message: "No se encontraron grupos registrados" });
    }

    // Extraer solo los nombres en un arreglo simple
    const nombres = nombresGrupos.map((grupo) => grupo.nombre);

    res.status(200).json({ nombres });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo los nombres de los grupos" });
  }
});

module.exports = router;
