import { store, actions } from '../state/store.js';

export class ImportModal {
  constructor() {
    this.modal = document.getElementById('import-modal');
    this.closeBtn = document.getElementById('btn-close-import-modal');
    this.cancelBtn = document.getElementById('btn-cancel-import');
    this.confirmBtn = document.getElementById('btn-confirm-import');
    
    this.textarea = document.getElementById('import-textarea');
    this.resultsContainer = document.getElementById('import-results-container');
    this.successCountEl = document.getElementById('import-success-count');
    this.failedSection = document.getElementById('import-failed-section');
    this.failedCountEl = document.getElementById('import-failed-count');
    this.failedTextarea = document.getElementById('import-failed-textarea');

    if (!this.modal) return;

    this.closeBtn.addEventListener('click', () => this.close());
    this.cancelBtn.addEventListener('click', () => this.close());
    
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    this.confirmBtn.addEventListener('click', () => this.handleImport());
  }

  open() {
    this.modal.classList.remove('hidden');
    // Reset UI
    this.textarea.value = '';
    this.resultsContainer.classList.add('hidden');
    this.failedSection.classList.add('hidden');
    this.successCountEl.textContent = '0';
    this.failedCountEl.textContent = '0';
    this.failedTextarea.value = '';
  }

  close() {
    this.modal.classList.add('hidden');
  }

  getSelectableCodes() {
    const selectableCodes = new Set();
    const chapters = store.getState().chapters;
    
    if (!chapters) return selectableCodes;

    chapters.forEach(chap => {
      chap.blocks.forEach(block => {
        block.groups.forEach(group => {
          const parentCodeIndex = group.codes.findIndex(c => c.MA_BENH === group.id);
          let parentCode = null;
          let hasDetailWarning = false;
          
          if (parentCodeIndex !== -1) {
            parentCode = group.codes[parentCodeIndex];
            hasDetailWarning = !!parentCode["MA_KHONG_DUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON"];
          }

          if (group.codes.length === 1) {
            selectableCodes.add(group.codes[0].id);
            return;
          }

          if (hasDetailWarning && group.codes.length > 1) {
            group.codes.forEach(c => {
              if (c.MA_BENH !== group.id) {
                selectableCodes.add(c.id);
              }
            });
          } else {
            group.codes.forEach(c => selectableCodes.add(c.id));
          }
        });
      });
    });

    return selectableCodes;
  }

  handleImport() {
    if (!store.canEditCurrentDepartment()) {
      alert("Bạn không có quyền chỉnh sửa khoa này.");
      return;
    }

    const input = this.textarea.value;
    if (!input || input.trim() === '') {
      alert("Vui lòng nhập danh sách mã ICD-10.");
      return;
    }

    // Parse input: split by comma, newline, etc.
    const rawCodes = input.split(/[\n,;]+/).map(c => c.trim().toUpperCase()).filter(c => c !== '');
    
    // Remove duplicates from input
    const uniqueInputCodes = [...new Set(rawCodes)];

    const selectableCodes = this.getSelectableCodes();
    
    const validCodes = [];
    const invalidCodes = [];

    uniqueInputCodes.forEach(code => {
      if (selectableCodes.has(code)) {
        validCodes.push(code);
      } else {
        invalidCodes.push(code);
      }
    });

    // Update results UI
    this.resultsContainer.classList.remove('hidden');
    this.successCountEl.textContent = validCodes.length;
    
    if (invalidCodes.length > 0) {
      this.failedSection.classList.remove('hidden');
      this.failedCountEl.textContent = invalidCodes.length;
      this.failedTextarea.value = invalidCodes.join(', ');
    } else {
      this.failedSection.classList.add('hidden');
    }

    // Apply valid codes to store
    if (validCodes.length > 0) {
      const currentSelected = new Set(store.getState().selectedCodes);
      validCodes.forEach(code => currentSelected.add(code));
      actions.setSelectedCodes(Array.from(currentSelected));
    }
  }
}
