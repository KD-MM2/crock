export function createLocalId(prefix = 'id') {
  return `${prefix}-${crypto.randomUUID()}`;
}
