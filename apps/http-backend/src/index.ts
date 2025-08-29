import express from "express"
// Update the import path below to the correct relative path where signinSchema is defined, for example:
import signinSchema from "../../common/src/types"
// If signinSchema is not the default export, use:
// import { signinSchema } from "../../common/src/types";
const app = express()

app.use(express.json());

app.post('/auth/v1/signin', function (req, res){
    const data = signinSchema.safeParse(req.body)
    if (!data.success){
        res.json({
            message: "Incorrect input given"
        })
    }

    // check the user

    return res.json({
        message: 'User registered successfully'
    })
})

app.post('/auth/v1/signup', function (req, res){
    const name = req.body.name;
    const password = req.body.password;


    
    return res.json({
        message: 'User logged successfully'
    })
})

app.post('/room', (req, res) => {

})

app.listen(5000)