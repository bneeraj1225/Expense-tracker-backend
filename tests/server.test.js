const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const server = require('../server');

const app = express();
app.use(bodyParser.json());
app.use('/', server);

describe('Server', () => {
  it('responds with a 200 status code for the root endpoint', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
  });

  it('responds with a 404 status code for unknown routes', async () => {
    const response = await request(app).get('/unknown');
    expect(response.statusCode).toBe(404);
  });

  it('responds with a 401 status code for unauthorized requests', async () => {
    const response = await request(app).post('/expenses');
    expect(response.statusCode).toBe(401);
  });
});
