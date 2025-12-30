const express = require('express');
const serviceRouter = express.Router();
const {getAllServices} = require('../Controllers/ServiceController')

serviceRouter.get('/all-services',getAllServices)
module.exports = {serviceRouter}