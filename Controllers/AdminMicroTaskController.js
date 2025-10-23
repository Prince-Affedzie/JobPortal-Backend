// routes/admin.js
const express = require('express');
const AdminMinitaskRouter = express.Router();
const { MiniTask } = require("../Models/MiniTaskModel");// Your MicroTask model
const { UserModel } = require("../Models/UserModel");
const {verify_token} =require('../MiddleWare/VerifyToken')

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




AdminMinitaskRouter.post( '/admin/task/:taskId/curate'  ,verify_token,  async (req, res) => {
  try {
    const { taskId } = req.params;
    const { taskerIds } = req.body; 
    const {id} = req.user 

    const notificationService = req.app.get('notificationService');

    if (!taskerIds || !Array.isArray(taskerIds) || taskerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Talent IDs array is required'
      });
    }

    if (taskerIds.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add more than 10 taskers to curated pool'
      });
    }

    // Find the task
    const task = await MiniTask.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if task is in review status
    if (task.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only add to curated pool for tasks under review'
      });
    }

    // Verify all talent IDs exist and are taskers
    const taskers = await UserModel.find({
      _id: { $in: taskerIds },
      role: 'job_seeker'
    })
    if (taskers.length !== taskerIds.length) {
      const foundIds = taskers.map(t => t._id.toString());
      const invalidIds = taskers.filter(id => !foundIds.includes(id));
      
      return res.status(400).json({
        success: false,
        message: `Invalid talent IDs: ${invalidIds.join(', ')}`
      });
    }

    // Check for duplicates in existing curated pool
    const existingTalentIds = task.curatedPool.map(item => item.tasker.toString());
    const newTalentIds = taskerIds.filter(id => !existingTalentIds.includes(id));

    if (newTalentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All selected talents are already in the curated pool'
      });
    }

    
    const curatedItems = newTalentIds.map(tasker => ({
      tasker,
      addedBy: id,
      addedAt: new Date(),
      status: 'pending' 
    }));

    task.curatedPool.push(...curatedItems);
    await task.save();

    for (const tasker of newTalentIds) {
      await notificationService.sendCuratedInvitationNotification({
        tasker,
        taskId: task._id,
        taskTitle: task.title,
        clientName: task.employer?.name || 'A client'
      });
    }

    res.status(200).json({message: `Added ${newTalentIds.length} talents to curated pool`, });

  } catch (error) {
    console.error('Error adding to curated pool:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});



AdminMinitaskRouter.delete('/admin/task/:taskId/curate/:taskerId',verify_token, async (req, res) => {
  try {
    const { taskId, taskerId } = req.params;
    console.log("I'm receving response")
    console.log("taskId",taskId)
    console.log("taskerId",taskerId)
    const task = await MiniTask.findById(taskId);
    console.log(task)
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const initialLength = task.curatedPool.length;
    task.curatedPool = task.curatedPool.filter(
      item => item.tasker.toString() !== taskerId.toString() 
    );

    if (task.curatedPool.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Talent not found in curated pool'
      });
    }

    await task.save();

    res.status(200).json({
      success: true,
      message: 'Talent removed from curated pool',
    });

  } catch (error) {
    console.error('Error removing from curated pool:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});





AdminMinitaskRouter.get( '/admin/task/:taskId/curate',verify_token, async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await MiniTask.findById(taskId)
      .populate({
        path: 'curatedPool.tasker',
      })
     

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json(
         task.curatedPool,
  
      
    );

  } catch (error) {
    console.error('Error getting curated pool:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});


module.exports = {AdminMinitaskRouter};

//const { loading, users, microJobs, reports, alerts, fetchAllUsers, fetchAllMicroJobs, fetchAllReports, fetchRecentAlerts } = useAdminContext();
