// routes/expenseRoutes.js

const express = require('express');
const router = express.Router();
const jwt = require( 'jsonwebtoken' );
var jsforce = require('jsforce'); //Adding JsForce
const {expressjwt: expressJwt} = require('express-jwt');

const username = process.env.SALESFORCE_USER_NAME;
const password = process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN;

const Expense = require('../models/expense');
const mongoose = require('../server'); // Import Mongoose instance from app.js
const { connect } = require('mongoose');

require('dotenv').config();

const secretkey = process.env.SECRET_KEY;

const jwtMW = expressJwt({
    secret: secretkey,
    algorithms: ['HS256']
});

var connection = new jsforce.Connection
(
    {
        // you can change loginUrl to connect to sandbox or prerelease env.
        loginUrl : 'https://login.salesforce.com'
    }
);

// Authenticate with Salesforce
connection.login(username, password, function(err, userInfo) {
    if (err) { return console.error(err); }
    console.log('Connected to Salesforce');

    router.get('/fetchExpenses/email=:email', jwtMW , async (req, res) => {
        try {
            const email = req.params.email;

            connection.query(`SELECT Id, Title__c, Category__c, Price__c, Expected_Price__c, Email__c, Date__c FROM Expense__c WHERE Email__c = '${email}' order by Date__c desc`, function(err, result) {
                if (err) { 
                    return res.send(400).send(express.response)
                }
                let expenses = [];
                for(let i=0; i<result.records.length; i++){
                    expenses.push({
                        _id: result.records[i].Id,
                        title: result.records[i].Title__c,
                        category: result.records[i].Category__c,
                        price: result.records[i].Price__c,
                        expectedPrice: result.records[i].Expected_Price__c,
                        email: result.records[i].Email__c,
                        date: result.records[i].Date__c
                    });
                }
                return res.json(expenses);
            });
        } catch (error) {
            res.status(400).send(error.message);
        }
    });

    router.delete('/deleteExpense/:expenseId', jwtMW , async (req, res) => {
        try {
            const expenseId = req.params.expenseId;
            connection.sobject('Expense__c').destroy(expenseId, function(err, result) {
                if( err ){
                    return res.status(500).json({ success: false, message: 'Internal Server Error' });
                }
                if( res ){
                    return res.status(200).json({ success: true, message: "Expense Deleted Successfully" });
                }
            });
        } catch (error) {
            res.status(400).send(error.message);
        }
    });

    router.put('/updateExpense/:expenseId', jwtMW , async (req, res) => {
        try {
            const expenseId = req.params.expenseId;
            const update = req.body; // Get the update data from request body

            const expense = {
                'Title__c': update.expenseTitle,
                'Category__c': update.category,
                'Price__c': update.price,
                'Expected_Price__c': update.expectedPrice,
                'Email__c': update.email,
                'Date__c': update.date
            }

            connection.sobject('Expense__c')
            .find({'Id': expenseId})
            .update(expense, function(err, result) {
                if (err) {
                    return res.status(404).json({ success: false, message: 'Expense not found' });
                } else {
                    return res.json({ success: true, _id: expenseId });
                }
            });

        } catch (error) {
            res.status(400).send(error.message);
        }
    });


    router.post('/addExpenses', jwtMW, async (req, res) => {
        try {
            const { expenseTitle, category, price, email, date, expectedPrice } = req.body;
            const expense = {
                'Title__c': expenseTitle,
                'Category__c': category,
                'Price__c': price,
                'Expected_Price__c' : expectedPrice,
                'Email__c': email,
                'Date__c': date
            }
            connection.sobject('Expense__c').create(expense, function(err, result) {
                if( err ){
                    console.log(err);
                    return res.send(500).json({ success: false, message: 'Internal Server Error' });
                }
                
                return res.status(200).json({ success: true, _id: result.id });
            });
        } catch (error) {
            res.status(400).send(error.message);
        }
    });

    router.post('/addMultipleExpenses', jwtMW, async (req, res) => {
        try {
            const expenses = req.body;
            const recordsToInsert = [];

            // Loop through each expense and format it for insertion
            expenses.forEach(expense => {
                const record = {
                    Title__c: expense.title,
                    Category__c: expense.category,
                    Price__c: expense.price,
                    Expected_Price__c: expense.expectedPrice,
                    Date__c: new Date(expense.date),
                    Email__c: expense.email
                };
                recordsToInsert.push(record);
            });

            // Insert records into Salesforce
            connection.sobject('Expense__c').create(recordsToInsert, function(err, result) {
                if (err) {
                    console.error('Error creating expenses in Salesforce:', err);
                    return res.status(500).json({ success: false, message: 'Internal Server Error' });
                }
                const expensesWithIds = result.map((record, index) => ({
                    id: record.id,
                    expense: expenses[index]
                }));
    
                // Send back the expenses along with their IDs
                return res.status(200).json({ success: true, expenses: expensesWithIds });
            });

        } catch (error) {
            console.log(error);
            res.status(400).send(error.message);
        }
    });

    // Error handling middleware
    router.use((err, req, res, next) => {
        console.error(err.stack);
        return res.status(err.status || 500).send({ success: false, message: err.message });
    });

});

module.exports = router;