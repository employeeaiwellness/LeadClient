import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Router, { useRouter } from './components/Router';

function AppContent() {
  const { currentPage, navigate } = useRouter();

  return (
    <ProtectedRoute>
      <Layout currentPage={currentPage} onNavigate={navigate}>
        <Router currentPage={currentPage} />
      </Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
