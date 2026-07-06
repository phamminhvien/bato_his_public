# Hướng Dẫn Dành Cho Lập Trình Viên (Developer Guide)

Tài liệu này được soạn thảo nhằm giúp bạn (hoặc bất kỳ ai tiếp quản dự án) nhanh chóng hiểu được toàn bộ kiến trúc, luồng dữ liệu, các thuật toán và logic được sử dụng trong mã nguồn của ứng dụng **ICD-10 Selector**.

Ứng dụng được xây dựng hoàn toàn bằng **Vanilla JavaScript (ES Modules)**, không sử dụng framework (như React hay Vue) để tối ưu dung lượng và tốc độ, nhưng áp dụng các Design Pattern rất hiện đại tương tự như Redux.

---

## 1. Cấu Trúc Thư Mục (Folder Structure)

```text
icd10/
├── public/                 # Chứa các file tĩnh (HTML, CSS, JSON, Hình ảnh)
│   ├── index.html          # File giao diện duy nhất (Single Page Application)
│   ├── css/                # Các file giao diện, được chia nhỏ (style.css, mobile.css, filter.css)
│   └── data/               # Các file dữ liệu ICD tĩnh tải về từ Cục KCB
└── src/                    # Chứa mã nguồn JavaScript, chia theo mô hình MVC thu nhỏ
    ├── actions/            # (Có thể tích hợp vào store.js) Định nghĩa hành động
    ├── components/         # Các mảnh giao diện độc lập (TreeView, SelectedList, Toolbar)
    ├── firebase/           # Cấu hình và tương tác với Database Thời gian thực
    ├── services/           # Xử lý logic nặng, biến đổi dữ liệu (icdService.js)
    ├── state/              # Quản lý Trạng thái toàn cục (store.js)
    ├── utils/              # Các hàm tiện ích dùng chung (helpers, danh mục khoa)
    └── pages/              # Khởi tạo và kết nối mọi thứ (App.js)
```

---

## 2. Kiến Trúc Tổng Thể (Architecture)

Hệ thống hoạt động dựa trên mô hình **Quản lý Trạng thái Tập trung (Centralized State Management)** theo mẫu **Observer Pattern** (rất giống Redux).

* **Store (`store.js`)**: Là bộ não lưu trữ mọi dữ liệu của app (Mã đang chọn là gì? Đang tìm kiếm chữ gì? Đang ở Khoa nào?).
* **Actions (`store.js`)**: Các hàm dùng để thay đổi Store (Ví dụ: `toggleCode`, `setDepartment`). Khi Actions chạy, nó cập nhật Store.
* **Components (`components/`)**: Các lớp UI. Chúng "lắng nghe" (subscribe) Store. Mỗi khi Store thay đổi, Components sẽ tự động `render` lại giao diện tương ứng.

### Luồng Hoạt Động (Data Flow)
`Người dùng Click Checkbox` 
→ Gọi `actions.toggleCode(id)` 
→ Store cập nhật dữ liệu 
→ Store thông báo (`notify`) cho tất cả Components 
→ `TreeView` và `SelectedList` tự động vẽ lại.

---

## 3. Giải Thích Các Khối Code Quan Trọng

### 3.1. `src/state/store.js` (Bộ Nhớ Trung Tâm)

Đây là file quan trọng bậc nhất. Toàn bộ logic đồng bộ dữ liệu nằm ở đây.

**Cấu trúc lớp `Store`:**
*   `this.state`: Một object khổng lồ lưu mọi thứ (currentUser, deviceId, selectedCodes...).
*   `subscribe(listener)`: Nơi các Component đăng ký theo dõi.
*   `setState()`: Khi gọi hàm này để đổi dữ liệu, nó sẽ tự gọi `notify()` báo cho toàn bộ các Component đã subscribe biết để vẽ lại màn hình.

**Cách Sync Realtime với Firebase:**
Trong hàm `toggleCode(code, isSelected)`, khi người dùng tích chọn 1 mã:
1. Update Set `selectedCodes` ở máy nội bộ ngay lập tức (cho cảm giác click mượt, không độ trễ).
2. Gọi `FirebaseService.updateSelectionDiff` để đẩy dữ liệu lên Cloud. Kèm theo `deviceId` (Một mã ngẫu nhiên sinh ra mỗi khi F5 trang).

### 3.2. `src/services/icdService.js` (Bộ Chế Biến Dữ Liệu)

