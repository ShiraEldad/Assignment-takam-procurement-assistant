import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { answerQuestion } from "./question.js";

const app = express();
const port = Number(process.env.PORT) || 3000;
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(currentDirectory, "..");

app.use(express.json({ limit: "16kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/api/ask", async (request, response, next) => {
  const question =
    typeof request.body?.question === "string"
      ? request.body.question.trim()
      : "";

  if (!question || question.length > 500) {
    response.status(400).json({
      error: "יש להזין שאלה באורך של 1 עד 500 תווים.",
    });
    return;
  }

  try {
    response.json(await answerQuestion(question));
  } catch (error) {
    next(error);
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(projectDirectory, "dist")));
  app.get("*", (_request, response) => {
    response.sendFile(path.join(projectDirectory, "dist", "index.html"));
  });
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    root: projectDirectory,
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

app.use((error, _request, response, _next) => {
  if (error.type === "entity.parse.failed") {
    response.status(400).json({
      error: "גוף הבקשה חייב להיות JSON תקין.",
    });
    return;
  }

  if (error.type === "entity.too.large") {
    response.status(413).json({
      error: "גוף הבקשה חורג מהגודל המותר.",
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: "אירעה שגיאה בעיבוד הבקשה. נסו שוב מאוחר יותר.",
  });
});

app.listen(port, () => {
  console.log(`Takam assistant is listening on http://localhost:${port}`);
});
