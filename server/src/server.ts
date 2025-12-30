import { Request, Response, NextFunction } from "express";
import { authenthicateDSB, initDSBScraperAPI } from "./dsbscraper";
import { initExamAPI } from "./exams";
import { initICalAPI } from "./ical";
import express from 'express';

const app = express();
const port = 3000; // constants

app.use(function(_req: Request, res: Response, next: NextFunction) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, user, key");
    next();
});


app.get('/ping', (_req: Request, res: Response) => {
    res.send("pong");
});
app.get('/motd', (_req: Request, res: Response) => {
    res.send("Those who snow...");
});

initDSBScraperAPI(app);
initExamAPI(app, authenthicateDSB);
initICalAPI(app);

// 404 handler
app.use((_req: Request, res: Response, _next: NextFunction) => {
    res.status(404).send("404: nicht gefunden");
});
  
// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack); // Log the error for debugging
    res.status(500).send("etwas ist sehr schief gelaufen (sehr schlecht)");
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
