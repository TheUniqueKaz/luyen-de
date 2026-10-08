# Ôn luyện

Website front-end bằng HTML, CSS và JavaScript thuần, không cần cài thư viện hoặc chạy bước build.

Website công khai: [Mở Ôn luyện](https://theuniquekaz.github.io/luyen-de/).

GitHub Pages triển khai nhánh `main`, thư mục gốc. Trang `index.html` ở thư mục gốc chuyển đến ứng dụng trong `dist/`; các lần cập nhật mã nguồn trên nhánh `main` sẽ được GitHub Pages xuất bản lại.

## Mở trên máy

Mở `dist/index.html` bằng trình duyệt. Cả nội dung và tính năng đều hoạt động ngoại tuyến. Nếu trình duyệt hạn chế lưu dữ liệu với địa chỉ `file://`, chạy một static server trong thư mục `dist` (ví dụ `python -m http.server 4173`) rồi mở `http://localhost:4173`.

## Tính năng

- 180 câu hỏi, mỗi câu có 4 lựa chọn A–D và một đáp án đúng.
- Luyện tập: phản hồi ngay, khóa câu đã trả lời để tự đánh giá chính xác.
- Thi thử: chọn thời gian, đổi đáp án trước khi nộp, tự nộp khi hết giờ.
- Chọn 10 / 20 / 30 / 50 / 180 câu, trộn thứ tự câu hỏi.
- Lưu câu hỏi, tìm kiếm, xem lại đáp án, luyện câu sai và câu chưa làm.
- Tra cứu từ khóa trong cả câu hỏi và đáp án, không phân biệt dấu tiếng Việt hoặc chữ hoa/thường. Nhập nhiều từ để tìm các câu có đủ từ khóa; từ khớp được tô sáng và phần đáp án tự mở. Nhập số để tìm đúng số câu. Nút “Tra cứu” luôn ở đầu trang, Ctrl+F / Cmd+F mở ô tìm kiếm khi không đang làm bài.
- Tự lưu bài đang làm và tối đa 30 lượt trong localStorage của trình duyệt. Dữ liệu không đồng bộ giữa thiết bị.
- Bố cục thích ứng với điện thoại và máy tính. Phím 1–4 chọn đáp án, phím mũi tên chuyển câu.

## Dữ liệu nguồn

Đọc từ file `Xuatcauhoi_In_aa094b16-f63f-4bc2-837d-e8f6714668b0.xlsx`, Sheet1. Dấu X ở cột E xác định đáp án đúng. Nội dung và khóa đáp án theo tài liệu được cung cấp, không được kiểm chứng bằng nguồn bên ngoài.

- Câu 74: nguồn có 5 lựa chọn. Theo yêu cầu mỗi câu có 4 đáp án để chọn, gộp nội dung C và D gốc vào C; chuyển E “Tất cả các đáp án trên” thành D. Không bỏ ý nào; đáp án đúng được ánh xạ sang D. Ghi chú này cũng xuất hiện trong trang.
- Câu 4: nguồn có nhãn thứ ba là “2”, nội dung “0 đồng chí…”. Chuẩn hóa nhãn thành C nhưng giữ nguyên nội dung và dấu X, đồng thời hiện ghi chú cần đối chiếu.
- Câu 173: chuẩn hóa nhãn “â” thành A theo vị trí, không đổi nội dung hoặc khóa đáp án.

## Chỉnh sửa và kiểm tra

- `dist/questions.js`: dữ liệu. Mảng `correct` chứa chỉ số đáp án, bắt đầu từ 0.
- `dist/app.js`: giao diện và logic.
- `dist/styles.css`: kiểu trình bày và bố cục responsive.
- `dist/index.html`: khung trang.
- Chạy `node verify.cjs` để kiểm tra dữ liệu, chấm điểm, luyện lại, lưu tiến độ và tự nộp bài.

Có thể triển khai thư mục `dist` trên dịch vụ hosting tĩnh bất kỳ.
