export function parseId(id) {
  const parsed = parseInt(id);

  if (isNaN(parsed)) {
    throwError('Invalid ID', 400);
  }

  return parsed;
}
