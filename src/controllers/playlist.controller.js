import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    const owner = req.user?._id;

    if(!name || name.trim() === ""){
        throw new ApiError(400, "Playlist name is required");
    }

    if(!description || description.trim() === ""){
        throw new ApiError(400, "Playlist description is required");
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner
    })

    if(!playlist) {
        throw new ApiError(500, "Something went wrong during creation of playlist");
    }

    return res
        .status(200)
        .json(new ApiResponse(201, playlist, "Playlist created successfully"));
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    
    if(!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User ID");
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $addFields: {
                totalVideos: { $size: "$videos"},
                playlistThumbnail: { $first: "$videos.thumbnail"}
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                playlistThumbnail: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]);


    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "User playlists retrieved successfully"));
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID");
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    const playlistVideos = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
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
                    }
                ]
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, playlistVideos[0], "Playlist fetched successfully"));
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video ID");
    }

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    if(!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    // AUTHORIZATION : Only owner can add a video
    if(playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You don't have permission to add videos to this playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: { videos : videoId} 
        },
        {new: true}
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"));
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Playlist or Video ID");
    }

    const playlist = await Playlist.findByIdAndDelete(playlistId);

    if(!playlist){
        throw new ApiError(404, "Playlist not found");
    }

    // AUTHORIZATION: only owner have permission to remove video from playlist
    if(playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You do not have permission to remove videos from the playlist")
    }

    const updatedPlaylist = await Playlist.findById(
        playlistId,
        {
            $pull: { videos: videoId}
        },
        {new : true}
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID");
    }

    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Authorization: Only the owner can delete the playlist
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You do not have permission to delete this playlist");
    }

    await Playlist.findByIdAndDelete(playlistId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID");
    }

    if (!name || name.trim() === "" || !description || description.trim() === "") {
        throw new ApiError(400, "Name and description are required");
    }

    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Authorization: Only the owner can update the playlist
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You do not have permission to update this playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name,
                description
            }
        },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"));
})


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}