import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import mealdbRouter from "./routes/mealdb.js";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

// Express app configuration only — no app.listen() here. This lets the same
// app be used both by src/index.ts (local dev, via app.listen) and by
// api/index.ts (Vercel serverless function, which calls this handler directly).
const app = express();

app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(
  cors({
    origin: CLIENT_ORIGIN.split(",").map((o) => o.trim()),
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// All TheMealDB traffic is proxied through here — the API key never reaches the client.
app.use("/api", mealdbRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

// Centralized error handler — keeps upstream failures from leaking stack traces.
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err.status ?? 500).json({ error: err.message ?? "Internal server error" });
});

export default app;
