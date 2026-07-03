import { store } from '../state/store.js';

export class ExportService {
  /**
   * Trích xuất dữ liệu từ các mã đã chọn
   */
  static getSelectedData() {
    const state = store.getState();
    const selectedCodes = state.selectedCodes;
    const icdData = state.icdData;
    
    // Filter out only selected items
    const data = icdData.filter(item => selectedCodes.has(item.id));
    
    // Transform to export format
    return data.map(item => ({
      "ICD": item.MA_BENH,
      "Tên tiếng Việt": item.TEN_BENH || '',
      "Tên tiếng Anh": item.DISEASE_NAME_WHO_2019_ENGLISH || '',
      "Chương": item.TEN_CHUONG || '',
      "Khối": item.TEN_KHOI || '',
      "Ghi chú": item.HUONG_DAN_MA_HOA_BO_SUNG_CUA_WHO_2019 || ''
    }));
  }

  /**
   * Export to Excel (.xlsx) using SheetJS
   */
  static exportExcel(departmentId) {
    if (typeof XLSX === 'undefined') {
      alert('Thư viện SheetJS chưa được tải!');
      return;
    }
    const data = this.getSelectedData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Selected_ICD");
    XLSX.writeFile(wb, `ICD_${departmentId || 'ALL'}_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  /**
   * Export to CSV using SheetJS
   */
  static exportCSV(departmentId) {
    if (typeof XLSX === 'undefined') {
      alert('Thư viện SheetJS chưa được tải!');
      return;
    }
    const data = this.getSelectedData();
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    
    const blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ICD_${departmentId || 'ALL'}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Export to JSON
   */
  static exportJSON(departmentId) {
    const data = Array.from(store.getState().selectedCodes);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ICD_Backup_${departmentId || 'ALL'}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
