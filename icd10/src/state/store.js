import { FirebaseService } from '../firebase/index.js';

export class Store {
  constructor(initialState = {}) {
    this.state = initialState;
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener); // unsubscribe function
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

// Global Store Instance
export const store = new Store({
  departmentId: null,
  icdData: [], // raw list of all icds
  chapters: [], // hierarchical structure
  selectedCodes: new Set(), // Set of selected ICD codes
  searchQuery: '',
  searchFilter: null,
  isLoaded: false,
  autoSave: true, // Auto-save enabled by default
  leaderboard: [] // Leaderboard data
});

// Actions
export const actions = {
  setDepartment: (id) => store.setState({ departmentId: id }),
  setIcdData: (data, chapters) => store.setState({ icdData: data, chapters, isLoaded: true }),
  setSearchQuery: (query) => store.setState({ searchQuery: query }),
  setSearchFilter: (filterKey) => store.setState({ searchFilter: filterKey }),
  setAutoSave: (value) => store.setState({ autoSave: value }),
  setLeaderboard: (data) => store.setState({ leaderboard: data }),
  
  // Selection
  setSelectedCodes: (codesArray) => store.setState({ selectedCodes: new Set(codesArray) }),
  toggleCode: (code, isSelected) => {
    const state = store.getState();
    const current = new Set(state.selectedCodes);
    if (isSelected) {
      current.add(code);
      if (state.autoSave && state.departmentId) FirebaseService.updateSelectionDiff(state.departmentId, [code], []);
    } else {
      current.delete(code);
      if (state.autoSave && state.departmentId) FirebaseService.updateSelectionDiff(state.departmentId, [], [code]);
    }
    store.setState({ selectedCodes: current });
  },
  removeCode: (code) => {
    const state = store.getState();
    const current = new Set(state.selectedCodes);
    current.delete(code);
    if (state.autoSave && state.departmentId) FirebaseService.updateSelectionDiff(state.departmentId, [], [code]);
    store.setState({ selectedCodes: current });
  },
  toggleCodesBulk: (codesArray, isSelected) => {
    const state = store.getState();
    const current = new Set(state.selectedCodes);
    const added = [];
    const removed = [];
    codesArray.forEach(code => {
      if (isSelected) {
        current.add(code);
        added.push(code);
      } else {
        current.delete(code);
        removed.push(code);
      }
    });
    if (state.autoSave && state.departmentId) FirebaseService.updateSelectionDiff(state.departmentId, added, removed);
    store.setState({ selectedCodes: current });
  }
};
