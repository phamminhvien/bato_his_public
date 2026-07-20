import { store } from '../state/store.js';
import { DEPARTMENTS } from '../utils/departments.js';

import { TABLE_COLUMNS } from '../components/SelectedList.js';

export class ExportService {
  /**
   * Trích xuất dữ liệu từ các mã đã chọn
   */
  static getSelectedData() {
    const state = store.getState();
    const selectedCodes = state.selectedCodes;
    const icdData = state.icdData;
    
    // Get visible columns from localStorage, or default
    const savedCols = localStorage.getItem('visibleColumns');
    let visibleSet;
    if (savedCols) {
      visibleSet = new Set(JSON.parse(savedCols));
    } else {
      visibleSet = new Set(TABLE_COLUMNS.filter(c => c.defaultVisible).map(c => c.id));
    }
    
    const data = icdData.filter(item => selectedCodes.has(item.id));
    
    return data.map(item => {
      const row = {};
      TABLE_COLUMNS.forEach(col => {
         if (col.id === 'ACTIONS') return;
         
         if (visibleSet.has(col.id) || col.id === 'MA_BENH') {
            if (col.id === 'WARNINGS') {
                let w = [];
                if (item["MA_KHONG_DUOC_DUNG_LA_BENH_CHINH"]) w.push("MÃ KHÔNG ĐƯỢC DÙNG LÀ BỆNH CHÍNH");
                if (item["MA_KHONG_KHUYEN_KHICH_DUNG_LA_BENH_CHINH"]) w.push("MÃ KHÔNG KHUYẾN KHÍCH DÙNG LÀ BỆNH CHÍNH");
                if (item["MA_KHONG_DUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON"]) w.push("MÃ KHÔNG ĐƯỢC SỬ DỤNG VÌ CÓ MÃ 4 HOẶC 5 KÝ TỰ CỤ THỂ HƠN");
                if (item["CHI_SU_DUNG_MA_HOA_NGUYEN_NHAN_TU_VONG"]) w.push("CHỈ SỬ DỤNG MÃ HÓA NGUYÊN NHÂN TỬ VONG");
                if (item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NU_GIOI"]) w.push("CÁC MÃ BỆNH CHỈ CÓ HOẶC CHỦ YẾU CÓ Ở NỮ GIỚI");
                if (item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NAM_GIOI"]) w.push("CÁC MÃ BỆNH CHỈ CÓ HOẶC CHỦ YẾU CÓ Ở NAM GIỚI");
                row[col.label] = w.join(", ");
            } else {
                row[col.label] = item[col.id] || '';
            }
         }
      });
      
      // Nếu là chế độ gộp của Phòng KHNV-ĐD, thêm cột "Khoa/Phòng sử dụng"
      if (state.departmentId === '51011' && state.showMergedCatalog) {
        const depts = (state.leaderboard || [])
          .filter(d => d.id !== '51011' && d.codes.includes(item.id))
          .map(d => {
            const deptObj = DEPARTMENTS.find(dep => dep.id === d.id);
            return deptObj ? deptObj.name : d.id;
          });
        row['Khoa/Phòng sử dụng'] = depts.join('\n');
      }
      
      return row;
    });
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

    // Thêm style cho Excel (Yêu cầu xlsx-js-style)
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = { c: C, r: R };
        const cellRef = XLSX.utils.encode_cell(cellAddress);
        if (!ws[cellRef]) continue;

        // Khởi tạo object style
        if (!ws[cellRef].s) ws[cellRef].s = {};

        // Căn chỉnh mặc định: Wrap text và Top vertical alignment
        ws[cellRef].s.alignment = {
          vertical: 'top',
          wrapText: true
        };

        // Style cho dòng Header (Dòng đầu tiên)
        if (R === 0) {
          ws[cellRef].s.font = { bold: true };
          ws[cellRef].s.fill = { fgColor: { rgb: "EAEAEA" } };
          ws[cellRef].s.alignment.horizontal = "center";
          ws[cellRef].s.alignment.vertical = "center";
        }
      }
    }

    // Tự động set độ rộng các cột (khoảng 25-30 ký tự)
    ws['!cols'] = Object.keys(data[0] || {}).map(() => ({ wch: 30 }));

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
    const state = store.getState();
    const selectedCodes = state.selectedCodes;
    const data = state.icdData.filter(item => selectedCodes.has(item.id));
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ICD_Backup_${departmentId || 'ALL'}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
