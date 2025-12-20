import { asyncHandller } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser = asyncHandller( async(req, res)=> {
    // get user details from frontend
    // validation -> not empty
    // check if user already exist

    const {fullName,email, username, password} = req.body
    // if(fullName === ""){
    //     throw new ApiError(400, "Full name is required")
    // }

    console.log(req.body)

    if(
        [fullName, email, username, password].some((field)=> field?.trim()==="")
    ){
        throw new ApiError(400, "All fields are necessary")
    }

    const existedUser= await User.findOne({
        $or: [{username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409, "User with username or email exist")
    }
    console.log(req.files)
    const avatarLocalPath= req.files?.avatar[0]?.path;
    const coverImageLocalPath= req.files?.coverimage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required")
    }

    const avatar_cloudinary = await uploadOnCloudinary(avatarLocalPath)
    const coverImage_cloudinary = await uploadOnCloudinary(coverImageLocalPath)
    console.log(avatar_cloudinary)
    if(!avatar_cloudinary){
        throw new ApiError(400, "Avatar is necessary")
    }
    
    const user = await User.create({
        fullName,
        avatar: avatar_cloudinary.url,
        coverimage: coverImage_cloudinary?.url || "",
        email,
        password,
        username: username.toLowerCase()
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