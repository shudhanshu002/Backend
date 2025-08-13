import { Router } from "express";
import { addComment, deleteComment, getVideoComments, updateComment } from "../controllers/comment.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

// For commenting apply verification first
router.use(verifyJWT);

router.route("/:videoId").get(getVideoComments).post(addComment);
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);

export default router