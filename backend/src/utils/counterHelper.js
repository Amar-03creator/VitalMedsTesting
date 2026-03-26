const mongoose = require('mongoose');

// Internal Counter schema for auto-incrementing document numbers
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Get the next sequence number for a given counter name.
 * Returns a formatted document number like INQ-0001, ORD-0042, etc.
 *
 * @param {string} name - Counter name (e.g., 'inquiry', 'order')
 * @param {string} prefix - Document prefix (e.g., 'INQ', 'ORD')
 * @param {number} [padLength=4] - Zero-padding length
 * @returns {Promise<string>} Formatted document number
 */
const getNextSequence = async (name, prefix, padLength = 4) => {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const paddedSeq = String(counter.seq).padStart(padLength, '0');
  return `${prefix}-${paddedSeq}`;
};

/**
 * Get current sequence value without incrementing (for display purposes).
 *
 * @param {string} name - Counter name
 * @returns {Promise<number>} Current sequence value
 */
const getCurrentSequence = async (name) => {
  const counter = await Counter.findById(name);
  return counter ? counter.seq : 0;
};

/**
 * Reset a counter to a specific value (admin use only).
 *
 * @param {string} name - Counter name
 * @param {number} value - Value to reset to
 */
const resetSequence = async (name, value = 0) => {
  await Counter.findByIdAndUpdate(
    name,
    { seq: value },
    { upsert: true }
  );
};

module.exports = { getNextSequence, getCurrentSequence, resetSequence, Counter };
