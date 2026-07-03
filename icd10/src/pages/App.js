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
    
    // 1. Determine Department from URL
    const urlParams = new URLSearchParams(window.location.search);
    const dept = urlParams.get('dept');
    
    if (dept) {
      actions.setDepartment(dept);
      const departmentInfo = DEPARTMENTS.find(d => d.id === dept);
      const displayName = departmentInfo ? departmentInfo.name : dept;
      document.getElementById('dept-name').textContent = `Khoa: ${displayName}`;
    } else {
      document.getElementById('dept-name').textContent = `Chưa chọn khoa`;
      console.warn("No department specified. Use ?dept=K01 in URL.");
    }

    // 2. Initialize UI Components
    this.sidebar = new Sidebar('sidebar-content');
    this.treeView = new TreeView('tree-content');
    this.selectedList = new SelectedList('selected-content', 'selected-count', 'progress-fill');
    this.toolbar = new Toolbar('footer-content');

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', debounce((e) => {
      actions.setSearchQuery(e.target.value);
    }, 300));

    // 4. Setup Mobile Menu
    this.setupMobileMenu();

    // 5. Load Data
    const { flatData, chapters } = await IcdService.loadData();
    actions.setIcdData(flatData, chapters);

    // 6. Load existing selections from Firebase if department is set
    if (dept) {
      try {
        const selected = await FirebaseService.loadSelections(dept);
        actions.setSelectedCodes(selected);
        
        // Listen to changes from other tabs/users in realtime (optional)
        // FirebaseService.listenSelections(dept, (selections) => {
        //   actions.setSelectedCodes(selections);
        // });
      } catch (e) {
        console.error("Could not load from Firebase", e);
      }
    }

    // 7. Cập nhật giao diện khi dữ liệu thay đổi
    // (Bỏ auto-save để lưu thủ công qua nút Lưu trên Toolbar)
    store.subscribe((state) => {
      // Cập nhật số lượng trên mobile header
      const countEl = document.getElementById('mobile-selected-count');
      if (countEl) countEl.textContent = state.selectedCodes.size;
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
}

// Boot the application
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
