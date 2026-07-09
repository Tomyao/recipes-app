import app from "../src/app.js";

// Vercel's Node.js runtime treats a default-exported Express app as a request
// handler and invokes it directly (app(req, res)) — no app.listen() needed.
// Paired with server/vercel.json's rewrite, every request under this project
// (regardless of path) is routed to this single function.
export default app;
