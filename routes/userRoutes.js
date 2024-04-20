// routes/userRoutes.js

const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
var jsforce = require('jsforce'); //Adding JsForce
const jwt = require('jsonwebtoken'); // Import JWT
const User = require('../models/user');
require('dotenv').config(); // Load environment variables from .env file

const username = process.env.SALESFORCE_USER_NAME;
const password = process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN;

const secretkey = process.env.SECRET_KEY;
const nodemailer = require('nodemailer'); // Import Nodemailer

// Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_SENDER, // Your email address
        pass: process.env.EMAIL_PASSWORD // Your email password or app password
    }
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

// Example route to create a new user
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, phoneNumber } = req.body;

        const User__c = {
            'User_Name__c' : name,
            'Password__c' : password,
            'Phone_Number__c' : phoneNumber,
            'Email__c' : email
        }

        connection.sobject('User__c').create( User__c, function(err, result){
            if (err)
            { 
                return res.status(400).json({ success: false, message: 'Email already taken' });
            }
            const token = jwt.sign( { userId: result.id }, secretkey, { expiresIn: '1m' });

            // Send email
            const mailOptions = {
                from: process.env.EMAIL_SENDER,
                to: email,
                subject: 'Welcome to Expense Tracker',
                text: `Hello ${name},\n\nWelcome to Expense Tracker. You have successfully signed up.\n\nRegards,\nThe Expense Tracker Team`
            };
                       
            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });
            if(result.success)
                return res.status(200).json({ success: true, token: token, userid: result.id });
            else
                return res.status(400).json({ success: false, message: 'Email already taken' });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        connection.query(`SELECT Id, Email__c, Password__c from User__c where Email__c = '${email}' and Password__c = '${password}'`, function(err, result){
            if( err ){
                return res.status(401).json({ success: false, message: err.message });
            }
            if( result.records.length > 0 ){
                records = result.records[0];
                const userId = records.Id;
                const token = jwt.sign({ userId: userId }, secretkey, { expiresIn: '1m' });
                return res.status(200).json({ success: true, token: token, userid: userId });
            } else{
                return res.status(400).json({ success: false, message: 'Invalid email or password' });
            
            }
        });

    } catch (error) {
        res.status(400).send(error.message);
    }
});

router.get('/getUser/email=:email', async (req, res) => {
    try {
        const email = req.params.email;
        connection.query(`SELECT Id, User_Name__c,Email__c, Phone_Number__c from User__c where Email__c = '${email}'`, function(err, result){
            if( err ){
                return res.status(401).json({ success: false, message: 'Error connecting to Salesforce' });
            }
            const records = result.records[0];
            const user = {
                __id : records.Id,
                name : records.User_Name__c,
                email: records.Email__c,
                phoneNumber: records.Phone_Number__c
            }
            return res.status(200).json(user);
        });
    } catch (error) {
        res.status(400).send(error.message);
    }
});

router.put('/updateProfile/:userid', async (req, res) => {
    try {
        const { name, phoneNumber,  } = req.body;
        const User__c = {
            'User_Name__c' : name,
            'Phone_Number__c' : phoneNumber
        }
        const userid = req.params.userid;
        connection.sobject('User__c')
            .find({ 'Id' : userid })
            .update(User__c, function(err, result) {
                if (err){
                    return res.status(400).send({success: false, message: error.message});
                }
                return res.status(200).json({ success: true, message: "Updated successfully" });
        });
    } catch (error) {
        res.status(400).send({success: false, message: error.message});
    }
});

router.post('/auth/renewToken', async (req, res) => {
    try {
        // Get the token from the request headers
        const token = req.headers.authorization.split(' ')[1];

        // Verify the token
        jwt.verify(token, secretkey, (err, decoded) => {
            if (err) {
                // Token verification failed (token is invalid or expired)
                return res.status(401).json({ success: false, message: 'Token expired or invalid' });
            } else {
                // Token is valid, generate a new token with a new expiration time
                const newToken = jwt.sign({ userId: decoded.userId }, secretkey, { expiresIn: '1m' });
                res.status(200).json({ success: true, token: newToken });
            }
        });
    } catch (error) {
        res.status(400).send(error.message);
    }
});


});

module.exports = router;