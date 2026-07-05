import { store, actions } from '../state/store.js';
import { IcdService } from '../services/icdService.js';
import { FirebaseService } from '../firebase/index.js';
import { Sidebar } from '../components/Sidebar.js';
import { TreeView } from '../components/TreeView.js';
import { SelectedList } from '../components/SelectedList.js';
import { Toolbar } from '../components/Toolbar.js';
import { debounce } from '../utils/helpers.js';
import { DEPARTMENTS } from '../utils/departments.js';

class App {
  constructor() {
    this.init();
  }

  async init() {
    this.showLoader();
    
    let isSwitchingDept = false;
    
    // 1. Determine Department from LocalStorage or Default
    let dept = localStorage.getItem('selectedDept');
    
    if (!dept && DEPARTMENTS.length > 0) {
      dept = DEPARTMENTS[0].id;
    }

    // Populate dropdown
    const deptSelect = document.getElementById('dept-select');
    deptSelect.innerHTML = '';
    DEPARTMENTS.forEach(d => {
      const option = document.createElement('option');
      option.value = d.id;
      option.textContent = d.name;
      deptSelect.appendChild(option);
    });

    if (dept) {
      actions.setDepartment(dept);
      localStorage.setItem('selectedDept', dept);
      deptSelect.value = dept;
    }

    // Listen to dropdown changes
    deptSelect.addEventListener('change', async (e) => {
      isSwitchingDept = true;
      const newDept = e.target.value;
      
      // Clear current selection immediately to prevent old data bleeding into new department
      actions.setSelectedCodes([]);
      actions.setDepartment(newDept);
      localStorage.setItem('selectedDept', newDept);
      
      this.showLoader();
      try {
        const selected = await FirebaseService.loadSelections(newDept);
        // Prevent race condition if user changed department again while loading
        if (store.getState().departmentId === newDept) {
          actions.setSelectedCodes(selected);
        }
      } catch (err) {
        console.error("Error changing department:", err);
      }
      if (store.getState().departmentId === newDept) {
        isSwitchingDept = false;
        this.hideLoader();
      }
    });

    // 2. Initialize UI Components
    this.sidebar = new Sidebar('sidebar-chapters');
    this.treeView = new TreeView('tree-content');
    this.selectedList = new SelectedList('selected-content', 'selected-count', 'progress-fill');
    this.toolbar = new Toolbar('footer-content');

    // 3. Setup Search Input and Filter
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', debounce((e) => {
      actions.setSearchQuery(e.target.value);
    }, 300));
    this.setupSearchFilter();

    // 4. Setup Mobile Menu
    this.setupMobileMenu();

    // 5. Load Data
    const { flatData, chapters } = await IcdService.loadData();
    actions.setIcdData(flatData, chapters);

    // 6. Listen to real-time selections from Firebase
    let unsubscribeSnapshot = null;
    if (dept) {
      try {
        isSwitchingDept = true;
        unsubscribeSnapshot = FirebaseService.listenSelections(dept, (serverCodes) => {
          actions.setSelectedCodes(serverCodes);
        });
        isSwitchingDept = false;
      } catch (e) {
        console.error("Could not load from Firebase", e);
        isSwitchingDept = false;
      }
    }

    // 7. Handle Department Changes
    store.subscribe((state) => {
      // Cập nhật số lượng trên mobile header
      const countEl = document.getElementById('mobile-selected-count');
      if (countEl) countEl.textContent = state.selectedCodes.size;

      // Handle subscription change when department changes
      if (state.departmentId && state.departmentId !== dept) {
        dept = state.departmentId;
        if (unsubscribeSnapshot) unsubscribeSnapshot();
        isSwitchingDept = true;
        unsubscribeSnapshot = FirebaseService.listenSelections(dept, (serverCodes) => {
          actions.setSelectedCodes(serverCodes);
        });
        isSwitchingDept = false;
      }
    });

    this.hideLoader();
  }

  showLoader() {
    document.getElementById('loader').classList.remove('hidden');
  }

  hideLoader() {
    document.getElementById('loader').classList.add('hidden');
  }

  setupMobileMenu() {
    const btnSidebar = document.getElementById('btn-toggle-sidebar');
    const btnRightbar = document.getElementById('btn-toggle-rightbar');
    const sidebar = document.querySelector('.sidebar');
    const rightbar = document.querySelector('.rightbar');
    const overlay = document.getElementById('mobile-overlay');

    const closeAll = () => {
      sidebar.classList.remove('active');
      rightbar.classList.remove('active');
      overlay.classList.remove('active');
    };

    btnSidebar.addEventListener('click', () => {
      sidebar.classList.add('active');
      overlay.classList.add('active');
    });

    btnRightbar.addEventListener('click', () => {
      rightbar.classList.add('active');
      overlay.classList.add('active');
    });

    overlay.addEventListener('click', closeAll);
  }

  setupSearchFilter() {
    const searchInput = document.getElementById('search-input');
    const legendFilter = document.getElementById('legend-filter');
    const legendBadges = legendFilter.querySelectorAll('.legend-badge');

    // Handle legend item click
    legendBadges.forEach(badge => {
      badge.addEventListener('click', () => {
        const filterKey = badge.getAttribute('data-filter');
        
        // If already active, deactivate it
        if (badge.classList.contains('active-filter-badge')) {
          badge.classList.remove('active-filter-badge');
          actions.setSearchFilter(null);
          
          // Remove inactive class from all others
          legendBadges.forEach(b => b.classList.remove('inactive-filter-badge'));
        } else {
          // Make this active, others inactive
          legendBadges.forEach(b => {
            b.classList.remove('active-filter-badge');
            b.classList.add('inactive-filter-badge');
          });
          badge.classList.remove('inactive-filter-badge');
          badge.classList.add('active-filter-badge');
          
          actions.setSearchFilter(filterKey);
        }
      });
    });
  }
}

// Boot the application
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
