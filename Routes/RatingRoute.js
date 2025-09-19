const express = require("express");
const { addRating, getUserRatings, updateRating } = require("../Controllers/RatingController");
const { verify_token } = require('../MiddleWare/VerifyToken.js');
const ratingRouter = express.Router();

// POST: Add rating
ratingRouter.post("/:userId/rate", verify_token, addRating);

// GET: Fetch user ratings
ratingRouter.get("/:userId/ratings", verify_token, getUserRatings);

// PUT: Update a specific rating
ratingRouter.put("/:userId/ratings/:ratingId",  verify_token, updateRating);

module.exports = {ratingRouter};
