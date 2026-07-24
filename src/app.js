const express = require("express");
const logger = require("./utils/logger");
const routes = require("./routes");
const { handleStripeWebhook } = require("./controllers/stripe");
const cors = require("cors");
const app = express();

app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

app.get("/api/test", (req, res) => {
  res.send({ message: "API is working!" });
});

app.use("/api", routes);

app.use((err, req, res, next) => {
  logger.error(`${err.message} - ${req.method} ${req.originalUrl}`);
  res.status(500).send({ error: "Something went wrong" });
});

module.exports = app;
