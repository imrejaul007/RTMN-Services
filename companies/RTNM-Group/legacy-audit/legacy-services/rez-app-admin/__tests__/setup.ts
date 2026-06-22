// After-env setup — extend matchers, reset mocks, etc.
beforeEach(() => {
  (global.fetch as jest.Mock).mockReset();
});
