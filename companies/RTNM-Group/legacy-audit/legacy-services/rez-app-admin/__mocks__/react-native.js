module.exports = {
  Platform: { OS: 'web', select: (obj) => obj.web || obj.default },
  Alert: { alert: jest.fn() },
  Dimensions: { get: () => ({ width: 1024, height: 768 }) },
  StyleSheet: { create: (styles) => styles },
  AppState: { currentState: 'active', addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
};
