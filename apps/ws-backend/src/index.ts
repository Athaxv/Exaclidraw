import { WebSocketServer } from 'ws';
import { JWT_SECRET } from './config';
import jwt from "jsonwebtoken"

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", function connection(ws, request){
    const url = request.url;
    if (!url){
        return;
    }
    const queryParams = new URLSearchParams(url.split('?')[1]);
    const token = queryParams.get('token')

    const decode = jwt.verify(token ?? "", JWT_SECRET)
    // @ts-ignore   TODO
    if (!decode || !decode.userId){
        ws.close();
        return;
    }

    ws.on('message', function message(data){
        console.log('Received: $s', data)
    })

})