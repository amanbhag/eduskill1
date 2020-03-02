const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var appointmentSchema = new Schema({
  fullname: {type: String, required: true},
  number: {type: Number, required: true},
  date: {type: Date, required: true},
});

module.exports = mongoose.model("appointment", appointmentSchema);
