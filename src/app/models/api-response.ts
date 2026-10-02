export interface ApiResponse<T> {
  Success: boolean;
  Status: number;
  Message: string;
  Data: T;
}
