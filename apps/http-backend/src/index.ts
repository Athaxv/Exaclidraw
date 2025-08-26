import express from "express"
const app = express()

app.use(express.json());

app.post('/auth/v1/signin', function (req, res){
    const name = req.body.name;
    const password = req.body.password;

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