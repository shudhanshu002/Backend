import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    const pipeline = [];

    // Match videos based on the search query (title or description)
    if (query) {
        pipeline.push({
            $search: {
                index: "search-videos", // Make sure you have a search index named 'search-videos' on your collection
                text: {
                    query: query,
                    path: ["title", "description"]
                }
            }
        });
    }

    // Match videos by a specific user if userId is provided
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId");
        }
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        });
    }

    // Only fetch published videos
    pipeline.push({ $match: { isPublished: true } });

    // Sorting logic
    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        });
    } else {
        // Default sort by creation date
        pipeline.push({ $sort: { createdAt: -1 } });
    }
    
    // Add owner details to each video
    pipeline.push({
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "ownerDetails"
        }
    },
    {
        $unwind: "$ownerDetails"
    });

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const video = await Video.aggregatePaginate(pipeline, options);

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title || title.trim() === "" || !description || description.trim() === "") {
        throw new ApiError(400, "Title and description are required");
    }

    const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is required");
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile) {
        throw new ApiError(500, "Failed to upload video file");
    }
    if (!thumbnail) {
        throw new ApiError(500, "Failed to upload thumbnail");
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        duration: videoFile.duration, // Assuming Cloudinary provides duration
        owner: req.user?._id
    });

    return res
        .status(201)
        .json(new ApiResponse(201, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                videoFile: 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                likesCount: 1,
                isLiked: 1,
                owner: {
                    username: 1,
                    avatar: 1,
                    fullName: 1
                }
            }
        }
    ]);

    if (!video.length) {
        throw new ApiError(404, "Video not found");
    }

    // Increment views and add to watch history
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    await User.findByIdAndUpdate(req.user?._id, { $addToSet: { watchHistory: videoId } });

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailLocalPath = req.file?.path;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    if (!title && !description && !thumbnailLocalPath) {
        throw new ApiError(400, "At least one field (title, description, or thumbnail) is required to update");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You do not have permission to update this video");
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;

    if (thumbnailLocalPath) {
        // Get the old thumbnail URL before updating
        const oldThumbnailUrl = video.thumbnail;


        const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (!newThumbnail?.url) {
            throw new ApiError(500, "Failed to upload new thumbnail");
        }
        updateData.thumbnail = newThumbnail.url;

        // Delete old video from cloudnary
        if(oldThumbnailUrl) {
            await deleteFromCloudinary(oldThumbnailUrl)
        }
    }

    const updatedVideo = await Video.findByIdAndUpdate(videoId, { $set: updateData }, { new: true });

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You do not have permission to delete this video");
    }

    // Delete from cloudinary
    if(video.videoFile){
        await deleteFromCloudinary(video.videoFile, "video");
    }
    if (video.thumbnail) {
        await deleteFromCloudinary(video.thumbnail, "image");
    }

    // Delete video document from DB
    await Video.findByIdAndDelete(videoId);

    // Delete associated likes and comments
    await Like.deleteMany({ video: videoId });
    await Comment.deleteMany({ video: videoId });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You do not have permission to change the publish status");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished
            }
        },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, { isPublished: updatedVideo.isPublished }, "Publish status toggled successfully"));
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
};