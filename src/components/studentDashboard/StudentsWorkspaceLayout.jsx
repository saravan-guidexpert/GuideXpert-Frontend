import { useMemo, useState, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Careers360Navbar from './careers360/Careers360Navbar';
import Careers360Footer from './careers360/Careers360Footer';
import StudentAuthModal from '../studentAuth/StudentAuthModal';
import OneOnOneSessionModal from '../oneOnOneSession/OneOnOneSessionModal';
import { StudentAuthProvider } from '../../contexts/StudentAuthContext';

export default function StudentsWorkspaceLayout() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [oneOnOneBookingOpen, setOneOnOneBookingOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const openOneOnOneBooking = useCallback(() => setOneOnOneBookingOpen(true), []);
  const closeOneOnOneBooking = useCallback(() => setOneOnOneBookingOpen(false), []);

  const handleSearchKeyDown = (e) => {
    if (e.key !== 'Enter' || location.pathname === '/') return;
    const query = searchTerm.trim();
    if (!query) return;
    e.preventDefault();
    navigate('/', { state: { searchTerm: query } });
  };

  const outletContext = useMemo(
    () => ({
      searchTerm,
      setSearchTerm,
      showSuggestions,
      setShowSuggestions,
      onClearSearch: () => setSearchTerm(''),
      openOneOnOneBooking,
    }),
    [searchTerm, showSuggestions, openOneOnOneBooking]
  );

  return (
    <StudentAuthProvider>
      <div className="flex min-h-screen flex-col bg-white font-sans text-[#333]">
        <Careers360Navbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearchFocus={() => setShowSuggestions(true)}
          onSearchBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onSearchKeyDown={handleSearchKeyDown}
        />
        <Outlet context={outletContext} />
        <Careers360Footer />
        <StudentAuthModal />
        <OneOnOneSessionModal open={oneOnOneBookingOpen} onClose={closeOneOnOneBooking} />
      </div>
    </StudentAuthProvider>
  );
}
