const User = require("./user");
const Payment = require("./payments");

// Relación entre User y Payment (uno a muchos)
User.hasMany(Payment, { foreignKey: "uuid" });
Payment.belongsTo(User, { foreignKey: "uuid" });
