import { useEffect, useMemo } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import StudentsDashboardHero from '../components/studentDashboard/StudentsDashboardHero';
import Careers360StyleHome from '../components/studentDashboard/careers360/Careers360StyleHome';
import { readOrganicRankLeadSnapshot } from '../utils/organicRankLeadLocal';
import {
  getAllWorkspaceTools,
  SEARCH_SUGGESTIONS,
  WORKSPACE_SECTIONS,
} from '../constants/studentWorkspaceTools';

export default function StudentsDashboard() {
  const organicLead = readOrganicRankLeadSnapshot();
  const location = useLocation();
  const {
    searchTerm,
    setSearchTerm,
    showSuggestions,
    setShowSuggestions,
    onClearSearch,
    openOneOnOneBooking,
  } = useOutletContext();

  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, setSearchTerm]);

  const allTools = useMemo(() => getAllWorkspaceTools(), []);

  const autocompleteSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return SEARCH_SUGGESTIONS;
    const query = searchTerm.toLowerCase().trim();
    return SEARCH_SUGGESTIONS.filter((s) => s.toLowerCase().includes(query));
  }, [searchTerm]);

  const filteredTools = useMemo(() => {
    if (!searchTerm.trim()) return allTools;
    const query = searchTerm.toLowerCase().trim();
    return allTools.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.sectionLabel.toLowerCase().includes(query) ||
        t.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [searchTerm, allTools]);

  const filteredBySection = useMemo(() => {
    const grouped = Object.fromEntries(WORKSPACE_SECTIONS.map((s) => [s.id, []]));
    filteredTools.forEach((tool) => {
      if (grouped[tool.sectionId]) grouped[tool.sectionId].push(tool);
    });
    return grouped;
  }, [filteredTools]);

  const hasSearch = Boolean(searchTerm.trim());

  const searchProps = {
    searchTerm,
    onSearchChange: setSearchTerm,
    onSearchFocus: () => setShowSuggestions(true),
    onSearchBlur: () => setTimeout(() => setShowSuggestions(false), 200),
    suggestions: autocompleteSuggestions,
    showSuggestions,
    onSuggestionPick: setSearchTerm,
    onClearSearch,
  };

  return (
    <>
      <StudentsDashboardHero {...searchProps} />
      <Careers360StyleHome
        organicLead={organicLead}
        hasSearch={hasSearch}
        filteredTools={filteredTools}
        filteredBySection={filteredBySection}
        onClearSearch={onClearSearch}
        onBookCounselling={openOneOnOneBooking}
      />
    </>
  );
}
