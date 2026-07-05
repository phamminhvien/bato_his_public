import { store, actions } from '../state/store.js';
import { removeVietnameseTones } from '../utils/helpers.js';

const TABLE_COLUMNS = [
  { id: 'STT', label: 'STT', defaultVisible: true },
  { id: 'MA_BENH', label: 'Mã bệnh', defaultVisible: true },
  { id: 'TEN_BENH', label: 'Tên bệnh', defaultVisible: true },
  { id: 'DISEASE_NAME_WHO_2019_ENGLISH', label: 'Tên bệnh (English)', defaultVisible: true },
  { id: 'STT_CHUONG', label: 'Chương', defaultVisible: true },
  { id: 'TEN_CHUONG', label: 'Tên Chương', defaultVisible: false },
  { id: 'MA_KHOI', label: 'Mã Khối', defaultVisible: true },
  { id: 'TEN_KHOI', label: 'Tên Khối', defaultVisible: false },
  { id: 'MA_NHOM_BENH_3_KY_TU', label: 'Mã nhóm (3 KT)', defaultVisible: false },
  { id: 'TEN_NHOM_BENH_3_KY_TU', label: 'Tên nhóm (3 KT)', defaultVisible: false },
  { id: 'WARNINGS', label: 'Quy tắc cảnh báo', defaultVisible: true },
  { id: 'ACTIONS', label: 'Thao tác', defaultVisible: true }
];

