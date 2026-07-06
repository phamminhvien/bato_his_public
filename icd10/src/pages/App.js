import { store, actions } from '../state/store.js';
import { IcdService } from '../services/icdService.js';
import { FirebaseService } from '../firebase/index.js';
import { Sidebar } from '../components/Sidebar.js';
import { TreeView } from '../components/TreeView.js';
import { SelectedList } from '../components/SelectedList.js';
import { Toolbar } from '../components/Toolbar.js';
import { DashboardModal } from '../components/DashboardModal.js';
import { debounce } from '../utils/helpers.js';
import { DEPARTMENTS } from '../utils/departments.js';

class App {
  constructor() {
    this.init();
    this.setupHelpTour();
  }

  async init() {
    this.setupAuth();
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

    // Initialize Theme
    const isDarkMode = localStorage.getItem('theme') === 'dark';
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    }
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

    // 4. Setup Mobile Menu & Modals
    this.setupMobileMenu();
    new DashboardModal();
    this.setupAuth();

    // 4.5 Listen to all departments for leaderboard
    FirebaseService.listenAllDepartments((data) => {
      actions.setLeaderboard(data);
    });

    // 5. Load Data
    const { flatData, chapters } = await IcdService.loadData();
    actions.setIcdData(flatData, chapters);

    // 6. Listen to real-time selections from Firebase
    let unsubscribeSnapshot = null;
    if (dept) {
      try {
        isSwitchingDept = true;
        unsubscribeSnapshot = FirebaseService.listenSelections(dept, (serverCodes, metadata, metaRemoved) => {
          console.log(`🔥 [Real-time Sync] Nhận dữ liệu từ Khoa ${dept}:`, serverCodes);
          actions.setSelectedCodes(serverCodes, metadata, metaRemoved);
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
        unsubscribeSnapshot = FirebaseService.listenSelections(dept, (serverCodes, metadata, metaRemoved) => {
          console.log(`🔥 [Real-time Sync] Nhận dữ liệu từ Khoa ${dept}:`, serverCodes);
          actions.setSelectedCodes(serverCodes, metadata, metaRemoved);
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
      // Instead of opening the Rightbar, directly open the Detail Modal on Mobile
      const btnViewDetails = document.getElementById('btn-view-details');
      if (btnViewDetails) {
        btnViewDetails.click();
      }
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

  setupHelpTour() {
    const btnHelp = document.getElementById('btn-help-tour');
    if (!btnHelp) return;
    
    btnHelp.addEventListener('click', () => {
      // Create driver instance
      const driverObj = window.driver.js.driver({
        showProgress: true,
        nextBtnText: 'Tiếp theo',
        prevBtnText: 'Quay lại',
        doneBtnText: 'Hoàn thành',
        steps: [
          {
            element: '.header-text',
            popover: {
              title: 'Chào mừng!',
              description: 'Chào mừng bạn đến với công cụ hỗ trợ chọn mã bệnh ICD-10 của TTYT Ba Tơ.',
              side: "bottom", align: 'start'
            }
          },
          {
            element: '#dept-select',
            popover: {
              title: 'Chọn Khoa / Phòng',
              description: 'Đầu tiên, hãy chọn Khoa/Phòng của bạn để tải danh sách mã bệnh tương ứng.',
              side: "bottom", align: 'start'
            }
          },
          {
            element: '.search-wrapper',
            popover: {
              title: 'Tìm kiếm nhanh',
              description: 'Sử dụng ô tìm kiếm để lọc nhanh các mã bệnh theo tên hoặc mã ICD.',
              side: "bottom", align: 'start'
            }
          },
          {
            element: '.sidebar',
            popover: {
              title: 'Quy tắc cảnh báo',
              description: 'Chú ý các màu sắc cảnh báo để chọn đúng mã ICD theo chuẩn thông tư 06/2026.',
              side: "right", align: 'start'
            }
          },
          {
            element: '#tree-content',
            popover: {
              title: 'Cây danh mục ICD-10',
              description: 'Đây là nơi bạn chọn mã bệnh. Dữ liệu sẽ tự động lưu và đồng bộ thời gian thực.',
              side: "right", align: 'start'
            }
          },
          {
            element: '.rightbar',
            popover: {
              title: 'ICD-10 / Đã chọn',
              description: 'Mọi mã bệnh bạn đã chọn sẽ xuất hiện ở đây để dễ dàng kiểm tra lại ở phần xem chi tiết, dễ dàng xuất excel tùy chỉnh như ý muốn.',
              side: "left", align: 'start'
            }
          },
          {
            element: '#btn-show-dashboard',
            popover: {
              title: 'Bảng điều khiển',
              description: 'Xem bảng xếp hạng thống kê số lượng mã bệnh của các Khoa.',
              side: "bottom", align: 'end'
            }
          },
          {
            element: '#btn-auth-profile',
            popover: {
              title: 'Đăng nhập & Quyền',
              description: 'Tùy chỉnh giao diện Sáng/Tối, Bật/Tắt âm thanh. Đăng nhập tại đây nếu bạn là Quản trị viên để có quyền thay đổi mã.',
              side: "top", align: 'end'
            }
          }
        ]
      });
      
      // Start tour
      driverObj.drive();
    });
  }

  setupAuth() {
    const btnAuthProfile = document.getElementById('btn-auth-profile');
    const authMenu = document.getElementById('auth-menu');
    const btnLoginMenu = document.getElementById('btn-login-menu');
    const btnLogoutMenu = document.getElementById('btn-logout-menu');
    const userAvatarPlaceholder = document.getElementById('user-avatar-placeholder');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userRoleBadge = document.getElementById('user-role-badge');
    const btnTheme = document.getElementById('btn-toggle-theme');
    const btnSound = document.getElementById('btn-toggle-sound');

    // Initialize Theme and Sound buttons
    const isDarkMode = localStorage.getItem('theme') === 'dark';
    if (isDarkMode) {
      if (btnTheme) btnTheme.innerHTML = '☀️ Sáng';
    } else {
      if (btnTheme) btnTheme.innerHTML = '🌙 Tối';
    }
    if (btnTheme) {
      btnTheme.addEventListener('click', (e) => {
        e.stopPropagation();
        document.body.classList.toggle('dark-mode');
        const dark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', dark ? 'dark' : 'light');
        btnTheme.innerHTML = dark ? '☀️ Sáng' : '🌙 Tối';
      });
    }

    const isMuted = localStorage.getItem('isMuted') === 'true';
    if (isMuted) {
      if (btnSound) btnSound.innerHTML = '🔇 Tắt âm';
    } else {
      if (btnSound) btnSound.innerHTML = '🔊 Âm thanh';
    }
    if (btnSound) {
      btnSound.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentlyMuted = localStorage.getItem('isMuted') === 'true';
        const newMuted = !currentlyMuted;
        localStorage.setItem('isMuted', newMuted);
        btnSound.innerHTML = newMuted ? '🔇 Tắt âm' : '🔊 Âm thanh';
      });
    }

    if (btnAuthProfile && authMenu) {
      btnAuthProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        authMenu.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!authMenu.contains(e.target) && e.target !== btnAuthProfile && !btnAuthProfile.contains(e.target)) {
          authMenu.classList.remove('active');
        }
      });
    }

    if (btnLoginMenu) {
      btnLoginMenu.addEventListener('click', async () => {
        try {
          if (authMenu) authMenu.classList.remove('active');
          await FirebaseService.loginWithGoogle();
        } catch (err) {
          alert("Đăng nhập thất bại: " + err.message);
        }
      });
    }

    if (btnLogoutMenu) {
      btnLogoutMenu.addEventListener('click', async () => {
        if (authMenu) authMenu.classList.remove('active');
        await FirebaseService.logout();
      });
    }

    FirebaseService.onAuthChange(async (user) => {
      if (user) {
        // Logged in
        if (btnLoginMenu) btnLoginMenu.style.display = 'none';
        if (btnLogoutMenu) btnLogoutMenu.style.display = 'flex';
        
        if (userAvatarPlaceholder) userAvatarPlaceholder.style.display = 'none';
        if (userAvatar) {
          userAvatar.src = user.photoURL || '';
          userAvatar.style.display = 'block';
        }
        
        if (userName) userName.textContent = user.displayName || 'Người dùng';
        
        const popupInfoContainer = document.getElementById('auth-menu-user-info-container');
        const popupName = document.getElementById('auth-menu-name');
        const popupRole = document.getElementById('auth-menu-role');
        const popupEmail = document.getElementById('auth-menu-email');
        
        if (popupInfoContainer) {
          if (popupName) popupName.textContent = user.displayName || 'Người dùng';
          if (popupEmail) popupEmail.textContent = user.email;
          if (popupRole) {
            popupRole.textContent = 'Đang kiểm tra quyền...';
            popupRole.style.color = 'var(--text-muted)';
          }
          popupInfoContainer.style.display = 'block';
        }

        if (userRoleBadge) {
          userRoleBadge.textContent = 'Đang kiểm tra quyền...';
          userRoleBadge.style.display = 'block';
        }
        
        // Fetch role
        const roleData = await FirebaseService.getUserRole(user.email);
        
        const currentUser = {
          email: user.email,
          name: user.displayName,
          avatar: user.photoURL,
          role: roleData ? roleData.role : null,
          maKhoa: roleData ? roleData.maKhoa : null
        };
        
        if (userRoleBadge) {
          if (currentUser.role === 'super_admin') {
            userRoleBadge.textContent = 'Super Admin';
            userRoleBadge.style.color = '#ff9800';
            userRoleBadge.title = 'Toàn quyền chỉnh sửa hệ thống';
            if (popupRole) {
              popupRole.textContent = 'Super Admin';
              popupRole.style.color = '#ff9800';
            }
          } else if (currentUser.role === 'admin') {
            const deptObj = DEPARTMENTS.find(d => d.id === currentUser.maKhoa);
            const deptName = deptObj ? deptObj.name : currentUser.maKhoa;
            userRoleBadge.textContent = 'Admin: ' + deptName;
            userRoleBadge.style.color = 'var(--primary-color)';
            userRoleBadge.title = 'Quản trị viên ' + deptName;
            if (popupRole) {
              popupRole.textContent = 'Admin: ' + deptName;
              popupRole.style.color = 'var(--primary-color)';
            }
          } else {
            userRoleBadge.textContent = 'Guest (Chỉ xem)';
            userRoleBadge.style.color = 'var(--text-muted)';
            userRoleBadge.title = 'Khách viếng thăm (Chỉ xem)';
            if (popupRole) {
              popupRole.textContent = 'Guest (Chỉ xem)';
              popupRole.style.color = 'var(--text-muted)';
            }
          }
          userRoleBadge.style.display = 'block';
        }
        
        actions.setUserInfo(currentUser);
      } else {
        // Logged out
        if (btnLoginMenu) btnLoginMenu.style.display = 'flex';
        if (btnLogoutMenu) btnLogoutMenu.style.display = 'none';
        
        if (userAvatarPlaceholder) userAvatarPlaceholder.style.display = 'flex';
        if (userAvatar) userAvatar.style.display = 'none';
        
        if (userName) userName.textContent = 'guest';
        if (userRoleBadge) userRoleBadge.style.display = 'none';
        
        const popupInfoContainer = document.getElementById('auth-menu-user-info-container');
        if (popupInfoContainer) popupInfoContainer.style.display = 'none';
        
        actions.setUserInfo(null);
      }
    });
  }
}

// Boot the application
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
