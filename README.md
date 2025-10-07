Mục tiêu chung
- Ứng dụng SPA duy nhất (không router, không multi-page). Toàn bộ thao tác chính diễn ra trên một màn hình: Transfer view gồm 2 block xếp dọc (Send ở trên, Receive phía dưới).
- Topbar không có navigation. Bên trái: logo + tên app. Giữa: trống. Bên phải theo thứ tự: [History] [Settings] [Dark mode].
- History và Settings hiển thị bằng Dialog. Connection status nằm trong Settings.
- Tích hợp Electron IPC qua window.api.*. Nếu window.api không tồn tại (dev web), tự mock để UI vẫn chạy.

Stack/UI
- React + TypeScript + Vite
- TailwindCSS + shadcn/ui + lucide-react + sonner (toast)
- QR: qrcode.react (hiển thị mã code-phrase)
- State: Zustand (uiStore, transferStore, settingsStore)
- Tiêu chuẩn accessibility (aria, focus ring), dark/light mode

Ràng buộc Electron
- Topbar dùng -webkit-app-region: drag ở vùng nền; mọi nút/inputs đặt -webkit-app-region: no-drag.
- Không load remote; tất cả asset local. Không dùng BrowserWindow remote module. Bật contextIsolation.

Topbar (không navigation)
- Trái:
  - Logo (icon) + Tên app. Click logo không đổi view (vì chỉ có 1 view).
- Giữa: trống.
- Phải (theo thứ tự, có tooltip và aria-label):
  - History button (icon: Clock/History) → mở HistoryDialog.
  - Settings button (icon: Settings) → mở SettingsDialog (bao gồm Connection status).
  - Dark mode toggle (icon Sun/Moon) → toggle class “dark” ở html, lưu vào uiStore.theme (‘light’ | ‘dark’ | ‘system’ nếu cần).
- Optional: window controls (min/max/close) đặt ngoài vùng drag nếu bạn cần.

View duy nhất: TransferView (2 block dọc)
1) Send block (phía trên)
- Header: “Gửi (Send)”.
- Chế độ nội dung gửi:
  - Segmented control “Files/Folders” | “Text”.
  - Files/Folders:
    - Dropzone (drag-n-drop) + nút “Chọn file/folder”.
    - Hiển thị danh sách đã chọn: tên, size, icon file/folder, tooltip path đầy đủ; nút remove từng item; tổng dung lượng.
    - Validate: không rỗng; giới hạn số lượng/lớn nếu cần (configurable).
  - Text:
    - Textarea để gửi nhanh đoạn văn bản. Đếm ký tự. Nút “Dán từ clipboard”.
    - Mapping CLI: sử dụng cờ --text cho croc khi gửi text.
- Code-phrase:
  - Input code (tuỳ chọn). Nếu để trống, croc sẽ tự sinh khi start (hiển thị sau).
  - Nút “Random” (sinh code tạm thời ở UI hoặc chỉ clear để croc tự sinh); Nút “Copy” hiện sau khi có code thực.
  - QR code: hiển thị khi đang gửi và có code (dùng qrcode.react). Nút “Lưu QR”.
- Basic options (ít và sát block):
  - No-compress (áp dụng cho send).
  - Link “Mở cài đặt nâng cao…” → mở SettingsDialog (mặc định thiết lập ở cấp global).
  - Optional popover “Tùy chọn phiên này” (nếu muốn cho override tạm thời mà không mở Settings):
    - Relay tạm (host:port, pass)
    - Exclude patterns (multi)
    - Auto-confirm (yes)
- Actions:
  - Nút “Bắt đầu gửi” (enabled khi có dữ liệu hợp lệ).
  - Khi đang gửi: khu Progress xuất hiện: phase, % tổng, tốc độ, ETA; collapsible log tail; nút “Hủy” (AlertDialog xác nhận).
  - Kết thúc: badge “Thành công/Thất bại”; nút “Mở thư mục nguồn” (nếu phù hợp).

2) Receive block (phía dưới)
- Header: “Nhận (Receive)”.
- Chỉ có Code input:
  - Input code-phrase; nút “Dán từ clipboard”; optional “Quét QR” (nếu có camera).
  - Dòng mô tả: “Lưu vào thư mục: <đường dẫn mặc định> (đổi trong Settings)”.
