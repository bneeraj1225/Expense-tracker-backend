const express = require('express');
const userRoutes = require('./routes/userRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const compression = require('compression');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;
const bodyParser = require( 'body-parser' );
require('dotenv').config();

// Middleware
app.use(express.json());
app.use(cors());
app.use(compression());

// Routes
app.use('/users', userRoutes);
app.use('/expenses', expenseRoutes);

app.use ( bodyParser.json() );
app.use(bodyParser.urlencoded({ extended:true }));
app.use((req,res,next) => {
    res.setHeader('Access-Control-Allow-Origin','http://localhost:3000');
    res.setHeader('Access-Control-Allow-Headers','Content-type,Aythorization');
    next();
});

app.use(function(err, req, res, next) {
    if(err.name ==='UnauthorizedError') {
        res.status(401).json({
            success: false,
            officialError: err,
            err: 'Username or password is incorrect 2'
        });
    }
    else {
        next(err);
    }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});