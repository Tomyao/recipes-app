import app from "./app.js";

// Local dev / traditional Node hosting entrypoint. Not used on Vercel — there,
// api/index.ts imports the same app and Vercel's Node runtime calls it directly
// per-request instead of binding a port.
const PORT = Number(process.env.PORT ?? 5174);

app.listen(PORT, () => {
  console.log(`Recipes proxy server listening on http://localhost:${PORT}`);
});
