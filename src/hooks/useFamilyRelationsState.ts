import { useState, useCallback } from 'react';

interface FamilyRelationsState {
  selectedFamilyKey: string | null;
  searchTerm: string;
  activeTab: 'list' | 'tree';
}

export function useFamilyRelationsState() {
  const [state, setState] = useState<FamilyRelationsState>({
    selectedFamilyKey: null,
    searchTerm: '',
    activeTab: 'list',
  });

  const setSelectedFamilyKey = useCallback((key: string | null) => {
    setState(prev => ({ ...prev, selectedFamilyKey: key }));
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    setState(prev => ({ ...prev, searchTerm: term }));
  }, []);

  const setActiveTab = useCallback((tab: 'list' | 'tree') => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const navigateToTree = useCallback((familyKey: string) => {
    setState({
      selectedFamilyKey: familyKey,
      searchTerm: state.searchTerm,
      activeTab: 'tree',
    });
  }, [state.searchTerm]);

  const resetSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedFamilyKey: null }));
  }, []);

  return {
    ...state,
    setSelectedFamilyKey,
    setSearchTerm,
    setActiveTab,
    navigateToTree,
    resetSelection,
  };
}
