const express = require("express");
const authenticateToken = require("../middlewares/authMiddleware");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const reportMessageService = require("../services/reportMessageService");



router.post("/export", authenticateToken, async (req, res) => {
  try {
    const {
      format,
      reportType,
      selectedGroup,
      selectedContact,
      startDate,
      endDate,
    } = req.body;
    const userId = req.user.id;

    // Obtener los datos
    let filteredData = await reportMessageService.getReportMessages(userId);

    // Transformar a objetos planos
    filteredData = filteredData.map((reporte) => reporte.dataValues);

    // Filtrar por grupo o contacto si corresponde
    if (reportType === "grupo" && selectedGroup) {
      filteredData = filteredData.filter(
        (reporte) => reporte.grupo === selectedGroup
      );
    } else if (reportType === "contacto" && selectedContact) {
      filteredData = filteredData.filter((reporte) =>
        reporte.nombre_contacto
          .toLowerCase()
          .includes(selectedContact.toLowerCase())
      );
    }

    // Filtrar por rango de fechas si corresponde
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filteredData = filteredData.filter((reporte) => {
        const fechaEnvio = new Date(reporte.fecha_envio); // Asegúrate de que fecha_envio sea válida
        return fechaEnvio >= start && fechaEnvio <= end;
      });
    }

    // Crear directorio si no existe
    const userDir = path.join(process.cwd(), "Public", "files", req.user.id);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    // Resto del código para generar Excel o PDF...
    if (format === "excel" || format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Reportes");

      // Encabezados
      worksheet.columns = [
        { header: "Nombre Contacto", key: "nombre_contacto", width: 25 },
        { header: "Número Celular", key: "numero_cel", width: 20 },
        { header: "Mensaje", key: "message", width: 30 },
        { header: "Estado", key: "estadoEnvio", width: 15 },
        { header: "Grupo", key: "grupo", width: 20 },
        { header: "Fecha Envío", key: "fecha_envio", width: 20 },
        { header: "Hora Envío", key: "hora_envio", width: 20 },
        { header: "Cuenta Envío", key: "cuenta_envio", width: 20 },
      ];

      // Agregar datos
      filteredData.forEach((reporte) => worksheet.addRow(reporte));

      // Guardar archivo
      const filePath = path.join(userDir, "reporte.xlsx");
      await workbook.xlsx.writeFile(filePath);
      res.download(filePath); // Enviar el archivo directamente
    } else if (format === "pdf") {
      const doc = new PDFDocument({
        margin: 40,
        size: "A4",
        layout: "landscape",
      }); // ← A3 horizontal
      const filePath = path.join(userDir, "reporte.pdf");
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      doc.fontSize(22).text("Reporte de Envíos", { align: "center" });
      doc.moveDown(2);

      const headers = [
        "Nombre Contacto",
        "Número Celular",
        "Mensaje",
        "Estado",
        "Grupo",
        "Fecha Envío",
        "Hora Envío",
        "Cuenta Envío",
      ];

      const colWidths = [100, 90, 180, 60, 60, 70, 80, 80]; // columnas más equilibradas
      const startX = doc.x;
      let currentY = doc.y;

      const rowHeight = 25;

      // Función para dibujar una fila
      const drawRow = (row, isHeader = false) => {
        let x = startX;
        row.forEach((cell, i) => {
          // Borde de celda
          doc.rect(x, currentY, colWidths[i], rowHeight).stroke();

          // Contenido
          doc
            .font(isHeader ? "Helvetica-Bold" : "Helvetica")
            .fontSize(10)
            .text(String(cell ?? ""), x + 5, currentY + 7, {
              width: colWidths[i] - 10,
              height: rowHeight,
              ellipsis: true,
            });
          x += colWidths[i];
        });
        currentY += rowHeight;
      };

      // Dibujar encabezado
      drawRow(headers, true);

      // Dibujar filas
      filteredData.forEach((reporte) => {
        const row = [
          reporte.nombre_contacto,
          reporte.numero_cel,
          reporte.message,
          reporte.estadoEnvio,
          reporte.grupo,
          reporte.fecha_envio,
          reporte.hora_envio,
          reporte.cuenta_envio,
        ];

        if (currentY + rowHeight > doc.page.height - 50) {
          doc.addPage();
          currentY = 50;
          drawRow(headers, true); // encabezado en nueva página
        }

        drawRow(row);
      });

      doc.end();

      writeStream.on("finish", () => {
        const publicUrl = path.join(
          "Public",
          "files",
          req.user.id,
          "reporte.pdf"
        );
        const urlMedia = `${req.protocol}://${req.get("host")}/${publicUrl}`;
        res.json({ file: urlMedia });
      });
    } else {
      return res.status(400).json({ error: "Formato no soportado" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error al generar el archivo" });
  }
});

module.exports = router;
