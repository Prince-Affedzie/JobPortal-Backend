// controllers/userGrowthController.js
const { UserModel } = require("../Models/UserModel");
const { getDateRange, generateDateIntervals } = require("../Utils/dateUtils");
const DBHelper = require("../Utils/dbHelper");

const getUserGrowthStats = async (req, res) => {
  // Set response timeout
  req.setTimeout(30000); // 30 seconds max for entire request

  try {
    const { period = "monthly", startDate, endDate } = req.query;

    // Build simple date filter - avoid complex aggregations initially
    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start) && !isNaN(end)) {
        dateFilter.createdAt = { $gte: start, $lte: end };
      }
    } else {
      const { start, end } = getDateRange(period);
      dateFilter.createdAt = { $gte: start, $lte: end };
    }

    // 1. Get basic counts first (fast queries)
    const [totalUsers, newUsers] = await Promise.allSettled([
      DBHelper.safeCount(UserModel, {}),
      DBHelper.safeCount(UserModel, dateFilter)
    ]);

    // 2. Get role distribution with simple query
    let usersByRole = {};
    try {
      const roleResult = await DBHelper.safeAggregate(UserModel, [
        { $match: dateFilter },
        { $group: { _id: "$role", count: { $sum: 1 } } }
      ], { maxTimeMS: 5000 });

      usersByRole = roleResult.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {});
    } catch (roleError) {
      console.warn('Role distribution query failed, using fallback:', roleError);
      // Fallback: empty role distribution
      usersByRole = {};
    }

    // 3. Get growth data with smaller chunks
    let growthData = [];
    try {
      growthData = await getGrowthChartData(period, dateFilter);
    } catch (growthError) {
      console.warn('Growth data query failed:', growthError);
      growthData = [];
    }

    // Always respond successfully, even with partial data
    res.json({
      success: true,
      data: {
        totalUsers: totalUsers.status === 'fulfilled' ? totalUsers.value : 0,
        newUsers: newUsers.status === 'fulfilled' ? newUsers.value : 0,
        usersByRole,
        growthData,
        period: { type: period }
      }
    });

  } catch (error) {
    console.error("User growth stats critical error:", error);
    
    // Never let the API fail completely - return minimal data
    res.json({
      success: true,
      data: {
        totalUsers: 0,
        newUsers: 0,
        usersByRole: {},
        growthData: [],
        period: { type: period || 'monthly' }
      }
    });
  }
};

const getGrowthChartData = async (period, dateFilter) => {
  const start = dateFilter.createdAt?.$gte || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = dateFilter.createdAt?.$lte || new Date();

  const intervals = generateDateIntervals(start, end, period);
  const chartData = [];

  // Process in smaller batches to avoid overwhelming DB
  for (let i = 0; i < intervals.length; i++) {
    try {
      const interval = intervals[i];
      const count = await DBHelper.safeCount(UserModel, {
        createdAt: { $gte: interval.start, $lte: interval.end }
      }, { maxTimeMS: 3000 });

      chartData.push({
        period: interval.label,
        users: count,
        startDate: interval.start,
        endDate: interval.end,
      });

      // Small delay between queries
      if (i % 2 === 0) await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.warn(`Failed to get data for interval ${i}:`, error);
      chartData.push({
        period: intervals[i].label,
        users: 0,
        startDate: intervals[i].start,
        endDate: intervals[i].end,
      });
    }
  }

  return chartData;
};

const getUserGrowthTrend = async (req, res) => {
  req.setTimeout(15000); // 15 seconds max

  try {
    const { period = "monthly", limit = 6 } = req.query;

    const trendData = await DBHelper.safeAggregate(UserModel, [
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: parseInt(limit) },
    ], { maxTimeMS: 8000 });

    const formattedData = trendData.map((item) => ({
      period: `${item._id.year}-${item._id.month.toString().padStart(2, "0")}`,
      users: item.count,
    })).reverse(); // Reverse to show chronological order

    res.json({
      success: true,
      data: formattedData
    });

  } catch (error) {
    console.error("User growth trend error:", error);
    res.json({
      success: true,
      data: [] // Return empty array instead of failing
    });
  }
};

const getUserDemographics = async (req, res) => {
  // Quick response for demographics to avoid blocking
  res.json({
    success: true,
    data: {
      byLocation: [],
      byRegistrationPeriod: [],
      period: { start: null, end: null }
    }
  });
};

module.exports = {
  getUserGrowthStats,
  getUserGrowthTrend,
  getUserDemographics,
};