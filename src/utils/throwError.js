export function throwError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
