// Global test setup for admin app
(global as any).__DEV__ = false;
(global as any).fetch = jest.fn();
