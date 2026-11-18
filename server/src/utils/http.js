/** Wraps an async route handler so rejected promises reach the error middleware. */
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Creates an Error carrying an HTTP status for the error middleware. */
const httpError = (status, message) => Object.assign(new Error(message), { status });

module.exports = { h, httpError };
