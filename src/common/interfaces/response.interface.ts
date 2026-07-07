export interface ResponsePayload<T> {
  message?: string;
  data: T;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}
