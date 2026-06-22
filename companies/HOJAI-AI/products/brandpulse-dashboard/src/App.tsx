import { Dashboard } from './pages/Dashboard';

function App() {
  const brandId = new URLSearchParams(window.location.search).get('brandId') || 'demo-brand';
  return <Dashboard brandId={brandId} />;
}

export default App;
