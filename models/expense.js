const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    category: String,
    title: String,
    price: Number,
    expectedPrice: Number,
    email: String,
    date: Date
});

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;