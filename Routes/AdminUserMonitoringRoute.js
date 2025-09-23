// routes/userGrowthRoutes.js
const express = require('express');
const adminUsersMonitoringRoute = express.Router();
const {
  getUserGrowthStats,
  getUserGrowthTrend,
  getUserDemographics,
  
} = require('../Controllers/AdminUserGrowthController');

const {verify_token} =require('../MiddleWare/VerifyToken')

// Get comprehensive user growth statistics
adminUsersMonitoringRoute.get('/admin/users/stats', verify_token, getUserGrowthStats);

// Get user growth trend data for charts
adminUsersMonitoringRoute.get('/admin/users/trend', verify_token, getUserGrowthTrend);

// Get user demographic data
adminUsersMonitoringRoute.get('/admin/users/demographics', verify_token, getUserDemographics);

module.exports = {adminUsersMonitoringRoute};