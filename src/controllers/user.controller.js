import { asyncHandller } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser = asyncHandller( async(req, res)=> {
    // get user details from frontend
    // validation -> not empty
    // check if user already exist

    const {fullName,email, userName, password} = req.body
    // if(fullName === ""){
    //     throw new ApiError(400, "Full name is required")
    // }

    if(
        [fullName, email, userName, password].some((field)=> field?.trim()==="")
    ){
        throw new ApiError(400, "All fields are necessary")
    }

    const existedUser= User.findOne({
        $or: [{userName}, {email}]
    })

    if(existedUser){
        throw new ApiError(409, "User with username or email exist")
    }

    const avatarLocalPath= req.files?.avatar[0]?.path;
    const coverImageLocalPath= req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required")
    }

    const avatar_cloudinary = await uploadOnCloudinary(avatarLocalPath)
    const coverImage_cloudinary = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar_cloudinary){
        throw new ApiError(400, "Avatar is necessary")
    }
    
    const user = await User.create({
        fullName,
        avatar: avatar_cloudinary.url,
        coverImage: coverImage_cloudinary?.url || "",
        email,
        password,
        userName: userName.toLowerCase()
    })
    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "User not created")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created successfully")
    )

} )

export {registerUser}