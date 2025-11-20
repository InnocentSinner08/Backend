const asyncHandller = (requestHandler)=>{
    return (req, res, nxt) => {
        Promise.resolve(requestHandler(req,res, nxt))
        .catch((err)=> nxt(err));
    }
}


export {asyncHandller}







//Method : 1
// const asyncHandller= (fn)=> async(req, res, next) =>{ 
//     try{
//         await fn(req,res, next);
//     }
//     catch(err){
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }