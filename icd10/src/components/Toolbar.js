import { store, actions } from '../state/store.js';
import { ExportService } from '../services/exportService.js';
import { FirebaseService } from '../firebase/index.js';

export class Toolbar {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="footer-status-bar">
        <div class="footer-left">
          <!-- User Profile Button -->
          <div class="auth-profile-btn" id="btn-auth-profile">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div class="auth-avatar-placeholder" id="user-avatar-placeholder">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              <img id="user-avatar" src="" alt="Avatar" style="width: 28px; height: 28px; border-radius: 6px; display: none;">
              <div style="display: flex; flex-direction: column; align-items: flex-start; line-height: 1.2;">
                <span id="user-name" style="font-weight: 500; text-transform: lowercase;">guest</span>
                <span id="user-role-badge" style="font-size: 0.65rem; color: var(--success-color); display: none;"></span>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; opacity: 0.5;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: -4px;"><polyline points="18 15 12 9 6 15"></polyline></svg>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
          
          <!-- Auth Menu -->
          <div class="auth-profile-menu" id="auth-menu" style="padding: 0;">
            <!-- Profile Info (Shows Email when logged in) -->
            <div id="auth-menu-email-container" style="display: none; padding: 10px 12px; border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.8rem; text-align: center; word-break: break-all;">
              <span id="auth-menu-email"></span>
            </div>
            
            <!-- Preferences Section -->
            <div style="display: flex; gap: 4px; padding: 8px; border-bottom: 1px solid var(--border-color);">
              <button class="auth-menu-item" id="btn-toggle-theme" style="flex: 1; justify-content: center; font-size: 0.8rem; padding: 6px;" title="Chế độ Tối/Sáng">
                🌙 Tối
              </button>
              <button class="auth-menu-item" id="btn-toggle-sound" style="flex: 1; justify-content: center; font-size: 0.8rem; padding: 6px;" title="Bật/Tắt Âm Thanh">
                🔊 Âm thanh
              </button>
            </div>
            
            <div style="padding: 8px; display: flex; flex-direction: column; gap: 4px;">
              <button class="auth-menu-item" id="btn-login-menu">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                Đăng nhập Google
              </button>
              <button class="auth-menu-item logout" id="btn-logout-menu" style="display: none;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
        
        <div class="footer-right">
          <div class="status-left">
            <div class="pulse-indicator" style="margin-right: 8px;"></div>
            <span>ICD-10 Selector v1.0 &copy; <a href="https://www.facebook.com/profile.php?id=61576498303401" target="_blank" style="color: var(--primary-color); text-decoration: none;" title="Trung tâm Y tế Ba Tơ"><b>Trung tâm Y tế Ba Tơ</b></a></span>
          </div>
          
          <div class="status-right" style="opacity: 0.9;">
            <span style="display: flex; align-items: center; gap: 5px;" title="Author">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>
              <a href="https://www.facebook.com/phamminhvien" target="_blank" style="color: #E88FA1; text-decoration: none; font-weight: bold; text-shadow: 0 0 1px rgba(0,0,0,0.1);">Vien Pham</a>
            </span>
          </div>
        </div>
      </div>
      
      <!-- Hidden functional buttons -->
      <input type="file" id="import-file" accept=".json" class="hidden" />
      <button class="btn btn-primary" id="btn-import" style="display: none;">Nhập từ JSON</button>
      <div class="auto-save-container" style="display: none;">
        <input type="checkbox" id="toggle-autosave" checked>
      </div>
      <button class="btn btn-primary" id="btn-save" style="display: none;">Lưu kết quả</button>
    `;

    document.getElementById('btn-save').addEventListener('click', async () => {
      const state = store.getState();
      const dept = state.departmentId;
      if (!dept) {
        alert("Vui lòng chọn Khoa trước khi lưu!");
        return;
      }
      try {
        const btn = document.getElementById('btn-save');
        btn.textContent = "Đang lưu...";
        btn.disabled = true;
        
        await FirebaseService.saveSelections(dept, Array.from(state.selectedCodes));
        
        btn.textContent = "Đã lưu thành công!";
        setTimeout(() => {
          btn.textContent = "Lưu kết quả";
          btn.disabled = false;
        }, 2000);
      } catch (err) {
        alert("Lỗi khi lưu lên Firebase: " + err.message);
        document.getElementById('btn-save').textContent = "Lưu kết quả";
        document.getElementById('btn-save').disabled = false;
      }
    });

    document.getElementById('btn-export-excel').addEventListener('click', () => {
      ExportService.exportExcel(store.getState().departmentId);
    });

    document.getElementById('btn-export-json').addEventListener('click', () => {
      ExportService.exportJSON(store.getState().departmentId);
    });

    // Auto-save Toggle listener
    const toggleAutoSave = document.getElementById('toggle-autosave');
    const btnSave = document.getElementById('btn-save');

    toggleAutoSave.addEventListener('change', (e) => {
      actions.setAutoSave(e.target.checked);
    });

    // Subscribe to store to update toggle and save button visibility
    store.subscribe((state) => {
      toggleAutoSave.checked = state.autoSave;
      btnSave.style.display = state.autoSave ? 'none' : 'block';
    });

    document.getElementById('btn-import').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });

    document.getElementById('import-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target.result);
          if (Array.isArray(importedData)) {
            // merge or replace? Let's just merge
            const current = new Set(store.getState().selectedCodes);
            importedData.forEach(code => current.add(code));
            actions.setSelectedCodes(Array.from(current));
            alert(`Đã nhập thành công ${importedData.length} mã ICD.`);
          } else {
            alert('File không đúng định dạng!');
          }
        } catch (error) {
          alert('Lỗi đọc file JSON!');
        }
      };
      reader.readAsText(file);
    });
  }
}
