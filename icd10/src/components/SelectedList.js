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
      el.innerHTML = `
        <div>
          <strong>${item.MA_BENH}</strong><br>
          <small>${item.TEN_BENH}</small>
        </div>
        <button class="remove-btn" title="Xóa">&times;</button>
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
