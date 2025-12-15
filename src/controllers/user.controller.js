import { asyncHandller } from "../utils/asyncHandler.js";

const registerUser = asyncHandller( async(req, res)=> {
    res.status(200).json({
        message:"ok"
    })
} )

export {registerUser}