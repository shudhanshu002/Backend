import mongoose, { isValidObjectId } from "mongoose";
import {User} from "../models/user.model.js"
import {Subscription} from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const subscriberId = req.user?._id;

    if(!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    //A user cannot subscribe to its own channel
    if(channelId.toString() === subscriberId.toString()) {
        throw new ApiError(400, "Tou cannot subscribe to your own playlist");
    }

    const subscriptionCriteria = {subscriber: subscriberId, channel: channelId};
    const existingSubscription = await Subscription.findOne(subscriptionCriteria);

    if(existingSubscription){
        // If subscription exist --> unsubscribe
        await Subscription.findByIdAndDelete(existingSubscription._id);
        return res
            .status(200)
            .json(new ApiResponse(200, {} , "Unsubscribed successfully"));
    } else {
        // If subscription not exist --> subscribe
        const newSubscription = await Subscription.create(subscriptionCriteria);
        return res
            .status(201)
            .json(new ApiResponse(201, newSubscription, "Subscribed successfully"))
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel : new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails"
            }
        },
        {
            $unwind: "$subscriberDetails"
        },
        {
            $project: {
                _id: "$subscriberDetails._id",
                username: "$subscriberDetails.username",
                fullName: "$subscriberDetails.fullName",
                avatar: "$subscriberDetails.avatar"
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, subscribers, "Subscribers retrieved successfully"));
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber ID");
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails"
            }
        },
        {
            $unwind: "$channelDetails"
        },
        {
            $project: {
                _id: "$channelDetails._id",
                username: "$channelDetails.username",
                fullName: "$channelDetails.fullName",
                avatar: "$channelDetails.avatar"
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, subscribedChannels, "Subscribed channels retrieved successfully"));
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}