import express from "express";
import dotenv from "dotenv";
const app = express();
dotenv.config();
const port = process.env.PORT || 3000;

app.get('/', (req: any, res: any) => {
    res.send("Hello World");
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});