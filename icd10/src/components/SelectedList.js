import { store, actions } from '../state/store.js';
import { removeVietnameseTones } from '../utils/helpers.js';
import { DEPARTMENTS } from '../utils/departments.js';

export const TABLE_COLUMNS = [
  { id: 'STT', label: 'STT', defaultVisible: true },
  { id: 'STT_CHUONG', label: 'STT CHƯƠNG', defaultVisible: false },
  { id: 'PHAM_VI_MA_NHOM_BENH', label: 'PHẠM VI MÃ NHÓM BỆNH', defaultVisible: false },
  { id: 'CHAPTER_NAME', label: 'CHAPTER NAME', defaultVisible: false },
  { id: 'TEN_CHUONG', label: 'TÊN CHƯƠNG', defaultVisible: false },
  { id: 'MA_KHOI', label: 'MÃ KHỐI', defaultVisible: false },
  { id: 'BLOCK_NAME', label: 'BLOCK NAME', defaultVisible: false },
  { id: 'TEN_KHOI', label: 'TÊN KHỐI', defaultVisible: false },
  { id: 'MA_TIEU_KHOI_CAP_1', label: 'MÃ TIỂU KHỐI CẤP 1', defaultVisible: false },
  { id: 'FIRST_SUB_DIVISION_NAME', label: 'FIRST SUB-DIVISION NAME', defaultVisible: false },
  { id: 'TEN_TIEU_KHOI_CAP_1', label: 'TÊN TIỂU KHỐI CẤP 1', defaultVisible: false },
  { id: 'MA_TIEU_KHOI_CAP_2', label: 'MÃ TIỂU KHỐI CẤP 2', defaultVisible: false },
  { id: 'SECOND_SUB_DIVISION_NAME', label: 'SECOND SUB-DIVISION NAME', defaultVisible: false },
  { id: 'TEN_TIEU_KHOI_CAP_2', label: 'TÊN TIỂU KHỐI CẤP 2', defaultVisible: false },
  { id: 'MA_NHOM_BENH_3_KY_TU', label: 'MÃ NHÓM BỆNH 3 KÝ TỰ', defaultVisible: true },
  { id: 'THREE_CHARACTER_SUB_CATEGORY_NAME', label: '3-CHARACTER SUB-CATEGORY NAME', defaultVisible: false },
  { id: 'TEN_NHOM_BENH_3_KY_TU', label: 'TÊN NHÓM BỆNH 3 KÝ TỰ', defaultVisible: false },
  { id: 'MA_BENH', label: 'MÃ BỆNH', defaultVisible: true },
  { id: 'MA_BENH_KHONG_DAU', label: 'MÃ BỆNH KHÔNG DẤU', defaultVisible: false },
  { id: 'DISEASE_NAME_WHO_2019_ENGLISH', label: 'DISEASE NAME WHO 2019 (ENGLISH)', defaultVisible: false },
  { id: 'ADDITIONAL_CODING_GUIDANCE_WHO_2019_ENGLISH', label: 'ADDITIONAL CODING GUIDANCE WHO 2019 (ENGLISH)', defaultVisible: false },
  { id: 'TEN_BENH', label: 'TÊN BỆNH', defaultVisible: true },
  { id: 'HUONG_DAN_MA_HOA_BO_SUNG_CUA_WHO_2019', label: 'HƯỚNG DẪN MÃ HÓA BỔ SUNG CỦA WHO 2019', defaultVisible: false },
  { id: 'WARNINGS', label: 'Cảnh báo', defaultVisible: true },
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
    this.modalSearchQuery = '';
    this.modalWarningFilter = '';

    const modalSearchInput = document.getElementById('modal-search');
    if (modalSearchInput) {
      modalSearchInput.addEventListener('input', (e) => {
        this.modalSearchQuery = removeVietnameseTones(e.target.value);
        this.renderModalTable(store.getState());
      });
    }

    const modalWarningSelect = document.getElementById('modal-warning-filter');
    if (modalWarningSelect) {
      modalWarningSelect.addEventListener('change', (e) => {
        this.modalWarningFilter = e.target.value;
        this.renderModalTable(store.getState());
      });
    }
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
      if (item["MA_KHONG_DUOC_DUNG_LA_BENH_CHINH"]) labels += `<span class="badge badge-red has-tooltip" data-tooltip="Mã không được dùng làm bệnh chính">Cấm làm bệnh chính</span>`;
      if (item["MA_KHONG_KHUYEN_KHICH_DUNG_LA_BENH_CHINH"]) labels += `<span class="badge badge-orange has-tooltip" data-tooltip="Mã không khuyến khích dùng làm bệnh chính">K.khuyến khích bệnh chính</span>`;
      if (item["MA_KHONG_DUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON"]) labels += `<span class="badge badge-brown has-tooltip" data-tooltip="Mã không được sử dụng vì có mã 4 hoặc 5 ký tự cụ thể hơn">Cần mã chi tiết hơn</span>`;
      if (item["CHI_SU_DUNG_MA_HOA_NGUYEN_NHAN_TU_VONG"]) labels += `<span class="badge badge-purple has-tooltip" data-tooltip="Chỉ sử dụng mã hóa nguyên nhân tử vong">Chỉ dùng tử vong</span>`;
      if (item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NU_GIOI"]) labels += `<span class="badge badge-pink has-tooltip" data-tooltip="Các mã bệnh chỉ có hoặc chủ yếu có ở nữ giới">Nữ giới</span>`;
      if (item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NAM_GIOI"]) labels += `<span class="badge badge-blue has-tooltip" data-tooltip="Các mã bệnh chỉ có hoặc chủ yếu có ở nam giới">Nam giới</span>`;
      const badgesHtml = labels ? `<div class="icd-badges">${labels}</div>` : '';

      const canEdit = store.canEditCurrentDepartment();
      const removeBtnHtml = canEdit ? `<button class="remove-btn" title="Xóa" style="margin-left: 10px;">&times;</button>` : '';

      let blameHtml = '';
      if (state.departmentId === '51011' && state.showMergedCatalog) {
        const depts = (state.leaderboard || [])
          .filter(d => d.codes.includes(item.id))
          .map(d => {
            const deptObj = DEPARTMENTS.find(dep => dep.id === d.id);
            return deptObj ? deptObj.name : d.id;
          });
        if (depts.length > 0) {
          blameHtml = `<div style="font-size: 0.75rem; color: #2e7d32; font-weight: bold; margin-top: 4px; line-height: 1.3;">🏥 ${depts.join('<br>')}</div>`;
        }
      } else {
        const metadata = state.selectedMetadata[item.id];
        if (metadata && metadata.name) {
          const displayStr = metadata.name.split('@')[0];
          blameHtml = `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;" title="${metadata.email}">👤 ${displayStr}</div>`;
        }
      }

      el.innerHTML = `
        <div class="selected-info" style="flex: 1;">
          <strong>${item.MA_BENH}</strong><br>
          <small>${item.TEN_BENH}</small>
          ${blameHtml}
          ${badgesHtml}
        </div>
        ${removeBtnHtml}
      `;

      if (canEdit) {
        el.querySelector('.remove-btn').addEventListener('click', () => {
          actions.removeCode(code);
        });
      }

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
    const columnsToRender = [...TABLE_COLUMNS];
    if (state.departmentId === '51011' && state.showMergedCatalog) {
      const actionsIndex = columnsToRender.findIndex(c => c.id === 'ACTIONS');
      const col = { id: 'KHOA_SU_DUNG', label: 'Khoa/Phòng sử dụng' };
      if (actionsIndex !== -1) {
        columnsToRender.splice(actionsIndex, 0, col);
      } else {
        columnsToRender.push(col);
      }
    }

    columnsToRender.forEach(col => {
      if (!this.visibleColumns.has(col.id) && col.id !== 'MA_BENH' && col.id !== 'ACTIONS' && col.id !== 'KHOA_SU_DUNG') return;

      const th = document.createElement('th');
      let text = col.label;
      if (this.sortConfig.key === col.id) {
        text += this.sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
      }
      th.textContent = text;

      if (col.id !== 'ACTIONS' && col.id !== 'WARNINGS' && col.id !== 'KHOA_SU_DUNG') {
        th.addEventListener('click', () => this.handleSort(col.id));
      }
      if (col.id === 'MA_BENH') {
        th.classList.add('col-ma-benh');
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

    let rowData = selectedArray.map(code => icdMap.get(code)).filter(item => {
      if (!item) return false;

      // Filter by warning
      if (this.modalWarningFilter) {
        const hasAnyWarning =
          item["MA_KHONG_DUOC_DUNG_LA_BENH_CHINH"] ||
          item["MA_KHONG_KHUYEN_KHICH_DUNG_LA_BENH_CHINH"] ||
          item["MA_KHONG_DUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON"] ||
          item["CHI_SU_DUNG_MA_HOA_NGUYEN_NHAN_TU_VONG"] ||
          item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NU_GIOI"] ||
          item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NAM_GIOI"];

        if (this.modalWarningFilter === 'HAS_WARNING' && !hasAnyWarning) return false;
        if (this.modalWarningFilter === 'NO_WARNING' && hasAnyWarning) return false;
        if (this.modalWarningFilter !== 'HAS_WARNING' && this.modalWarningFilter !== 'NO_WARNING') {
          if (!item[this.modalWarningFilter]) return false;
        }
      }

      // Filter by search query
      if (this.modalSearchQuery) {
        const maBenh = removeVietnameseTones(item.MA_BENH || '');
        const tenBenh = removeVietnameseTones(item.TEN_BENH || '');
        if (!maBenh.includes(this.modalSearchQuery) && !tenBenh.includes(this.modalSearchQuery)) {
          return false;
        }
      }

      return true;
    });

    // Update stats
    const statsEl = document.getElementById('modal-stats');
    if (statsEl) {
      const total = rowData.length;
      const warningCount = rowData.filter(item =>
        item["MA_KHONG_DUOC_DUNG_LA_BENH_CHINH"] ||
        item["MA_KHONG_KHUYEN_KHICH_DUNG_LA_BENH_CHINH"] ||
        item["MA_KHONG_DUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON"] ||
        item["CHI_SU_DUNG_MA_HOA_NGUYEN_NHAN_TU_VONG"] ||
        item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NU_GIOI"] ||
        item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NAM_GIOI"]
      ).length;
      statsEl.innerHTML = `Tổng số: <b style="color:var(--primary-color)">${total}</b> mã | Có cảnh báo: <b style="color:#d97706">${warningCount}</b>`;
    }

    // Update Title
    const titleEl = document.getElementById('modal-title');
    if (titleEl) {
      const depName = state.departmentId ?
        (DEPARTMENTS.find(d => d.id === state.departmentId)?.name || state.departmentId)
        : 'Tất cả';
      titleEl.textContent = `Danh mục ICD-10 ${depName}`;
    }

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

      columnsToRender.forEach(col => {
        if (!this.visibleColumns.has(col.id) && col.id !== 'MA_BENH' && col.id !== 'ACTIONS' && col.id !== 'KHOA_SU_DUNG') return;

        const td = document.createElement('td');
        if (col.id === 'MA_BENH') {
          td.classList.add('col-ma-benh');
        }

        if (col.id === 'ACTIONS') {
          const canEdit = store.canEditCurrentDepartment();
          if (canEdit) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline';
            btn.style.padding = '2px 8px';
            btn.style.color = '#dc3545';
            btn.style.borderColor = '#dc3545';
            btn.textContent = 'Xóa';
            btn.addEventListener('click', () => actions.removeCode(item.id));
            td.appendChild(btn);
          } else {
            td.textContent = '🔒';
            td.style.textAlign = 'center';
            td.title = 'Chỉ Admin mới có quyền xóa';
          }
        } else if (col.id === 'WARNINGS') {
          let labels = '';
          if (item["MA_KHONG_DUOC_DUNG_LA_BENH_CHINH"]) labels += `<span class="badge badge-red" style="margin-right:4px; margin-bottom: 4px; display: inline-block;">MÃ KHÔNG ĐƯỢC DÙNG LÀ BỆNH CHÍNH</span>`;
          if (item["MA_KHONG_KHUYEN_KHICH_DUNG_LA_BENH_CHINH"]) labels += `<span class="badge badge-orange" style="margin-right:4px; margin-bottom: 4px; display: inline-block;">MÃ KHÔNG KHUYẾN KHÍCH DÙNG LÀ BỆNH CHÍNH</span>`;
          if (item["MA_KHONG_DUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON"]) labels += `<span class="badge badge-brown" style="margin-right:4px; margin-bottom: 4px; display: inline-block;">MÃ KHÔNG ĐƯỢC SỬ DỤNG VÌ CÓ MÃ 4 HOẶC 5 KÝ TỰ CỤ THỂ HƠN</span>`;
          if (item["CHI_SU_DUNG_MA_HOA_NGUYEN_NHAN_TU_VONG"]) labels += `<span class="badge badge-purple" style="margin-right:4px; margin-bottom: 4px; display: inline-block;">CHỈ SỬ DỤNG MÃ HÓA NGUYÊN NHÂN TỬ VONG</span>`;
          if (item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NU_GIOI"]) labels += `<span class="badge badge-pink" style="margin-right:4px; margin-bottom: 4px; display: inline-block;">CÁC MÃ BỆNH CHỈ CÓ HOẶC CHỦ YẾU CÓ Ở NỮ GIỚI</span>`;
          if (item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NAM_GIOI"]) labels += `<span class="badge badge-blue" style="margin-right:4px; margin-bottom: 4px; display: inline-block;">CÁC MÃ BỆNH CHỈ CÓ HOẶC CHỦ YẾU CÓ Ở NAM GIỚI</span>`;
          td.innerHTML = labels;
        } else if (col.id === 'KHOA_SU_DUNG') {
          const depts = (state.leaderboard || [])
            .filter(d => d.codes.includes(item.id))
            .map(d => {
              const deptObj = DEPARTMENTS.find(dep => dep.id === d.id);
              return deptObj ? deptObj.name : d.id;
            });
          td.innerHTML = depts.join('<br>');
          td.style.fontSize = '0.85rem';
          td.style.color = '#2e7d32';
          td.style.fontWeight = 'bold';
          td.style.lineHeight = '1.3';
        } else if (col.id === 'MA_BENH') {
          let html = `<strong>${item[col.id] || ''}</strong>`;
          const metadata = state.selectedMetadata[item.id];
          if (metadata && metadata.name) {
            const displayStr = metadata.name.split('@')[0];
            html += `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;" title="${metadata.email}">👤 ${displayStr}</div>`;
          }
          td.innerHTML = html;
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
