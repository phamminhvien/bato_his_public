import { FirebaseService } from '../firebase/index.js';

export class Store {
  constructor(initialState = {}) {
    this.state = { 
      currentUser: null, // { email, name, avatar, role, maKhoa }
      deviceId: 'device_' + Math.random().toString(36).substr(2, 9),
      ...initialState 
    };
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  canEditCurrentDepartment() {
    const { currentUser, departmentId, showMergedCatalog } = this.state;
    if (!currentUser || !currentUser.role) return false;
    if (departmentId === '51011' && showMergedCatalog) return false; // Khóa khi bật chế độ hợp nhất
    if (currentUser.role === 'super_admin') return true;
    if (departmentId === '51011') return false; // Chỉ super_admin mới được sửa riêng Phòng KHNV
    if (currentUser.role === 'admin' && currentUser.maKhoa === departmentId) return true;
    return false;
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
  selectedMetadata: {}, // { code: { email, name, timestamp } }
  searchQuery: '',
  searchFilter: null,
  isLoaded: false,
  autoSave: true, // Auto-save enabled by default
  leaderboard: [], // Leaderboard data
  showMergedCatalog: false // merged catalog mode for 51011
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
  setSelectedCodes: (codes, metadata = {}, removedMetadata = {}) => store.setState({ selectedCodes: new Set(codes), selectedMetadata: metadata, removedMetadata: removedMetadata }),
  setUserInfo: (user) => store.setState({ currentUser: user }),
  setShowMergedCatalog: (value) => store.setState({ showMergedCatalog: value }),
  toggleCode: (code, isSelected) => {
    const state = store.getState();
    const current = new Set(state.selectedCodes);
    const userWithDevice = state.currentUser ? { ...state.currentUser, deviceId: state.deviceId } : null;
    if (isSelected) {
      current.add(code);
      if (state.autoSave && state.departmentId && store.canEditCurrentDepartment()) FirebaseService.updateSelectionDiff(state.departmentId, [code], [], userWithDevice);
    } else {
      current.delete(code);
      if (state.autoSave && state.departmentId && store.canEditCurrentDepartment()) FirebaseService.updateSelectionDiff(state.departmentId, [], [code], userWithDevice);
    }
    store.setState({ selectedCodes: current });
  },
  removeCode: (code) => {
    const state = store.getState();
    const current = new Set(state.selectedCodes);
    current.delete(code);
    const userWithDevice = state.currentUser ? { ...state.currentUser, deviceId: state.deviceId } : null;
    if (state.autoSave && state.departmentId && store.canEditCurrentDepartment()) FirebaseService.updateSelectionDiff(state.departmentId, [], [code], userWithDevice);
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
    if (state.autoSave && state.departmentId && store.canEditCurrentDepartment()) {
      const userWithDevice = state.currentUser ? { ...state.currentUser, deviceId: state.deviceId } : null;
      FirebaseService.updateSelectionDiff(state.departmentId, added, removed, userWithDevice);
    }
    store.setState({ selectedCodes: current });
  },
};
