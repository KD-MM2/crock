# 🥐 crock UI

Giao diện desktop cho [croc](https://github.com/schollz/croc) được xây dựng bằng React + Electron. Ứng dụng giúp bạn gửi và nhận tệp hoặc đoạn văn bản nhanh chóng, theo dõi lịch sử truyền tải và tinh chỉnh cấu hình croc mà không cần nhớ các tham số dòng lệnh.

## ✨ Tính năng chính

- **Gửi & nhận tức thì** – Chọn tệp/thư mục, dán văn bản hoặc nhập code-phrase rồi bắt đầu phiên chỉ với một nút bấm.
- **QR code & clipboard** – Sinh code-phrase ngẫu nhiên, tự động copy khi bắt đầu gửi và lưu mã QR (SVG) để chia sẻ tiện lợi.
- **Tùy chọn phiên linh hoạt** – Hỗ trợ override relay, mật khẩu, exclude patterns, auto-confirm, số kết nối, protocol, force/disable local… theo từng phiên.
- **Lịch sử truyền tải đầy đủ** – Lọc theo loại/trạng thái, xem chi tiết log, tốc độ, kích thước, export JSON, resend với thiết lập cũ hoặc xóa toàn bộ kèm xác nhận.
- **Cài đặt đa tab** – Tổng hợp các thiết lập General, Transfer defaults, Relay & proxy, Security, Connection diagnostics, Croc binary, Advanced và About.
- **Chẩn đoán kết nối trực quan** – Kiểm tra relay, proxy, croc binary; trạng thái relay được cập nhật trực tiếp qua sự kiện `relay:status`.
- **Theme sáng/tối** – Tự động theo hệ thống hoặc tùy chọn thủ công, lưu vào trạng thái ứng dụng.
- **Mock IPC thông minh** – Khi chạy trong môi trường web, `window.api` được mock để demo UI mà không cần tiến trình Electron.

## 🛠️ Công nghệ

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui, lucide-react, sonner
- **State management**: Zustand (các store: UI, transfer, settings, history)
- **Electron**: Tích hợp IPC qua `window.api`, electron-builder cho đóng gói

## 🚀 Chạy dự án

> Yêu cầu: Node.js ≥ 18 và pnpm ≥ 8

```bash
# cài dependencies
pnpm install

# chạy giao diện (mock IPC) với Vite
pnpm dev

# build renderer + preload và gói Electron
pnpm build
```

Các script chính được định nghĩa trong `package.json`. Lệnh `pnpm dev` sử dụng mock `window.api` để bạn có thể duyệt UI trực tiếp trong trình duyệt. Khi đóng gói Electron, module preload cung cấp các API thật để giao tiếp với tiến trình chính.

## 📦 Cấu trúc chính

- `src/components/transfer` – Send panel, receive panel, progress và session overrides
- `src/components/history` – Dialog hiển thị lịch sử, lọc, chi tiết, resend, export
- `src/components/settings` – Settings dialog với 8 tab và kết nối tới stores
- `src/stores` – Zustand stores cho UI, transfer, settings, history
- `electron/` – Entry points cho main & preload khi chạy Electron
- `dist-electron/` – Output sau khi build (được electron-builder sử dụng)

## 🔌 IPC & mô hình dữ liệu

- Renderer giao tiếp qua `window.api` với các nhóm: `app`, `croc`, `history`, `settings`, `events` (được định nghĩa trong `src/types/ipc.ts`).
- Khi thiếu `window.api`, mock trong `src/lib/window-api.ts` sẽ:
  - sinh lịch sử giả lập
  - mô phỏng tiến trình gửi/nhận
  - lưu cấu hình vào `localStorage`
- Sự kiện `relay:status` được subscribe trong Settings để cập nhật latency/online theo thời gian thực.

## ✅ Trạng thái & giới hạn hiện tại

- Hầu hết các mục trong đặc tả ban đầu đã được hiện thực hóa.
- Một số hành vi nâng cao (kiểm tra proxy sâu, xác thực thư mục download) vẫn ở mức thông báo/ghi log và có thể mở rộng thêm khi backend hỗ trợ.

## 🤝 Đóng góp

1. Fork repository và tạo branch mới
2. Thực hiện thay đổi, chạy `pnpm lint`
3. Gửi pull request kèm mô tả rõ ràng

## 📄 Giấy phép

Phần mềm được phát hành dưới giấy phép MIT. Tham khảo file `LICENSE` (nếu có) hoặc thêm thông tin khi đóng gói sản phẩm.
