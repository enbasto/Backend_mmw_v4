const { Sequelize } = require("sequelize");
const User = require("../models/user");

async function getUserById(userId) {
  return await User.findOne({ where: { uuid: userId } });
}

async function incrementMessagesSent(userId, cantidad) {
 try {
  await User.update(
    { messages_sent: Sequelize.literal(`messages_sent + ${cantidad}`) },
    { where: { uuid: userId } }
  );
  return true
 } catch (error) {
    return false
 }
}

module.exports = {
  getUserById,
  incrementMessagesSent
};
