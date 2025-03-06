/**
 * Custom error class for API responses
 * Extends the built-in Error class to include a statusCode
 */
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = ErrorResponse;
