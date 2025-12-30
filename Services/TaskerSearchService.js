const { UserModel } = require('../Models/UserModel'); 

/**
 * Generates the geo-filtered and ranked aggregation pipeline.
 * NOTE: The text score (keyword relevance) is OMITTED from the ranking calculation
 * to resolve MongoDB constraints, but the $text filter remains to ensure profile scanning.
 *
 * @param {number} lon - Longitude of the search center.
 * @param {number} lat - Latitude of the search center.
 * @param {string} searchQuery - The text query for profile scanning (used for filtering).
 * @param {number} maxDistance - Maximum search distance in meters.
 * @returns {Array} - The MongoDB aggregation pipeline stages.
 */
const getTaskerSearchPipeline = (lon, lat, matchedUserIds, maxDistance) => {
  const RATING_WEIGHT = 50;
  const VETTING_BONUS = 120;
  const PHOTO_BONUS = 30;
  const RECENTLY_ACTIVE_BONUS = 40;
  const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);


  const baseFilters = {
    role: "job_seeker",
    isActive: true,
    //isVerified: true,
    "availability.status": "available",
    ...(matchedUserIds.length ? { _id: { $in: matchedUserIds } } : {}) // only apply if query was provided
  };

  return [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lon, lat] },
        distanceField: "distance",
        spherical: true,
        maxDistance: parseFloat(maxDistance) * 1000,
        query: baseFilters,
        key: "location.coordinates",
      }
    },
    {
      $addFields: {
        qualityScore: {
          $sum: [
            { $cond: [{ $eq: ["$isverified", true] }, VETTING_BONUS, 0] },
            { $cond: [{ $ne: ["$profileImage", null] }, PHOTO_BONUS, 0] }
          ]
        },
        performanceScore: { $multiply: ["$rating", RATING_WEIGHT] },
        recencyScore: {
          $cond: [
            { $gte: ["$availability.lastActiveAt", SEVEN_DAYS_AGO] },
            RECENTLY_ACTIVE_BONUS,
            0
          ]
        }
      }
    },
    {
      $addFields: {
        finalRelevanceScore: {
          $sum: ["$qualityScore", "$performanceScore", "$recencyScore"]
        }
      }
    },
    {
      $sort: { finalRelevanceScore: -1, distance: 1 }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        email:1,
        rating: 1,
      "primaryService.serviceName":1,
        skills: 1,
        profileImage: 1,
        distance: 1,
        finalRelevanceScore: 1,
        "availability.status": 1,
        location: 1,
        workExperience:1,
        workPortfolio:1,
        Bio:1,
        isVerified:1,
        vettingStatus:1,
        numberOfRatings:1,
        ratingsReceived:1,
        createdAt:1,
      }
    },
    { $limit: 50 }
  ];
};

const searchRankedTaskers = async (lon, lat, searchQuery, maxDistance) => {
  let matchedUserIds = [];
  let hasSearchQuery = false;

  if (searchQuery && searchQuery.trim() !== "") {
    hasSearchQuery = true;

    matchedUserIds = await UserModel.find(
      { $text: { $search: searchQuery } },
      { _id: 1 }
    ).lean();

    matchedUserIds = matchedUserIds.map(u => u._id);

    // 🚨 IMPORTANT: No matches → return empty result immediately
    if (matchedUserIds.length === 0) {
      return [];
    }
  }

  const pipeline = getTaskerSearchPipeline(
    lon,
    lat,
    matchedUserIds,
    maxDistance
  );

  return await UserModel.aggregate(pipeline);
};


module.exports = {
    searchRankedTaskers,
};