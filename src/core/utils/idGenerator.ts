export const idGenerator = {
  generate: (prefix: string = 'id') => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `${prefix}-${timestamp}-${random}`;
  },
  generateSafeId: (prefix: string = 'safe') => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
};