export class SelectedList {
  constructor(containerId, countId, progressId) {
    this.container = document.getElementById(containerId);
    this.countEl = document.getElementById(countId);
    this.progressFillEl = document.getElementById(progressId);
    
    // Quick search for selected list
    this.searchQuery = '';
    
    const searchInput = document.getElementById('selected-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = removeVietnameseTones(e.target.value);
        this.renderList(store.getState());
      });
    }

    // Modal state
    this.sortConfig = { key: 'MA_BENH', direction: 'asc' };
    const savedCols = localStorage.getItem('visibleColumns');
    if (savedCols) {
      this.visibleColumns = new Set(JSON.parse(savedCols));
    } else {
      this.visibleColumns = new Set(TABLE_COLUMNS.filter(c => c.defaultVisible).map(c => c.id));
    }

    this.unsubscribe = store.subscribe((state) => {
      this.render(state);
      if (!this.modalOverlay.classList.contains('hidden')) {
        this.renderModalTable(state);
      }
    });

    // Modal elements
    this.modalOverlay = document.getElementById('detail-modal');
    this.tableHeader = document.getElementById('modal-table-header');
    this.tableBody = document.getElementById('modal-table-body');
    
    const btnViewDetails = document.getElementById('btn-view-details');
    const btnCloseModal = document.getElementById('btn-close-modal');

    if (btnViewDetails && this.modalOverlay && btnCloseModal) {
      btnViewDetails.addEventListener('click', () => {
        this.modalOverlay.classList.remove('hidden');
        this.renderModalTable(store.getState());
      });

      btnCloseModal.addEventListener('click', () => {
        this.modalOverlay.classList.add('hidden');
      });

      this.modalOverlay.addEventListener('click', (e) => {
        if (e.target === this.modalOverlay) {
          this.modalOverlay.classList.add('hidden');
        }
      });
    }

    this.setupColumnToggle();
  }

  setupColumnToggle() {
    const btnToggle = document.getElementById('btn-toggle-columns');
    const menu = document.getElementById('column-toggle-menu');
    
    if (!btnToggle || !menu) return;

    btnToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && e.target !== btnToggle) {
        menu.classList.add('hidden');
      }
    });

    menu.innerHTML = '';
    TABLE_COLUMNS.forEach(col => {
      if (col.id === 'ACTIONS' || col.id === 'MA_BENH') return; // Cannot hide these

      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = this.visibleColumns.has(col.id);
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.visibleColumns.add(col.id);
        } else {
          this.visibleColumns.delete(col.id);
        }
        localStorage.setItem('visibleColumns', JSON.stringify(Array.from(this.visibleColumns)));
        this.renderModalTable(store.getState());
      });

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(col.label));
      menu.appendChild(label);
    });
  }

  render(state) {
    this.updateStats(state);
    this.renderList(state);
  }

  updateStats(state) {
    const total = state.icdData.length;
    const selectedCount = state.selectedCodes.size;
    
    if (this.countEl) {
      this.countEl.textContent = `${selectedCount} / ${total} ICD`;
    }
    
    if (this.progressFillEl && total > 0) {
      const percentage = (selectedCount / total) * 100;
      this.progressFillEl.style.width = `${percentage}%`;
    }
  }

  renderList(state) {
    this.container.innerHTML = '';
    const selectedArray = Array.from(state.selectedCodes);
    
    const icdMap = new Map();
    state.icdData.forEach(item => icdMap.set(item.id, item));

    const fragment = document.createDocumentFragment();
    
    selectedArray.forEach(code => {
      const item = icdMap.get(code);
      if (!item) return;

      if (this.searchQuery && !item._searchIndex.includes(this.searchQuery)) {
        return;
      }

      const el = document.createElement('div');
      el.className = 'selected-item';
      
      let labels = '';
      if (item["MA_KHONG_ĐUOC_DUNG_LA_BENH_CHINH"]) labels += `<span class="badge badge-red" title="Mã không được dùng làm bệnh chính">Cấm làm bệnh chính</span>`;
      if (item["MA_KHONG_KHUYEN_KHICH_DUNG_LA_BENH_CHINH"]) labels += `<span class="badge badge-orange" title="Mã không khuyến khích dùng làm bệnh chính">K.khuyến khích bệnh chính</span>`;
      if (item["MA_KHONG_ĐUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON"]) labels += `<span class="badge badge-brown" title="Mã không được sử dụng vì có mã 4 hoặc 5 ký tự cụ thể hơn">Cần mã chi tiết hơn</span>`;
      if (item["CHI_SU_DUNG_MA_HOA_NGUYEN_NHAN_TU_VONG"]) labels += `<span class="badge badge-purple" title="Chỉ sử dụng mã hóa nguyên nhân tử vong">Chỉ dùng tử vong</span>`;
      if (item["CAC_MA_BENH_CHI_CÓ_HOAC_CHU_YEU_CO_O_NU_GIOI"] || item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NU_GIOI"]) labels += `<span class="badge badge-pink" title="Các mã bệnh chỉ có hoặc chủ yếu có ở nữ giới">Nữ giới</span>`;
      if (item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NAM_GIOI"]) labels += `<span class="badge badge-blue" title="Các mã bệnh chỉ có hoặc chủ yếu có ở nam giới">Nam giới</span>`;
      const badgesHtml = labels ? `<div class="icd-badges">${labels}</div>` : '';

      el.innerHTML = `
        <div class="selected-info" style="flex: 1;">
          <strong>${item.MA_BENH}</strong><br>
          <small>${item.TEN_BENH}</small>
          ${badgesHtml}
        </div>
        <button class="remove-btn" title="Xóa" style="margin-left: 10px;">&times;</button>
      `;

      el.querySelector('.remove-btn').addEventListener('click', () => {
        actions.removeCode(code);
      });

      fragment.appendChild(el);
    });

    this.container.appendChild(fragment);
  }

  handleSort(key) {
    if (this.sortConfig.key === key) {
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.key = key;
      this.sortConfig.direction = 'asc';
    }
    this.renderModalTable(store.getState());
  }

  renderModalTable(state) {
    if (!this.tableHeader || !this.tableBody) return;
    
    // 1. Render Headers
    this.tableHeader.innerHTML = '';
    TABLE_COLUMNS.forEach(col => {
      if (!this.visibleColumns.has(col.id) && col.id !== 'MA_BENH' && col.id !== 'ACTIONS') return;

      const th = document.createElement('th');
      let text = col.label;
      if (this.sortConfig.key === col.id) {
        text += this.sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
      }
      th.textContent = text;
      
      if (col.id !== 'ACTIONS' && col.id !== 'WARNINGS') {
        th.addEventListener('click', () => this.handleSort(col.id));
      }
      this.tableHeader.appendChild(th);
    });

    // 2. Render Body
    this.tableBody.innerHTML = '';
    const selectedArray = Array.from(state.selectedCodes);
    
    if (selectedArray.length === 0) {
      const colSpan = this.tableHeader.children.length;
      this.tableBody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; padding: 40px; color: var(--text-muted);">Chưa có mã ICD nào được chọn.</td></tr>`;
      return;
    }

    const icdMap = new Map();
    state.icdData.forEach(item => icdMap.set(item.id, item));

    let rowData = selectedArray.map(code => icdMap.get(code)).filter(item => item);

    // 3. Sort Data
    rowData.sort((a, b) => {
      const key = this.sortConfig.key;
      const dir = this.sortConfig.direction === 'asc' ? 1 : -1;
      
      let valA = a[key] || '';
      let valB = b[key] || '';

      if (key === 'STT') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }

      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });

    // 4. Create Rows
    const fragment = document.createDocumentFragment();
    rowData.forEach(item => {
      const tr = document.createElement('tr');

      TABLE_COLUMNS.forEach(col => {
        if (!this.visibleColumns.has(col.id) && col.id !== 'MA_BENH' && col.id !== 'ACTIONS') return;

        const td = document.createElement('td');
        
        if (col.id === 'ACTIONS') {
          const btn = document.createElement('button');
          btn.className = 'btn btn-outline';
          btn.style.padding = '2px 8px';
          btn.style.color = '#dc3545';
          btn.style.borderColor = '#dc3545';
          btn.textContent = 'Xóa';
          btn.addEventListener('click', () => actions.removeCode(item.id));
          td.appendChild(btn);
        } else if (col.id === 'WARNINGS') {
          let labels = '';
          if (item["MA_KHONG_ĐUOC_DUNG_LA_BENH_CHINH"]) labels += `<span class="badge badge-red" style="margin-right:4px;">Cấm làm bệnh chính</span>`;
          if (item["MA_KHONG_KHUYEN_KHICH_DUNG_LA_BENH_CHINH"]) labels += `<span class="badge badge-orange" style="margin-right:4px;">K.khuyến khích</span>`;
          if (item["MA_KHONG_ĐUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON"]) labels += `<span class="badge badge-brown" style="margin-right:4px;">Cần mã chi tiết hơn</span>`;
          if (item["CHI_SU_DUNG_MA_HOA_NGUYEN_NHAN_TU_VONG"]) labels += `<span class="badge badge-purple" style="margin-right:4px;">Chỉ dùng tử vong</span>`;
          if (item["CAC_MA_BENH_CHI_CÓ_HOAC_CHU_YEU_CO_O_NU_GIOI"] || item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NU_GIOI"]) labels += `<span class="badge badge-pink" style="margin-right:4px;">Nữ giới</span>`;
          if (item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NAM_GIOI"]) labels += `<span class="badge badge-blue" style="margin-right:4px;">Nam giới</span>`;
          td.innerHTML = labels;
        } else {
          td.textContent = item[col.id] || '';
        }

        tr.appendChild(td);
      });
      fragment.appendChild(tr);
    });

    this.tableBody.appendChild(fragment);
  }

  destroy() {
    this.unsubscribe();
  }
}
