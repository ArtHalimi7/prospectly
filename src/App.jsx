import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Templates from './pages/Templates';
import Settings from './pages/Settings';
import Login from './pages/Login';

const App = () => {
  return (
    <AuthProvider>
      <main className='bg-[#050507] min-h-screen text-white selection:bg-white/20 selection:text-white font-sans antialiased'>
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Router>
      </main>
    </AuthProvider>
  );
}

export default App;

