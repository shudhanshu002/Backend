import mongoose from "mongoose";
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";


const toggleVideoLike = asyncHandler(async (req,res) =>{
    const {videoId} = req.params;
    const userId = req.user?._id;

    if(!videoId) {
        throw new ApiError(400, "Video ID is required");
    }

    const video = await Video.findById(videoId);
    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    const likeCriteria = {video: videoId, likedBy: userId};
    const alreadyLiked = await Like.findOne(likeCriteria);

    if(alreadyLiked){
        //user already liked , so unlike 
        await Like.findByIdAndDelete(alreadyLiked._id);
        return res.status(201).json(new ApiResponse(200 , {} , "Like removed"));
    } else {
        //USer not liked , so like the video
        const newLike = await Like.create(likeCriteria);
        return res.status(201).json(new ApiResponse(201, newLike , "Like added"));
    }
})

const toggleCommentLike = asyncHandler(async(req, res) => {
    const {commentId} = req.params;
    const userID = req.user?._id;

    if(!commentId) {
        throw new ApiError(400, "Comment Id is required");
    }

    const comment = await Comment.findById(commentId);
    if(!comment) {
        throw new ApiError(404, "Comment not found");
    }

    //make like doc
    const likeCriteria = {comment: commentId, likedBy:userId};
    const alreadyLiked = await Like.findOne(likeCriteria);

    if(alreadyLiked){
        //unlike it
        await Like.findByIdAndDelete(alreadyLiked._id);
        return res.status(200).json(new ApiResponse(200, {}, "Like removed"))
    } else {
        //like it
        const newLike = await Like.create(likeCriteria);
        return res.status(201).json(new ApiResponse(201, newLike, "Like added"))
    }
})

const toggleTweetLike = asyncHandler(async(req,res)=> {
    const {tweetId} = req.params;
    const userId = req.user?._id;

    if(!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    const tweet = await Tweet.findById(tweetId);
    if(!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    const likeCriteria = { tweet: tweetId, likedBy:userId};
    const alreadyLiked = await Like.findOne(likeCriteria);

    if (alreadyLiked) {
        await Like.findByIdAndDelete(alreadyLiked._id);
        return res.status(200).json(new ApiResponse(200, {}, "Like removed"));
    } else {
        const newLike = await Like.create(likeCriteria);
        return res.status(201).json(new ApiResponse(201, newLike, "Like added"));
    }
})

const getLikedVideos = asyncHandler(async(req,res)=> {
    const userId = req.user?._id;

    const likedVideos = await Like.aggregate([
        {
            // filter out all liked video by curr user from Like collection
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId),
                video: {$exists: true}
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails",
                pipeline: [
                    {
                        $lookup: {
                            from:"users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails"
                        }
                    },
                    {
                        $unwind: "$ownerDetails"
                    }
                ]
            }
        },
        {
            $unwind: "$videoDetails"
        },
        {
            $project: {
                _id: "$videoDetails._id",
                title: "$videoDetails.title",
                thumbnail : "$videoDetails.thumbnail",
                duration: "$videoDetails.duration",
                views: "$videoDetails.views",
                createdAt: "$videoDetails.createdAt",
                owner: {
                    _id: "$videoDetails.ownerDetails._id",
                    username: "$videoDetails.ownerDetails.username",
                    fullname: "$videoDetails.ownerDetails.fullname",
                    avatar : "$videoDetails.ownerDetails.avatar"
                }
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, likedVideos, "Liked videos retrieved successfully"));
})


export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}