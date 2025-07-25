const mongoose = require("mongoose");

const RegulatoryDocumentSchema = mongoose.model(
  "regulatory_document",
  new mongoose.Schema({
    title: String,
    content: String,
    dateIssued: Date,
    author: String,
    attachments: String,
  })
);

module.exports = RegulatoryDocumentSchema;
