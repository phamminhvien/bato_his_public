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

    this.fileInput = document.getElementById('import-excel-file');
    this.btnImportExcel = document.getElementById('btn-import-excel');
    this.fileNameDisplay = document.getElementById('import-excel-filename');

    if (!this.modal) return;

    this.closeBtn.addEventListener('click', () => this.close());
    this.cancelBtn.addEventListener('click', () => this.close());
    
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    this.confirmBtn.addEventListener('click', () => this.handleImport());
    
    if (this.btnImportExcel && this.fileInput) {
      this.btnImportExcel.addEventListener('click', () => {
        this.fileInput.click();
      });
      this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }
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
    if (this.fileInput) this.fileInput.value = '';
    if (this.fileNameDisplay) this.fileNameDisplay.textContent = '';
  }

  close() {
    this.modal.classList.add('hidden');
  }

  getSelectableCodes(importType = 'MA_BENH') {
    const selectableCodes = new Map();
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
            const c = group.codes[0];
            const key = importType === 'MA_BENH_KHONG_DAU' ? (c.MA_BENH_KHONG_DAU || c.id) : c.id;
            selectableCodes.set(key, c.id);
            return;
          }

          if (hasDetailWarning && group.codes.length > 1) {
            group.codes.forEach(c => {
              if (c.MA_BENH !== group.id) {
                const key = importType === 'MA_BENH_KHONG_DAU' ? (c.MA_BENH_KHONG_DAU || c.id) : c.id;
                selectableCodes.set(key, c.id);
              }
            });
          } else {
            group.codes.forEach(c => {
              const key = importType === 'MA_BENH_KHONG_DAU' ? (c.MA_BENH_KHONG_DAU || c.id) : c.id;
              selectableCodes.set(key, c.id);
            });
          }
        });
      });
    });

    return selectableCodes;
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (this.fileNameDisplay) {
      this.fileNameDisplay.textContent = file.name;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        // Parse the excel or csv data
        const workbook = window.XLSX.read(data, { type: 'binary' });
        // Use the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to json array of arrays (header: 1 means array of arrays instead of array of objects)
        const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Extract column A (index 0) from every row
        const codes = [];
        jsonData.forEach(row => {
          if (row && row.length > 0 && row[0]) {
            const val = String(row[0]).trim();
            if (val) codes.push(val);
          }
        });
        
        if (codes.length > 0) {
          // Append to textarea, or replace it
          const currentText = this.textarea.value.trim();
          const newText = codes.join(', ');
          this.textarea.value = currentText ? currentText + ', ' + newText : newText;
        } else {
          alert("Không tìm thấy dữ liệu ở cột A trong file.");
        }
      } catch (err) {
        console.error("Lỗi khi đọc file Excel/CSV:", err);
        alert("Lỗi khi đọc file: " + err.message);
      }
    };
    
    reader.readAsBinaryString(file);
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

    const importType = document.querySelector('input[name="import_type"]:checked').value;
    const selectableMap = this.getSelectableCodes(importType);
    
    const validCodes = [];
    const invalidCodes = [];
    const idsToSelect = new Set();

    uniqueInputCodes.forEach(code => {
      if (selectableMap.has(code)) {
        validCodes.push(code);
        idsToSelect.add(selectableMap.get(code));
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
    if (idsToSelect.size > 0) {
      const currentSelected = new Set(store.getState().selectedCodes);
      idsToSelect.forEach(id => currentSelected.add(id));
      actions.setSelectedCodes(Array.from(currentSelected));
    }
  }
}
