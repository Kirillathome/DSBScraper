import { Request, Response, NextFunction } from "express";
import { authenthicateDSB, initDSBScraperAPI } from "./dsbscraper";
import { initExamAPI } from "./exams";
import { initICalAPI } from "./ical";
import express from 'express';
import { initTimetableAPI } from "./timetables";

const app = express();
const port = 3000; // constants

app.use(function(_req: Request, res: Response, next: NextFunction) {
    res.header("Access-Control-Allow-Origin", "*");
    // wtf is an Authorization header? never heard of it. just use the perfectly safe and convenient user and key headers instead! <3
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, user, key");
    next();
});


app.get('/ping', (_req: Request, res: Response) => {
    res.send("pong");
});
app.get('/motd', (_req: Request, res: Response) => {
    res.send("Those who know...");
});

initDSBScraperAPI(app);
initExamAPI(app, authenthicateDSB);
initICalAPI(app, authenthicateDSB);
initTimetableAPI(app, authenthicateDSB);

// 404 handler
app.use((_req: Request, res: Response, _next: NextFunction) => {
    res.status(404).send("Not found.");
});
  
// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack); // Log the error for debugging
    res.status(500).send("Oh well, that's unfortunate.");
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
