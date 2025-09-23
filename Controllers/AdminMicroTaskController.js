// routes/admin.js
const express = require('express');
const AdminMinitaskRouter = express.Router();
const { MiniTask } = require("../Models/MiniTaskModel");// Your MicroTask model

// Get dashboard statistics
AdminMinitaskRouter.get('/dashboard/stats', async (req, res) => {
  try {
    const totalMicroJobs = await MiniTask.countDocuments();
    const openMicroJobs = await  MiniTask.countDocuments({ status: "Open" });
    const inProgressMicroJobs = await MiniTask.countDocuments({ status: "In-progress" });
    const completedMicroJobs = await  MiniTask.countDocuments({ status: "Completed" });
    const pendingMicroJobs = await  MiniTask.countDocuments({ status: "Pending" });
    
    // Calculate revenue (assuming 10% platform commission)
    const completedJobs = await  MiniTask.find({ status: "Completed" });
    const revenue = completedJobs.reduce((total, job) => total + (job.budget * 0.1), 0);
    
    // Count applicants across all microjobs
    const jobsWithApplicants = await MiniTask.find({}).populate('applicants');
    const totalApplicants = jobsWithApplicants.reduce((total, job) => total + (job.applicants?.length || 0), 0);
    
    res.json({
      totalMicroJobs,
      openMicroJobs,
      inProgressMicroJobs,
      completedMicroJobs,
      pendingMicroJobs,
      revenue,
      totalApplicants
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message });
  }
});

// Get microjob activity data
AdminMinitaskRouter.get('/dashboard/activity', async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const activityData = await  MiniTask.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
          applicants: { $sum: { $size: "$applicants" } }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Format the data for the chart
    const formattedData = activityData.map(item => ({
      name: new Date(item._id).toLocaleDateString('en-US', { weekday: 'short' }),
      microjobs: item.count,
      applicants: item.applicants
    }));
    
    res.json(formattedData);
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message });
  }
});

// Get category distribution
AdminMinitaskRouter.get('/dashboard/categories', async (req, res) => {
  try {
    const categoryData = await  MiniTask.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json(categoryData);
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message });
  }
});

// Get recent microjobs
AdminMinitaskRouter.get('/dashboard/recent-microjobs', async (req, res) => {
  try {
    const recentMicroJobs = await MiniTask.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('employer', 'name');
    
    res.json(recentMicroJobs);
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message });
  }
});

module.exports = {AdminMinitaskRouter};

//const { loading, users, microJobs, reports, alerts, fetchAllUsers, fetchAllMicroJobs, fetchAllReports, fetchRecentAlerts } = useAdminContext();
