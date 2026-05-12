const TaskerProfile = require("../Models/TaskerModel");
const mongoose = require("mongoose")

const getTaskerSearchPipeline = (lon, lat, matchedIds, maxDistance) => {
  const RATING_WEIGHT = 50;
  const VETTING_BONUS = 120;
  const PHOTO_BONUS = 30;
  const RECENTLY_ACTIVE_BONUS = 40;
  const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 1. Define the filter for geoNear
  // If matchedIds is provided (from text search), we restrict geoNear to those IDs
  const geoQuery = {
    vettingStatus: { $ne: "rejected" },
    ...(matchedIds ? { _id: { $in: matchedIds } } : {})
  };

  return [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lon, lat] },
        distanceField: "distance",
        spherical: true,
        maxDistance: parseFloat(maxDistance) * 1000,
        query: geoQuery, // Filter happens INSIDE geoNear
        key: "location.coordinates",
      }
    },
    {
      $lookup: {
        from: "users", 
        localField: "userId",
        foreignField: "_id",
        as: "accountDetails"
      }
    },
    { $unwind: "$accountDetails" },
    {
      $addFields: {
        qualityScore: {
          $sum: [
            { $cond: [{ $eq: ["$isVerified", true] }, VETTING_BONUS, 0] },
            { $cond: [{ $gt: [{ $size: { $ifNull: ["$workPortfolio", []] } }, 0] }, PHOTO_BONUS, 0] }
          ]
        },
        performanceScore: { $multiply: [{ $ifNull: ["$rating", 0] }, RATING_WEIGHT] },
        recencyScore: {
          $cond: [
            { $gte: ["$updatedAt", SEVEN_DAYS_AGO] },
            RECENTLY_ACTIVE_BONUS,
            0
          ]
        }
      }
    },
    {
      $addFields: {
        finalRelevanceScore: { $sum: ["$qualityScore", "$performanceScore", "$recencyScore"] }
      }
    },
    { $sort: { finalRelevanceScore: -1, distance: 1 } },
    {
      $project: {
        _id: 1,
        name: "$accountDetails.name",
        profileImage:"$accountDetails.profileImage",
        businessName: 1,
        tagline: 1,
        servicesOffered: 1,
        rating: 1,
        distance: 1,
        location:1,
        isVerified: 1,
        brandBanner: 1,
        finalRelevanceScore: 1
      }
    },
    { $limit: 50 }
  ];
};

const searchRankedTaskers = async (lon, lat, searchQuery, maxDistance) => {
  let matchedIds = null;

  // STEP 1: If there's a search query, do the text search first to get IDs
  if (searchQuery && searchQuery.trim() !== "") {
    const textMatches = await TaskerProfile.find(
      { $text: { $search: searchQuery } },
      { _id: 1 }
    ).lean();

    matchedIds = textMatches.map(doc => doc._id);

    // If user searched for something specific but no tasker matches, return empty early
    if (matchedIds.length === 0) return [];
  }

  // STEP 2: Run the geo-aggregation using those IDs
  const pipeline = getTaskerSearchPipeline(
    lon,
    lat,
    matchedIds,
    maxDistance
  );

  return await TaskerProfile.aggregate(pipeline);
};

module.exports = { searchRankedTaskers };