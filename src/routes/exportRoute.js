const express = require("express");
const authenticateToken = require("../middlewares/authMiddleware");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const reportMessageService = require("../services/reportMessageService");

// Ruta para exportar archivos
// router.post("/export", authenticateToken, async (req, res) => {
//   const { format, reportType, selectedGroup, selectedContact } = req.body;
//   console.log(req.body);
//   const userId = req.user.id;

//   try {
//     // Obtener los datos
//     let filteredData = await reportMessageService.getReportMessages(userId);

//     // Transformar a objetos planos
//     filteredData = filteredData.map((reporte) => reporte.dataValues);

//     // Filtrar por grupo o contacto si corresponde
//     if (reportType === "grupo" && selectedGroup) {
//       filteredData = filteredData.filter(
//         (reporte) => reporte.grupo === selectedGroup
//       );
//     } else if (reportType === "contacto" && selectedContact) {
//       filteredData = filteredData.filter((reporte) =>
//         reporte.nombre_contacto
//           .toLowerCase()
//           .includes(selectedContact.toLowerCase())
//       );
//     }

//     // Crear directorio si no existe
//     const userDir = path.join(process.cwd(), "public", "files", req.user.id);
//     if (!fs.existsSync(userDir)) {
//       fs.mkdirSync(userDir, { recursive: true });
//     }

//     if (format === "excel" || format === "xlsx") {
//       const workbook = new ExcelJS.Workbook();
//       const worksheet = workbook.addWorksheet("Reportes");

//       // Encabezados
//       worksheet.columns = [
//         { header: "ID", key: "id", width: 10 },
//         { header: "Número Celular", key: "numero_cel", width: 20 },
//         { header: "Mensaje", key: "message", width: 30 },
//         { header: "Estado", key: "estadoEnvio", width: 15 },
//         { header: "Nombre Contacto", key: "nombre_contacto", width: 25 },
//         { header: "Grupo", key: "grupo", width: 20 },
//       ];

//       // Agregar datos
//       filteredData.forEach((reporte) => worksheet.addRow(reporte));

//       // Guardar archivo
//       const filePath = path.join(userDir, "reporte.xlsx");
//       await workbook.xlsx.writeFile(filePath);
//       //   res.json({ url: filePath });
//       res.download(filePath); // Enviar el archivo directamente
//     } else if (format === "pdf") {
//       const doc = new PDFDocument();
//       const filePath = path.join(userDir, "reporte.pdf");
//       console.log(filePath);
//       doc.pipe(fs.createWriteStream(filePath));
//       console.log("creo el archivo");
//       doc.fontSize(20).text("Reporte de Envíos", { align: "center" });
//       doc.moveDown(2);
//       // Agregar la marca de agua
//       const watermarkPath = path.join(
//         process.cwd(),
//         "public",
//         "img",
//         "LOG-MMW.png"
//       );
//       //   doc.image(watermarkPath, 100, 150, {
//       //     width: 400, // Ajusta el tamaño de la marca de agua
//       //     opacity: 0.2, // Configura la opacidad para que sea un fondo tenue
//       //   });

//       const imageWidth = 100; // Tamaño deseado para la imagen
//       const imageHeight = 50; // Ajusta la altura según lo necesites
//       doc.image(watermarkPath, doc.page.width - imageWidth - 30, 30, {
//         width: imageWidth,
//         height: imageHeight,
//         opacity: 0.2, // Opacidad para que sea tenue
//       });
//       filteredData.forEach((reporte) => {
//         doc
//           .fontSize(12)
//           .text(
//             `ID: ${reporte.id}, Número: ${reporte.numero_cel}, Estado: ${reporte.estadoEnvio}, Contacto: ${reporte.nombre_contacto}, Grupo: ${reporte.grupo}`
//           );
//         doc.moveDown();
//       });

//       doc.end();
//       console.log("dinish:");

//     //   fs.readFile(filePath, (err, data) => {
//     //     if (err) {
//     //       return res.status(500).json({ message: "Error al leer el archivo" });
//     //     }

//     //     // Convertir a base64
//     //     const base64Data = data.toString("base64");
//     //     console.log(base64Data);
//     //     // Responder con el base64
//     //     res.json({ file: base64Data });
//     //   });

//        const publicUrl = path.join(
//         "public",
//         "files",
//         req.user.id,
//         "reporte.pdf"
//       );
//       console.log("publicUrl: " + publicUrl); // URL para descargar el archivo en el navegador
//       const urlMedia = `${req.protocol}://${req.get("host")}/${publicUrl}`;
//       console.log("urlMedia: " + urlMedia); // URL para descargar el archivo en el navegador
//       res.json({ file: urlMedia }); // Devuelve el URL del archivo generado en caso de ser un PDF
//     } else {
//       return res.status(400).json({ error: "Formato no soportado" });
//     }
//   } catch (error) {
//     console.error("Error generando el archivo:", error);
//     res.status(500).json({ error: "Error al generar el archivo" });
//   }
// });

router.post("/export", authenticateToken, async (req, res) => {
  const { format, reportType, selectedGroup, selectedContact, startDate, endDate } = req.body;
  const userId = req.user.id;

  console.log(req.body)
  try {
    // Obtener los datos
    let filteredData = await reportMessageService.getReportMessages(userId);

    // Transformar a objetos planos
    filteredData = filteredData.map((reporte) => reporte.dataValues);
    console.log(filteredData)
    // Filtrar por grupo o contacto si corresponde
    if (reportType === "grupo" && selectedGroup) {
      filteredData = filteredData.filter(
        (reporte) => reporte.grupo === selectedGroup
      );
      console.log("ingreso a grupo")
      console.log(filteredData)
    } else if (reportType === "contacto" && selectedContact) {
      filteredData = filteredData.filter((reporte) =>
        reporte.nombre_contacto
          .toLowerCase()
          .includes(selectedContact.toLowerCase())
      );
      console.log("ingreso a contacto")
      console.log(filteredData)

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
    const userDir = path.join(process.cwd(), "public", "files", req.user.id);
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
      const doc = new PDFDocument();
      const filePath = path.join(userDir, "reporte.pdf");
      doc.pipe(fs.createWriteStream(filePath));
      doc.fontSize(20).text("Reporte de Envíos", { align: "center" });
      doc.moveDown(2);

      filteredData.forEach((reporte) => {
        doc
          .fontSize(12)
          .text(
            `Nombre Contacto: ${reporte.nombre_contacto}, Número: ${reporte.numero_cel}, Estado: ${reporte.estadoEnvio}, Grupo: ${reporte.grupo}, Fecha Envío: ${reporte.fecha_envio}, Hora Envío: ${reporte.hora_envio}, Cuenta Envío: ${reporte.cuenta_envio}`
          );
        doc.moveDown();
      });

      doc.end();

      const publicUrl = path.join(
        "public",
        "files",
        req.user.id,
        "reporte.pdf"
      );
      const urlMedia = `${req.protocol}://${req.get("host")}/${publicUrl}`;
      res.json({ file: urlMedia }); // Devuelve el URL del archivo generado en caso de ser un PDF
    } else {
      return res.status(400).json({ error: "Formato no soportado" });
    }
  } catch (error) {
    console.error("Error generando el archivo:", error);
    res.status(500).json({ error: "Error al generar el archivo" });
  }
});


module.exports = router;
