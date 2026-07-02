export class AppError extends Error {
  readonly code: string; // string identifier
  readonly statusCode: number; // http status

  constructor(message: string, code: string, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;

    // Fix prototype chain for ES5/TS transpilation
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
