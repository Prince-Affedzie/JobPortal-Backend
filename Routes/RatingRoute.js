const express = require("express");
const { addRating, getUserRatings, updateRating } = require("../Controllers/RatingController");
const { verify_token } = require('../MiddleWare/VerifyToken.js');
const ratingRouter = express.Router();


ratingRouter.post("/:userId/rate", verify_token, addRating);


ratingRouter.get("/:userId/ratings", verify_token, getUserRatings);


ratingRouter.put("/:userId/ratings/:ratingId",  verify_token, updateRating);

module.exports = {ratingRouter};
