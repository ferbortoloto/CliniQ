const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
  cpf: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  doctor: {
    type: String,
    required: true,
  },
  typeConsultation: {
    type: String,
    required: true,
  },
  date: { 
    type: Date,
    required: true,
  },
  dateConsultation: { 
    type: Date,
    required: true,
  },
  notified: { 
    type: Boolean,
    default: false,
  },
  done: { 
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('Schedule', ScheduleSchema);
