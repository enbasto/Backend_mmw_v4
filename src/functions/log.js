const trace = require("stack-trace");
const logger = require("../middlewares/logger");


async function createLog(error) {
    const stackInfo = trace.parse(error)[0];
    logger.error(`
      Error: ${error.message} 
      Línea: ${stackInfo.getLineNumber()} 
      Archivo: ${stackInfo.fileName} 
      Stack: ${error.stack} 
      Error Completo: ${JSON.stringify(error, null, 2)}
    `);
}

module.exports = {
    createLog
}