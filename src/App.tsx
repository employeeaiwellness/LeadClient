import { AuthProvider } from './contexts/AuthContext';
import { FormsProvider } from './contexts/FormsContext';
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
      <FormsProvider>
        <AppContent />
      </FormsProvider>
    </AuthProvider>
  );
}

export default App;