- Actions:
  - Nút “Nhận file” (enabled khi có code).
  - Khi đang nhận: Progress (% tổng, tốc độ, ETA), log gọn; nút “Hủy”.
  - Hoàn tất: nút “Mở thư mục đích”.

Khu Progress dùng chung (cho cả Send/Receive)
- Hiển thị theo session id hiện hành:
  - Phase: connecting | sending | receiving | done | failed | canceled (badge).
  - Progress bar tổng (%). Dòng text: “45% • 12 MB/s • ETA 00:20”.
  - Log tail (ScrollArea) tối đa N dòng; màu đỏ cho error; copy log.
  - Nút Cancel → confirm → stop process.
- Khi thành công: hiển thị thời lượng, tốc độ trung bình; khi lỗi: banner/alert với message từ stderr.

HistoryDialog (mở từ Topbar)
- Tiêu đề: “Lịch sử truyền tải”.
- Bộ lọc:
  - Type: All | Send | Receive
  - Status: All | Success | Failed | Canceled | In-progress
  - Search: tìm theo code, relay, tên file
- Bảng:
  - Cột: Type (icon), Time (timestamp), Status (badge), Total size, Relay, Code (mask như xxxx-**-xxxx), Duration.
  - Sort theo thời gian (mới nhất ở trên).
- Xem chi tiết:
  - Click hàng mở Drawer/Modal chi tiết: files (tên/size), options đã dùng (relay, flags), log tail, tốc độ TB, command CLI tương đương (nút Copy).
- Hành động:
  - Retry/Resend: prefill Send block với thiết lập cũ (có thể không copy file path nếu không còn tồn tại).
  - Open folder (nếu là receive).
  - Clear all (AlertDialog xác nhận).
  - Export JSON (lịch sử).
- Dữ liệu:
  - Đọc qua window.api.history.list(); refresh khi nhận event transfer:done.

SettingsDialog (mở từ Topbar, bao gồm Connection status)
- Cấu trúc dạng Tabs:
  1) General
  2) Transfer Defaults
  3) Relay & Proxy
  4) Security
  5) Connection (Status & Diagnostics)
  6) Croc Binary
  7) Advanced
  8) About

- General
  - Default download folder (thư mục nhận file). Nút “Chọn…” mở dialog chọn folder.
  - Auto-open folder on done (receive).
  - Auto-copy code-phrase khi bắt đầu send.
  - Language: vi | en (nếu cần).
  - Theme: system | light | dark (có thể trùng với toggle nhanh trên Topbar, nhưng giá trị lưu tại đây).
  - Validation: folder phải tồn tại/ghi được (nếu không, cảnh báo và không lưu).

- Transfer Defaults
  - Send defaults:
    - No-compress (map tới --no-compress).
    - Exclude patterns mặc định (mảng string; mỗi pattern là một --exclude).
    - Connections (số kết nối nếu croc hỗ trợ).
    - Prefer protocol: tcp | udp (nếu croc hỗ trợ cờ tương ứng).
    - Force local / Disable local (map tới --force-local / --no-local nếu có).
  - Receive defaults:
    - Overwrite (map tới --overwrite).
    - Auto-confirm yes (map tới --yes).
    - Output folder: dùng field ở General; chỉ hiển thị read-only ở đây để người dùng biết.
  - Ghi chú: Nếu một option không được croc version hỗ trợ, disable và hiển thị tooltip “Không hỗ trợ ở phiên bản hiện tại”.

