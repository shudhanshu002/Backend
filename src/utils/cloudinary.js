import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        //upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        //file has been uploaded sucessfully
        //console.log("file is uploaded on cloudinary",response.url);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        console.log("--- ERROR UPLOADING TO CLOUDINARY ---");
        console.log(process.env.CLOUDINARY_API_KEY)
        console.log(error); // This will print the real error from Cloudinary
        fs.unlinkSync(localFilePath) //remove the locally saved temporariy file as upload got failed
        return null;
    }
}

// deletion on cloudinary
const deleteFromCloudinary = async(url, resource_type = 'image') => {
    try {
        if(!url) return null;

        const publicId = url.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId, {resource_type});
    } catch (error) {
        console.log("Error while deleting from Cloudinary: ", error);
    }
}

export {uploadOnCloudinary, deleteFromCloudinary};