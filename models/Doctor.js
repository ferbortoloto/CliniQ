// models/Doctor.js
const mongoose = require('mongoose');

const DoctorSchema = new mongoose.Schema({
  doctorName: {
    type: String,
    required: true,
  },
  clinicPhone: {
    type: String,
    required: true,
  },
  clinicAddress: {
    type: String,
    required: true,
  },
  clinicName: {
    type: String,
    required: true,
  },
  specialty: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  clinicImage: {
    type: String,
    required: true,
  },
  acceptsInsurance: {
    type: Boolean,
    required: true,
  },
  insurance: {
    type: String,
    required: false,
  },
  appointments: {
    data: [
      {
        appointmentType: String,
        price: Number,
      },
    ],
  },
  workHours: {
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
  },
  schedule: {
    dates: [
      {
        date: Date,
      },
    ],
  },
});

module.exports = mongoose.model('Doctor', DoctorSchema);