- Relay & Proxy
  - Relay mặc định:
    - Host:Port (ví dụ croc.schollz.com:9009)
    - Password (nếu relay riêng có mật khẩu; map --pass)
    - Nút “Kiểm tra relay” → gọi network check, hiển thị online/offline + latency ms.
  - Danh sách relay ưa thích:
    - Table: Host:Port, Pass (mask), Set default, Remove.
    - Nút Add relay → form nhỏ.
  - Proxy:
    - HTTP proxy (HTTP_PROXY), HTTPS proxy (HTTPS_PROXY).
    - Nút “Test Proxy” (thử request đơn giản) → báo on/off.
  - Validation:
    - Host:Port regex hợp lệ; pass có thể trống; URL proxy hợp lệ (http:// hoặc https://).

- Security
  - Curve (ví dụ: p256, p521, chacha20-curve25519 nếu croc hỗ trợ): Select.
  - Hash algorithm (ví dụ: sha256, sha512): Select.
  - Mô tả tooltip: “Tương đương: --curve …, --hash …”
  - Nếu version croc không hỗ trợ các option này, disable và ghi chú.

- Connection (Status & Diagnostics)
  - Relay status card:
    - Relay hiện tại (host:port), Online/Offline (dot màu), Latency ms, Lần kiểm tra gần nhất.
    - Nút “Kiểm tra lại”.
  - Proxy status card:
    - Proxy HTTP/HTTPS đang bật hay không; endpoint.
  - Network info ngắn:
    - OS/Arch, địa chỉ mạng cục bộ (chỉ hiển thị thông tin chung, không PII).
  - Croc version:
    - Hiển thị phiên bản croc đang dùng (window.api.croc.getVersion()).
  - Live update:
    - Subscribe window.api.events.on('relay:status', …) để cập nhật latency/online.

- Croc Binary
  - Phiên bản hiện tại (vX.Y.Z), đường dẫn binary.
  - Nút “Kiểm tra cập nhật”, “Tải lại binary”, “Mở thư mục chứa”.
  - Nút “Chạy kiểm tra nhanh” → chạy croc --help và lưu log chẩn đoán.
  - Cảnh báo nếu “not-installed”.

- Advanced
  - Hành vi:
    - Giới hạn log tail (số dòng), giữ lịch sử bao lâu (ngày).
    - Deep link enable (croc-ui://receive?code=…).
    - Cho phép override flags tự do: Textarea “Extra flags” (sẽ nối thêm vào lệnh; hiển thị cảnh báo người dùng tự chịu trách nhiệm).
  - Debug:
    - Enable verbose logs (ghi thêm stderr/stdout).
    - Nút “Xóa cache/binary” (cảnh báo).
  - An toàn:
    - Confirm overwrite mặc định (ảnh hưởng Receive).
    - Validate code-phrase format trước khi chạy (bật/tắt).

- About
  - Phiên bản app, license, credit croc (MIT), link repo, issue tracker.

Luồng và mapping CLI
- Send (Files/Folders):
  - Lấy defaults từ Settings (Relay, Proxy, No-compress, Exclude, …) + override từ popover phiên (nếu có).
  - buildSendArgs: “croc send [--code <code>] [--relay <host:port>] [--pass <pw>] [--no-compress] [--exclude <p>…] [--curve <…>] [--hash <…>] [--yes] <paths…>”
- Send (Text):
  - “croc send --text <message>” + các flags liên quan (relay, pass, curve, hash…).
- Receive:
  - “croc [--relay <host:port>] [--pass <pw>] [--overwrite] [--yes] <code>”
  - Out folder: điều khiển bởi working dir hoặc cờ --out nếu hỗ trợ; UI lấy đường dẫn từ Settings (General). Nếu dùng --out: thêm vào args.
- Proxy:
  - Set env HTTP_PROXY/HTTPS_PROXY từ Settings khi spawn.

State management (Zustand)
- uiStore:
  - dialogs: { historyOpen: boolean; settingsOpen: boolean }
  - theme: 'light' | 'dark' | 'system'
  - activeTransferId?: string
- transferStore:
  - sessions: Record<id, { type: 'send'|'receive'; mode?: 'files'|'text'; phase: 'idle'|'connecting'|'sending'|'receiving'|'done'|'failed'|'canceled'; percent: number; speed?: string; eta?: string; code?: string; startedAt: number; finishedAt?: number; logTail: string[]; error?: string }>
- settingsStore:
  - general: { downloadDir: string; autoOpenOnDone: boolean; autoCopyCodeOnSend: boolean; language: 'vi'|'en'; theme: 'system'|'light'|'dark' }
  - transferDefaults: { send: { noCompress: boolean; exclude: string[]; connections?: number; protocol?: 'tcp'|'udp'; forceLocal?: boolean; disableLocal?: boolean }; receive: { overwrite: boolean; yes: boolean } }
  - relayProxy: { defaultRelay: { host: string; pass?: string }; favorites: Array<{ host: string; pass?: string }>; proxy?: { http?: string; https?: string } }
  - security: { curve?: string; hash?: string }
  - advanced: { logTailLines: number; historyRetentionDays: number; deepLink?: boolean; extraFlags?: string; verboseLogs?: boolean; allowCodeFormatValidation?: boolean }
  - binary: { crocVersion?: string; crocPath?: string }
- Đồng bộ với window.api.settings.get()/set()/validate(). Khi mở SettingsDialog, load và bind form. Nút Save → validate → set.

IPC cần gọi
- app: selectFiles(opts), selectFolder(), clipboardRead(), clipboardWrite(text)
- croc: getVersion(), startSend(opts), startReceive(opts), stop(id)
- history: list(), detail(id), clear()
- settings: get(), set(patch), validate(settings)
- events: on('transfer:progress' | 'transfer:done' | 'relay:status', cb)

Hành vi/UX quan trọng
- Dark mode toggle luôn phản hồi tức thì; ghi nhớ vào settings (General.theme) nếu chọn “light”/“dark”; nếu “system” thì theo OS.
- Copy code-phrase: nếu General.autoCopyCodeOnSend=true thì tự copy khi bắt đầu gửi và code đã xác định.
- QR code: hiện khi có code; nút “Lưu QR” xuất data URL.
- Receive: Enter trong input code sẽ chạy “Nhận file”.
- Cancel: luôn confirm; nếu hủy, status = canceled, ghi lịch sử.
- Toast: thành công/ thất bại, lỗi kết nối, không tìm thấy binary, path không hợp lệ.
- Empty states:
  - Send: “Kéo thả file/folder vào đây hoặc nhấn ‘Chọn…’”.
  - Receive: “Nhập mã code-phrase để nhận”.
  - History rỗng: hướng dẫn cách gửi/nhận.
- Tooltips mapping CLI: ở mỗi nhóm option hiển thị dòng “Tương đương CLI: croc …”.

Validation và ràng buộc
- Code-phrase: cho phép trống ở Send; ở Receive bắt buộc. Nếu bật validate, kiểm tra pattern từ croc (số từ/định dạng PIN), nếu không rõ, chỉ kiểm tra không rỗng.
- Host:Port: regex hợp lệ. Hiển thị lỗi nếu sai.
- Proxy URL: phải bắt đầu bằng http:// hoặc https://.
- Download folder: phải ghi được; nếu không, đánh dấu lỗi và không lưu.
- Exclude patterns: mỗi dòng một pattern, cắt trắng, bỏ rỗng.

Trạng thái kết nối (nằm trong Settings/Connection)
- Relay: Online/Offline (dot xanh/đỏ), latency ms, last checked. Nút “Kiểm tra lại”.
- Proxy: On/Off, endpoint hiển thị.
- Croc: Version hiện tại (getVersion), đường dẫn binary, nút “Kiểm tra cập nhật”.
- Live update qua events 'relay:status'.

History model (hiển thị trong HistoryDialog)
- Mỗi record: id, type (send/receive), createdAt, finishedAt, status (in-progress/success/failed/canceled), files (name, size), totalSize, code (mask khi hiển thị), relay, options (hash, curve, noCompress, overwrite, yes, exclude...), speedAvg, duration, logTail.
- Hành động trên record: View details, Open folder (receive), Resend (prefill), Copy CLI.

UI copy (việt hóa gợi ý)
- Buttons: “Bắt đầu gửi”, “Nhận file”, “Hủy”, “Chọn…”, “Dán từ clipboard”, “Random”, “Copy”, “Lưu QR”, “Mở thư mục”, “Lưu”, “Kiểm tra”, “Xóa tất cả”, “Xuất JSON”.
- Labels: “Mã code-phrase”, “Không nén (no-compress)”, “Ghi đè (overwrite)”, “Tự động xác nhận (yes)”, “Thư mục tải về mặc định”, “Relay mặc định”, “Proxy HTTP/HTTPS”, “Đường cong (curve)”, “Thuật toán băm (hash)”.
- Status/badge: “Đang kết nối”, “Đang gửi”, “Đang nhận”, “Hoàn tất”, “Thất bại”, “Đã hủy”.

Responsive
- Trên màn nhỏ: Send và Receive vẫn xếp dọc. Nút trong Topbar co thành icon-only. Dialogs dùng full-screen modal trên mobile.

Accessibility/Keyboard
- Mọi nút có aria-label. Focus ring rõ ràng.
- Phím tắt:
  - Ctrl/Cmd+H: HistoryDialog
  - Ctrl/Cmd+,: SettingsDialog
  - Shift+D: toggle dark mode
  - Enter trong Receive: bắt đầu nhận
  - Esc: đóng Dialog/Sheet

Theming/Visual
- Dùng shadcn/ui mặc định; sắc độ theo theme. Progress, Badge, Dialog, Table, Tabs, Tooltip, Switch, Select, Input, Textarea, ScrollArea, Separator, Toast.
- Icons: lucide-react (Send, Download, Settings, History, Activity, Copy, X, Check, Wifi, Sun, Moon).

Components cần sinh
- AppShellTopbar: trái logo+name; phải [History][Settings][Theme]; xử lý drag/no-drag.
- TransferView:
  - SendBlock: ModeSwitch (Files/Text), FileDropzone, SelectedList, TextAreaSend, CodeInput, BasicOptions, SessionOverridesPopover (optional), Actions, ProgressArea, QRCodeDisplay.
  - ReceiveBlock: CodeInput, Actions, ProgressArea.
- Dialogs:
  - HistoryDialog: Filters, HistoryTable, DetailDrawer/Modal, Actions.
  - SettingsDialog: Tabs (General, Transfer Defaults, Relay & Proxy, Security, Connection, Croc Binary, Advanced, About).
- Shared: Button/IconButton, Badge, Tooltip, Progress, Table, Dialog, Tabs, Switch, Select, Input, Textarea, ScrollArea, Separator, Toast, KeyValueRow, EmptyState.

Mock window.api (khi chạy web)
- Nếu window.api không tồn tại, tạo mock:
  - app.selectFiles → Promise.resolve([])
  - app.selectFolder → Promise.resolve(null)
  - app.clipboardRead/Write → resolve ngay
  - croc.getVersion → Promise.resolve('not-installed')
  - croc.startSend/startReceive → Promise.resolve({ id: 'mock-id' }) và phát event giả tiến trình 0→100%
  - croc.stop → resolve
  - history.list/detail/clear → mock data
  - settings.get/set/validate → dùng localStorage
  - events.on → trả unsubscribe no-op

Tiêu chí chấp nhận
- Topbar đúng bố cục: trái logo+name; phải [History] [Settings] [Dark mode]; không có navigation.
- TransferView là 1 màn duy nhất, có Send ở trên (Files/Text), Receive phía dưới (chỉ code input).
- Progress hiển thị chuẩn; có Cancel; có QR khi gửi và có code.
- HistoryDialog hiển thị danh sách và chi tiết; có filter, clear, export, resend.
- SettingsDialog có đầy đủ các tab và trường nêu trên, trong đó Connection hiển thị trạng thái relay/proxy/croc live.
- UI hoạt động với window.api.*; nếu không có, UI vẫn chạy với mock.

Lưu ý nhỏ khi implement
- Parsing progress của croc có thể dùng carriage return; UI chỉ cần hiển thị payload progress từ IPC, không cần tự parse ở renderer (nhưng vẫn chuẩn bị vùng log).
- Overwrite chủ yếu áp dụng bên nhận; không hiển thị option này trong Send trừ khi muốn làm preset.
- Code-phrase: nếu người dùng để trống ở Send → coi như “auto” (do croc sinh); UI hiển thị sau khi có stdout tương ứng.

Nếu bạn muốn, tôi có thể tiếp tục viết danh sách fields cụ thể (name, type, default, validate) cho từng tab trong Settings để codegen form chuẩn xác hơn.