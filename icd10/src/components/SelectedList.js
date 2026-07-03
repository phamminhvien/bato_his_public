import { store, actions } from '../state/store.js';
import { removeVietnameseTones } from '../utils/helpers.js';

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

    this.unsubscribe = store.subscribe((state) => {
      this.render(state);
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
    
    // Create a map for O(1) lookup
    const icdMap = new Map();
    state.icdData.forEach(item => icdMap.set(item.id, item));

    const fragment = document.createDocumentFragment();
    
    selectedArray.forEach(code => {
      const item = icdMap.get(code);
      if (!item) return;

      // Filter by quick search
      if (this.searchQuery && !item._searchIndex.includes(this.searchQuery)) {
        return;
      }

      const el = document.createElement('div');
      el.className = 'selected-item';
      
      let labels = '';
      if (item["MA_KHONG_ĐUOC_DUNG_LA_BENH_CHINH"]) {
        labels += `<span class="badge badge-red" title="Mã không được dùng làm bệnh chính">Cấm làm bệnh chính</span>`;
      }
      if (item["MA_KHONG_KHUYEN_KHICH_DUNG_LA_BENH_CHINH"]) {
        labels += `<span class="badge badge-orange" title="Mã không khuyến khích dùng làm bệnh chính">K.khuyến khích bệnh chính</span>`;
      }
      if (item["MA_KHONG_ĐUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON"]) {
        labels += `<span class="badge badge-brown" title="Mã không được sử dụng vì có mã 4 hoặc 5 ký tự cụ thể hơn">Cần mã chi tiết hơn</span>`;
      }
      if (item["CHI_SU_DUNG_MA_HOA_NGUYEN_NHAN_TU_VONG"]) {
        labels += `<span class="badge badge-purple" title="Chỉ sử dụng mã hóa nguyên nhân tử vong">Chỉ dùng tử vong</span>`;
      }
      if (item["CAC_MA_BENH_CHI_CÓ_HOAC_CHU_YEU_CO_O_NU_GIOI"] || item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NU_GIOI"]) {
        labels += `<span class="badge badge-pink" title="Các mã bệnh chỉ có hoặc chủ yếu có ở nữ giới">Nữ giới</span>`;
      }
      if (item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NAM_GIOI"]) {
        labels += `<span class="badge badge-blue" title="Các mã bệnh chỉ có hoặc chủ yếu có ở nam giới">Nam giới</span>`;
      }
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

  destroy() {
    this.unsubscribe();
  }
}
