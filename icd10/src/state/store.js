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
  isLoaded: false
});

// Actions
export const actions = {
  setDepartment: (id) => store.setState({ departmentId: id }),
  setIcdData: (data, chapters) => store.setState({ icdData: data, chapters, isLoaded: true }),
  setSearchQuery: (query) => store.setState({ searchQuery: query }),
  setSearchFilter: (filterKey) => store.setState({ searchFilter: filterKey }),
  
  // Selection
  setSelectedCodes: (codesArray) => store.setState({ selectedCodes: new Set(codesArray) }),
  toggleCode: (code, isSelected) => {
    const current = new Set(store.getState().selectedCodes);
    if (isSelected) {
      current.add(code);
    } else {
      current.delete(code);
    }
    store.setState({ selectedCodes: current });
  },
  removeCode: (code) => {
    const current = new Set(store.getState().selectedCodes);
    current.delete(code);
    store.setState({ selectedCodes: current });
  },
  toggleCodesBulk: (codesArray, isSelected) => {
    const current = new Set(store.getState().selectedCodes);
    codesArray.forEach(code => {
      if (isSelected) current.add(code);
      else current.delete(code);
    });
    store.setState({ selectedCodes: current });
  }
};
