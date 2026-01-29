export const resolveBatchStatus = (batch) => {
  if (batch.status === 'CLOSED') return 'CLOSED';

  const now = new Date();

  if (now < batch.start_date) return 'OPEN';
  if (now <= batch.end_date) return 'ONGOING';
  return 'FINISHED';
};
