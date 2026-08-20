import AgentAPI from "apminsight";
import "dotenv/config";

import express from "express";
import cors from "cors";
import subjectsRouter from "./routes/subjects.js";
import securityMiddleware from "./middleware/security.js";
import {toNodeHandler} from "better-auth/node";
import {auth} from "./lib/auth.js";

AgentAPI.config();

const app = express();
const PORT = 8000;

app.all('/api/auth/*splat', toNodeHandler(auth));

const frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl) {
    throw new Error("FRONTEND_URL is not defined");
}
app.use(cors({
    origin: frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}))

app.use(express.json())

app.use(securityMiddleware);

app.use('/api/subjects', subjectsRouter);

app.get("/", (req, res) => {
    res.send("Hello, Welcome to Classroom API!");
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});