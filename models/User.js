const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  havePlan: { type: Boolean, required: true },
  plan: { type: String },
  cardNumber: { type: String },
  date: { type: Date, required: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  recoveryCode: { type: String },
  recoveryCodeExpires: { type: Date },
});

module.exports = mongoose.model('User', UserSchema);