Firebase hay File JSON chỉ lưu một danh sách mảng phẳng (phẳng lỳ) hàng ngàn mã bệnh. Hàm `fetchIcdData` và `buildHierarchy` làm nhiệm vụ:
*   Đọc mảng phẳng đó, áp dụng thuật toán **Tree Building (O(N))** bằng cách sử dụng `Map` để tra cứu nhanh.
*   Biến mảng phẳng thành một **Cây phân cấp**: Chương -> Nhóm -> Loại -> Mã Bệnh chi tiết. 
*   **Điểm hay**: Dùng tham chiếu bộ nhớ (Memory Reference) của Javascript để nhét các mã con vào mảng `children` của mã cha cực kỳ nhanh chóng.

### 3.3. `src/components/TreeView.js` (Trình Duyệt Cây Mã Bệnh)

Đảm nhiệm việc vẽ hàng ngàn mã bệnh lên HTML nhưng không làm lag trình duyệt.

**Kỹ thuật sử dụng:**
*   **Lazy Rendering (Render lười biếng)**: Các nhóm mã (Group) ban đầu chỉ vẽ cái vỏ ngoài. Chỉ khi người dùng bấm nút mở rộng (`>`), nó mới gọi hàm đệ quy để vẽ các mã con bên trong. Tránh việc nhét hàng chục ngàn thẻ HTML vào DOM cùng lúc làm sập trình duyệt.
*   **Event Delegation (Ủy quyền sự kiện)**: Thay vì gắn `addEventListener` cho từng cái checkbox (hàng ngàn cái tốn RAM), chúng ta gắn duy nhất 1 sự kiện `click` vào cái bao lớn bên ngoài (`container.addEventListener('click')`). Sau đó kiểm tra xem người dùng có bấm trúng cái input checkbox nào không (`e.target.tagName === 'INPUT'`).

**Hiệu ứng Rung (Shake Animation) và Đổ lỗi (Blame Badge):**
*   Hàm `render()` liên tục được gọi khi Firebase báo có người mới chọn mã.
*   Nó sẽ so sánh `metadata.deviceId` với `store.state.deviceId`.
*   Nếu **khác nhau** (nghĩa là lệnh chọn này đến từ máy tính/tab của người khác), nó sẽ thêm class `shake` để giao diện của bạn rung lên, kèm hiệu ứng chớp tắt `flash-active`.

### 3.4. `src/firebase/index.js` (Kết Nối Đám Mây)

Nơi xử lý giao tiếp 2 chiều với Firebase Firestore.
*   **Tối ưu ghi (Write)**: Dùng `arrayUnion` và `arrayRemove` của Firestore để chỉ gửi **phần khác biệt** (ví dụ: gửi đúng 1 mã mới tick), không gửi lại toàn bộ danh sách lên server, giúp tiết kiệm băng thông tối đa.
*   **Lắng nghe thời gian thực (Read)**: `onSnapshot` mở một kênh kết nối liên tục. Khi máy của Bác sĩ A tick 1 mã, server đẩy tín hiệu về máy Bác sĩ B. Khối lượng code này nằm trong `App.js` (hàm `setupFirebaseRealtime`).

### 3.5. `src/pages/App.js` (Nhạc Trưởng - Controller)

Khởi tạo toàn bộ ứng dụng. 
*   Gọi `setupAuth()` kiểm tra đăng nhập.
*   Tải dữ liệu từ LocalStorage (Khoa nào đang được chọn).
*   Đưa dữ liệu vào Store.
*   Tạo ra các Components (`TreeView`, `SelectedList`, `Toolbar`) và nhét chúng vào các thẻ `div` trống trong `index.html`.
*   Quản lý chức năng hướng dẫn bằng thư viện ngoài `driver.js`.

---

## 4. Tóm Tắt Cách Sửa Lỗi Hoặc Thêm Tính Năng

- **Nếu muốn sửa giao diện (Màu sắc, canh lề, ẩn hiện):** Sửa trong thư mục `public/css/`. Đừng quên đổi `?v=15` lên `v=16` trong thẻ `<link>` của `index.html` để ép trình duyệt xóa cache.
- **Nếu muốn đổi cách tính điểm thi đua:** Sửa trong phần lấy Dữ liệu Realtime và đếm ở `DashboardModal.js`.
- **Nếu muốn thêm một trường dữ liệu (ví dụ: ngày giờ xuất viện):** 
  1. Thêm thuộc tính vào hàm `updateSelectionDiff` ở `firebase/index.js`.
  2. Sửa file `SelectedList.js` để hiển thị thuộc tính mới đó lên bảng.
- **Nếu muốn xử lý Logic mới:** Viết một Action mới trong `store.js` (`actions.myNewLogic`), sau đó gọi nó từ các file giao diện. Đừng tự ý chọc thẳng vào biến của Store mà không qua Action.

> Tóm lại, quy trình vàng của dự án này: **"UI chỉ là tấm gương phản chiếu của Store. Muốn đổi UI, hãy đổi dữ liệu trong Store"**.
