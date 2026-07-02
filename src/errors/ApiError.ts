import { AppError } from "./AppError";

export class ApiError extends AppError {
  readonly endpoint?: string; // which URL failed
  readonly data?: any;

  constructor(message: string, statusCode: number, endpoint?: string, data?: any) {
    super(message, `API_${statusCode}`, statusCode);
    this.name = "ApiError";
    this.endpoint = endpoint;
    this.data = data;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static fromResponse(
    status: number,
    message: string,
    endpoint?: string,
    data?: any
  ): ApiError {
    return new ApiError(message, status, endpoint, data);
  }
}
