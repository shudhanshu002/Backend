import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Like } from "../models/like.model.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body;
    const owner = req.user?._id;

    if(!content || content.trim() === ""){
        throw new ApiError(400, "Content is required to create a Tweet")
    }

    const tweet = await Tweet.create({
        content,
        owner
    });

    if(!tweet){
        throw new ApiError(500,"Something went wrong while creating the tweet");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, tweet, "Tweet created succesfully"));
})

const getUserTweets = asyncHandler(async (req, res) => {
    const {userId} = req.params;

    if(!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const tweets = await Tweet.aggregate([
        {
            //Filter the tweets by curr user
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            // Gather user information
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            // Retrive likes for curr user's tweet
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes"
            }
        },
        {
            // likesCount and isLiked field
            $addFields: {
                likesCount: { $size: "$likes"},
                owner: { $first: "$ownerDetails"},
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                content: 1,
                likesCount : 1,
                createdAt: 1,
                isLiked: 1,
                owner: {
                    username: 1,
                    avatar: 1
                }
            }
        },
        {
            $sort: {createdAt: -1}
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "USer tweets retrieved successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;
    const {content} = req.body;

    if(!isValidObjectId(tweetId)){
        throw new ApiError(404, "Invalid tweet ID")
    }

    if(!content || content.trim() === "") {
        throw new ApiError(400, "Content cannot be empty");
    }

    const tweet = await Tweet.findById(tweetId);

    if(!tweet){
        throw new ApiError(404, "Tweet not found");
    }


    //Authorization: Check if logged-in user is the owner of the tweet
    if(tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "Tou do not have permission to update this tweet");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {content}
        },
        {new: true}
    );

    if(!updateTweet) {
        throw new ApiError(500, "Failed to update the tweet");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;

    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    const tweet = await Tweet.findById(tweetId);

    if(!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    //Authorization : only logged-in user is owner of the tweet
    if(tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "Tou do not have permission to delete this Tweet")
    }

    await Tweet.findByIdAndDelete(tweetId);

    await Like.deleteMany({tweet: tweetId});

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Tweet deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}