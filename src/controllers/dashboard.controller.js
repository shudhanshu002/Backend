import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userId = req.user?._id;

    // // Get total videos
    // const totalVideos = await Video.countDocuments({owner: userId});

    // // Get total subscribers
    // const totalSubscribers = await Subscription.countDocuments({channel: userId});

    // // Get total video using aggregation
    // const videoStats = await Video.aggregate([
    //     {
    //         $match: {
    //             owner: new mongoose.Types.ObjectId(userId)
    //         }
    //     },
    //     {
    //         $group: {
    //             _id: null,
    //             totalViews: {$sum : "$views"}
    //         }
    //     }
    // ]);

    // const totalViews = videoStats[0]?.totalViews || 0;

    // // Get total likes on all videos of the channel
    // const totalLikes = await Like.countDocuments({
    //     video: {
    //         $in: await Video.find({ owner: userId }).select('_id')
    //     }
    // });

    // Improved code to reduce DB calls
    //Run all DB Queries parallel
    const [
        totalVideos,
        totalSubscribers,
        videoStats,
        totalLikes
    ] = await Promise.all([
        Video.countDocuments({owner: userId}),
        Subscription.countDocuments({channel: userId}),
        Video.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $group: {
                    _id: null,
                    totalViews: {$sum : "$views"}
                }
            }
        ]),
        Like.countDocuments({
            video: {
                $in: await Video.find({ owner: userId }).select('_id')
            }
        })
    ]);

    const totalViews = videoStats[0]?.totalViews || 0;

    const stats = {
        totalVideos,
        totalSubscribers,
        totalViews,
        totalLikes
    };

    return res
        .status(200)
        .json(new ApiResponse(200, stats, "Channel stats retrieved successfully"));
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // Get all the videos uploaded by the channel
    const userId = req.user?._id;

    const videos = await Video.find({ owner: userId }).sort({ createdAt: -1 });

    if (!videos) {
        throw new ApiError(500, "Something went wrong while fetching channel videos");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Channel videos retrieved successfully"));
})

export {
    getChannelStats, 
    getChannelVideos
}