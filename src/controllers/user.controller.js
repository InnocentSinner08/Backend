import { asyncHandller } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import jwt from "jsonwebtoken"
const generateAccessAndRefreshTokens= async(userId) => {
    try {
        const user = await User.findById(userId)
        const accesssToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken= refreshToken;
        await user.save({validateBeforeSave: false})

        return {accesssToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while Generating access and refresh token ")
    }
}

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

})

const loginUser = asyncHandller( async(req, res)=>{
        // get email and password -> necessary
        // generate access token for them
        // ttl for refresh token

        const {email, username, password} = req.body

        if(!(username || email)){
            throw new ApiError(400, "username or email is required")
        }

        const user = await User.findOne(
            {
                $or: [{username}, {email}]
            }
        )
        if(!user){
            throw new ApiError(404, "User does not exist")
        }
        const isPasswordValid = await user.isPasswordCorrect(password)

        if(!isPasswordValid){
            throw new ApiError(401, "Invalid user credential")
        }

        const {accesssToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

        const loggedInUser= await User.findById(user._id).select(
            "-password -refreshToken"
        )

        const options = {
            httpOnly: true,
            secure: true
        }
        return res.status(200).cookie("accessToken", accesssToken, options).cookie("refreshToken", refreshToken, options).json(
            new ApiResponse(200, {
                user: loggedInUser, accesssToken, refreshToken
            }, "user logged in Successfully")
        )
})

const logoutUser= asyncHandller( async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new:true
        }
    )
    const options= {
        httpOnly: true,
        secure: true
    }
    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json( new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken= asyncHandller(async(req, res)=>{
    const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken= jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError(401, "Invalide Refresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accesssToken, newrefreshToken}= await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200).cookie("accessToken", accesssToken, options).cookie("refreshToken", newrefreshToken, options).json(
            new ApiResponse(200, {accesssToken, refreshToken: newrefreshToken}, "Access Token refreshed")
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh Token")
    }
})

const changeCurrentUserPassword = asyncHandller( async(req, res)=>{
    const {oldPassword, newPassword}= req.body;
    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }

    user.password= newPassword;
    await user.save({validateBeforeSave: false})

    return res.status(200).json(new ApiResponse(200, {}, "Password Changed Successfully"))
})

const getCurrentUser= asyncHandller( async(req, res)=>{
    return res.status(200).json(new ApiResponse(200,req.user, "Current User fetched successfully"))
})

const updateAccountDetail = asyncHandller( async(req, res)=>{
    const {fullName, email}= req.body

    if(!(fullName || email)){
        throw new ApiError(400, "All fields are required")
    }

    const user= await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        }, 
        {new : true}
    ).select("-passoword -refreshToken")

    return res.status(200).json(new ApiResponse(200, user, "Account details updated" ))
})
const updateUserCoverImage = asyncHandller(async(req, res)=>{
    const coverImageLocalPath= req.file?.path;
    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image path is missing");
    }

    const coverimage= uploadOnCloudinary(coverImageLocalPath)
    if(!coverimage.url){
        throw new ApiError(400, "Error in uploading the cover Image to cloudinary")
    }

    const user = await User.findByIdAndUpdate(res.user?._id,
        {
            $set: {
                coverimage: coverimage.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    return res.status(200).json(new ApiResponse(200, user, "Cover image updated successfully"))
})
const updateUserAvatar= asyncHandller( async(req, res)=> {
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is missing")
    }
    const avatar= await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Error in uploading to cloundinary ")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new : true}
    ).select("-password -refreshToken")

    return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"))


})
export {registerUser, loginUser, logoutUser, changeCurrentUserPassword, getCurrentUser,updateAccountDetail, updateUserAvatar, updateUserCoverImage, refreshAccessToken}