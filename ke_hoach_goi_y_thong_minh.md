# Kế hoạch Triển khai Hạng mục 5: Gợi ý Thông minh theo "Combo" 💡

Dựa trên việc TreeView đã hỗ trợ gom nhóm, chúng ta sẽ bỏ qua Cách 1 (gợi ý theo tiền tố/nhóm) và tập trung toàn lực vào **Cách 2: Gợi ý theo Combo thực tế**. Tính năng này sẽ mang lại giá trị thực tế cao nhất cho người dùng.

## Kiến trúc tính năng (Cách hoạt động)

1. **Bộ não (Từ điển Combo)**:
   - Tạo một file cấu hình siêu đơn giản `src/utils/combos.js`.
   - File này chứa các cặp bài trùng thường được các bác sĩ chỉ định cùng nhau. Ví dụ tạm:
     - `A91` (Sốt xuất huyết) ➡️ Gợi ý: `R50.9` (Sốt không xác định), `D69.3` (Giảm tiểu cầu).
     - `I10` (Tăng huyết áp vô căn) ➡️ Gợi ý: `E11.9` (Đái tháo đường type 2), `E78.5` (Rối loạn Lipid máu).
   - *Lưu ý: Các bác sĩ hoặc admin có thể tự nhập/cập nhật thêm vào file này bất cứ lúc nào một cách dễ dàng.*

2. **Giao diện hiển thị (Shopee-style Toast Notification)**:
   - Khi bác sĩ click chọn `I10`, thuật toán lập tức kiểm tra: Bác sĩ đã có mã `E11.9` và `E78.5` trong danh sách đang chọn chưa?
   - Nếu chưa có, một "Bảng thông báo nổi" (Toast) sẽ mượt mà trượt từ góc phải dưới màn hình ra:
     > 💡 **Thường chọn cùng nhau:**
     > Bác sĩ chọn Tăng huyết áp (I10), có muốn thêm luôn:
     > - Đái tháo đường (E11.9)
     > - Rối loạn Lipid (E78.5)
     > `[+ Thêm tất cả]` `[Bỏ qua]`
   - Nút `[+ Thêm tất cả]` sẽ tự động đưa các mã gợi ý này vào danh sách chỉ bằng 1 cú click. Thông báo sẽ tự biến mất sau 7 giây nếu người dùng không thao tác.

3. **Luồng xử lý (Redux Store)**:
   - Hàm kiểm tra Gợi ý sẽ được gọi ngầm ngay sau `actions.toggleCode()`.
   - Chạy bất đồng bộ để không gây đứng máy hay làm gián đoạn trải nghiệm click hiện tại của bác sĩ.

## Các vấn đề cần suy nghĩ thêm:
- Kịch bản hiển thị của "Bảng thông báo nổi" (Toast) như trên đã tối ưu về trải nghiệm chưa?
- Có cần thêm hiệu ứng âm thanh (Ví dụ: "Ting Ting" nhỏ) khi bảng trượt ra để thu hút sự chú ý không, hay chỉ cần trượt êm ái là đủ?
- Ai sẽ là người phụ trách việc tổng hợp và thiết lập danh sách Combo (Từ điển Combo) này để đưa vào hệ thống?
