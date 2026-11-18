const { httpError } = require("../utils/http");
const monitor = require("../services/monitor");

const notFound = (req, res, next) => next(httpError(404, "Not found"));

function errorHandler(err, req, res, next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message || "Server error";

  if (err.type === "entity.parse.failed") ((status = 400), (message = "Request body is not valid JSON."));
  else if (err.type === "entity.too.large") ((status = 413), (message = "That request is too large."));
  else if (err.name === "CastError") ((status = 400), (message = "Invalid identifier."));
  else if (err.name === "ValidationError")
    ((status = 400), (message = Object.values(err.errors || {})[0]?.message || "Invalid data."));
  else if (err.code === 11000) ((status = 409), (message = "Already exists."));
  else if (err.code === "LIMIT_FILE_SIZE") ((status = 413), (message = "That file is too large (4 MB maximum)."));

  // 5xx details stay in the server log. Clients get a generic message plus the request id to quote to support.
  if (status >= 500) {
    console.error(
      JSON.stringify({ id: req.id, status, error: err.message, stack: err.stack?.split("\n").slice(0, 4).join(" | ") }),
    );
    monitor.report("server-error", { id: req.id, status, path: req.originalUrl.split("?")[0], error: err.message });
    if (!err.expose && !err.status) message = "Something went wrong on our side. Please try again.";
  }
  if (res.headersSent) return res.end();
  res.status(status).json({ error: message, requestId: req.id });
}

module.exports = { notFound, errorHandler };
