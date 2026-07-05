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
        <div class="status-left">
          <div class="pulse-indicator"></div>
          <span class="status-text">Hệ thống Máy chủ <b style="color: var(--success-color);">Trực tuyến</b></span>
          <span class="sync-text" style="opacity: 0.7;">(Đồng bộ thời gian thực)</span>
        </div>
        
        <div class="status-center">
          <span>ICD-10 Selector v1.0 &copy; <b>Trung tâm Y tế Ba Tơ</b></span>
        </div>
        
        <div class="status-right" style="opacity: 0.9;">
          <span>Author: <a href="https://www.facebook.com/phamminhvien" target="_blank" style="color: var(--primary-color); text-decoration: none; font-weight: bold;">Vien Pham</a></span>
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
