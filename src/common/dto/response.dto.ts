export class ResponseDto<T> {
  message?: string;
  data!: T;
}
