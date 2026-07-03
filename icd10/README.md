# Hệ thống Lựa chọn Danh mục ICD-10 (HIS)

Dự án cung cấp giao diện web cho phép các khoa phòng bệnh viện lựa chọn danh mục ICD-10 áp dụng tại khoa, dựa trên Thông tư 06/2026/TT-BYT.

## Kiến trúc
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES Modules). Thiết kế theo Clean Architecture.
- **Database**: Firebase Firestore.
- **Hosting**: GitHub Pages (Static Site).

## Tính năng nổi bật
- Xử lý dữ liệu lớn (hơn 15,000 dòng) không bị giật lag nhờ thuật toán **Virtual Scroll** và **Lazy Render**.
- Tìm kiếm tức thời (gõ không dấu, tiếng Anh, tiếng Việt).
- Tự động lưu lựa chọn xuống Firebase khi có thay đổi.
- Hỗ trợ xuất/nhập Excel, CSV, JSON (sử dụng SheetJS).

## Hướng dẫn cài đặt
1. Đổi tên file `src/firebase/config.example.js` thành `config.js`.
2. Điền thông tin cấu hình Firebase Project của bạn vào `config.js`.
3. Triển khai luật bảo mật cho Firestore trong file `firestore.rules`.
4. Mở file `public/index.html` (Nên dùng Live Server do trình duyệt chặn fetch file local) kèm tham số khoa phòng, ví dụ:
   `http://localhost:5500/public/index.html?dept=NOI`

## Cấu trúc Firestore
- Collection: `ICDdepartmentSelections`
- Document ID: Mã khoa (VD: `K01`, `K18`)
- Data:
  ```json
  {
    "department": "NOI",
    "selected": ["A00", "B01"],
    "updatedAt": "2026-07-03T10:00:00Z"
  }
  ```

## Triển khai
Dự án đã có sẵn luồng GitHub Actions `.github/workflows/deploy.yml` để tự động deploy thư mục `icd10` lên GitHub Pages. Khi đẩy code lên nhánh `main`, hệ thống sẽ tự động build và xuất bản.
