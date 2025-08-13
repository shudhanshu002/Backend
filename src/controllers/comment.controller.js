import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async(req,res) => {
    
    const {videoId} = req.params
    const {page=1, limit=10} = req.query

    if(!videoId) {
        throw new ApiError(400, "Video ID is required");
    }

    // verifying video exist
    const video = await Video.findById(videoId)
    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as : "ownerDetails"
            }
        },
        {
            $unwind: "$ownerDetails"
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                owner: {
                    username: "$ownerDetails.username",
                    avatar: "$ownerDetails.avatar"
                }
            }
        },
        {
            $sort: {createdAt: -1}
        }
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const comments = await Comment.aggregatePaginate(commentsAggregate, options);

    return res 
        .status(200)
        .json(new ApiResponse (200, comments, "Comments retrived succesfully"))
})

const addComment = asyncHandler(async (req,res) => {
    const {videoId} = req.params;
    const {content} = req.body;

    if(!content || content.trim() === "") {
        throw new ApiError(400, "Content is required");
    }


    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "Video not Found");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id
    })

    if(!comment) {
        throw new ApiError(500,"Failes to add Comment");
    }

    return res
        .status(201)
        .json(new ApiResponse
            (201, comment, "Comments added successfully")
        )
});

const updateComment = asyncHandler(async(req,res) => {
    const {commentId} = req.params;
    const {content} = req.body;

    if(!content || content.trim() === ""){
        throw new ApiError(400, "Content is required");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // Authorization: Only the owner can update the comment
    if(comment.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403, "You do not have permission to update this comment");
    }

    //updating
    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content
            }
        },
        {new: true}
    );

    if(!updateComment){
        throw new ApiError(500, "Failed to update comment");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
})


const deleteComment = asyncHandler(async(req,res)=> {
    const {commentId } = req.params;

    const comment = await Comment.findById(commentId);

    if(!comment) {
        throw new ApiError(404, "Comment not found");
    }

    //Authrization: Only the owner can delete their comment
    if(comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, " You do not have permission to delete other's comment")
    }

    await Comment.findByIdAndDelete(commentId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment deleted successfully"));
})


export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}