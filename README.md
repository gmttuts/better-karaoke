# Better YouTube Lyric

Extension Chrome giúp hát karaoke ngay trên YouTube: tự tìm lời bài hát cho video đang xem, chạy lời theo nhạc, hiện chữ to trên video, và tìm nhanh bản karaoke của bài, tất cả trong cùng một khung hình.

## Tính năng

- **Panel lời bài hát** ở cột bên phải video: tô sáng dòng đang hát và tự cuộn. Bấm vào một dòng để tua tới đó (với lời có thời gian).
- **Karaoke trên video** (nút 🎤 Karaoke): chữ đổi màu mượt theo nhịp hát, dùng được khi toàn màn hình, chữ tự to theo kích thước video. Các kiểu chữ có sẵn ở "Kiểu chữ":
  - **Karaoke xanh dương** (mặc định) / **Karaoke đỏ**: giống đĩa karaoke Việt, chữ Roboto đậm (đổi sang chữ hẹp karaoke trong 🎨), trắng ánh bạc viền đen; phần đã hát chuyển xanh dương (hoặc đỏ) viền trắng, có bóng đổ, hai dòng so le.
  - **Nổi bật**: một dòng lớn, phần đã hát chuyển màu vàng sang hồng, dòng kế tiếp nhỏ bên dưới.
  - **Khung tối**: khung tối mờ, dễ đọc trên mọi nền video.
  - **Gọn nhẹ**: một dòng nhỏ dạng viên thuốc, ít che video.

  - **🎨 Tuỳ chỉnh**: phông chữ, độ đậm, cỡ chữ, màu chữ / màu đã hát (có chuyển màu), viền, bóng đổ, nền (khung, viên thuốc) cùng lề trong khung trên / dưới / trái / phải, bố cục (so le, 1 dòng, 2 dòng, 3 dòng), hiệu ứng (chạy từng chữ hoặc sáng cả dòng), khoảng cách mép. Lưu lại thành **preset** riêng, chọn lại trong "Kiểu chữ".

  Nút **⬇ Dưới / ⬆ Trên** đổi vị trí lời để không che chữ có sẵn trong MV. Chỉnh cỡ chữ bằng A− / A+.
- **⧉ Cửa sổ nổi**: mở lời trong một cửa sổ nhỏ luôn nằm trên cùng (Document Picture-in-Picture), vẫn chạy khi chuyển tab hoặc làm việc khác. Dùng chung kiểu chữ với overlay. Có thanh điều khiển như mini player của YouTube (hiện khi rê chuột, luôn hiện khi đang dừng): bài trước, câu trước, phát/dừng, câu sau, bài sau, thanh tua; phím Space và ←/→ cũng dùng được.
- **YouTube Shorts**: panel nổi cạnh video Shorts (thu gọn được bằng cách bấm tiêu đề), lời karaoke hiện trên video đứng (tự nằm ngay trên tên kênh và tiêu đề, không che), tự tìm lời mới khi lướt sang Short khác. Short thường chỉ là một đoạn giữa bài: phụ đề sẽ tự canh, nếu không có thì bấm 📍 / bấm vào dòng đang hát.
- **Tìm lời theo thứ tự ưu tiên** (chạy song song, kết quả hiện dần):
  1. 📄 **Mô tả video** và 💬 **Comment** của chính video. Comment dạng `0:15 lời…` được chuyển thành lời có thời gian.
  2. 🔁 **Bản đăng khác** của cùng bài trên YouTube (video lyric, bản re-up): đọc mô tả, và với video "Lyrics" thì đọc thêm comment.
  3. 🌐 **LRCLIB** (lời có thời gian từng dòng, có cả nhạc Việt) và 🎸 **Hợp âm chuẩn** (lời nhạc Việt, đã bỏ hợp âm).
  4. 📝 **Phụ đề YouTube**: chỉ tự chạy khi các nguồn trên không có kết quả. Nếu đã có kết quả thì bấm vào chip để tải.
- **Chọn nguồn khác** bằng menu thả xuống, hoặc bấm vào chip nguồn (bấm tiếp để xem kết quả khác của cùng nguồn; chip lỗi bấm để thử lại). Lựa chọn và độ lệch được nhớ riêng cho từng video.
- **🎯 Tự canh theo phụ đề**: dùng phụ đề YouTube của video (kể cả phụ đề tự động) làm nhịp. Extension so khớp chữ trong lời với chữ trong phụ đề theo thứ tự, nên phụ đề sai chính tả vẫn canh được.
  - Lời **không có thời gian** (comment, Hợp âm chuẩn…): tự gán thời gian cho từng dòng. Việc này chạy tự động khi chọn lời đó.
  - Lời **có thời gian** nhưng lệch so với MV (LRCLIB canh theo bản audio): tự so với phụ đề. Lệch đều cả bài thì chỉnh một số; lệch thay đổi giữa các đoạn (intro, nhạc dạo, nhịp khác) thì đặt nhiều điểm canh dọc bài, mỗi đoạn lệch bao nhiêu sửa bấy nhiêu.
  - Phụ đề được chọn theo ngôn ngữ của lời (ưu tiên phụ đề do người đăng tải lên, sau đó mới tới phụ đề tự động). Nếu cần, CC được bật thoáng qua để trình phát tải phụ đề, rồi trả về như cũ.
- **Ghim dòng 📍**: bấm 📍 cạnh dòng đang hát. Mốc đầu tiên dời cả bài; mốc tiếp theo chỉ làm co giãn phần giữa hai mốc, phần đã đúng giữ nguyên. Thường 2–3 mốc là đúng cả bài. Các mốc được nhớ cho từng video.
- **Lệch ±0.5s** (giữ Shift: ±0.1s) dời cả bài. Bấm vào số lệch để về 0 và bỏ các mốc.
- **Video không có phụ đề** và lời không có thời gian: bấm vào dòng đang hát, lời sẽ tự cuộn theo nhịp ước lượng.
- **Tab "Tìm bản Karaoke"**: danh sách bản karaoke ngay trong panel, có nút nhanh *Tone nam / Tone nữ / Song ca / Beat* (bài Việt) hoặc *lower key / duet / instrumental* (bài quốc tế). Bấm là chuyển video, lời tự tìm lại.
- **✏️ Sửa lời / ✍ Tự nhập lời**: sửa lời đang hiện, hoặc tự gõ / dán / dịch lời khi không tìm được. Bản của bạn được nhớ riêng cho từng video và hiện trước ở lần mở sau (nguồn "✍ Lời của bạn"). Giữ `[phút:giây]` ở đầu dòng để giữ thời gian. Nút **📝 Lấy khung từ phụ đề** điền sẵn phụ đề YouTube kèm thời gian, chỉ cần sửa chữ hoặc thay bằng lời dịch.
  - Khi đang sửa: dòng đang phát được tô hồng và tự cuộn theo nhạc (tắt được bằng "Cuộn theo nhạc"). Nháy đúp một dòng có giờ để tua tới đó.
  - **🔎 Tìm trong lời**: gõ không dấu cũng tìm được, Enter / Shift+Enter để qua lại giữa các kết quả.
  - **📍 Gắn giờ đang phát** (Ctrl/⌘ + Enter): ghi giờ hiện tại vào dòng có con trỏ rồi xuống dòng kế, vừa nghe vừa bấm để canh lời dịch.
- **🌐 Song ngữ**: chọn một bản lời khác (thường là lời bạn tự dịch) để hiện thành dòng nhỏ dưới mỗi dòng, trên video, trong panel và cửa sổ nổi. Hai bản cùng có thời gian thì ghép theo thời gian, không thì ghép theo thứ tự dòng (giữ số dòng như bản gốc là khớp). Nút ⇅ đổi chỗ lời chính và lời dịch. Lựa chọn được nhớ cho từng video.
- **⏱ Gõ nhịp**: phát bài, bấm **Space** đúng lúc bắt đầu hát dòng có viền; mỗi lần bấm ghi thời gian cho một dòng. **Backspace** lùi một dòng và tua lại 3 giây; bấm vào một dòng để gõ lại từ đó. Dòng bị bỏ qua được ước lượng theo hai dòng bên cạnh. Kết quả lưu thành "✍ Lời của bạn" có thời gian. Mỗi video giữ được hai bản của bạn, nên gõ nhịp lời gốc không ghi đè lên bản dịch đang hiện.
- **Kéo thanh dưới khung lời** để thu gọn hoặc mở rộng; độ cao được nhớ lại. Nháy đúp thanh để về mặc định.
- **Sao chép** lời, **Mở nguồn** để xem trang gốc.
- **💾 Sao lưu / khôi phục** (trong cửa sổ cài đặt của extension): xuất một file `.json` gồm lời bạn đã sửa, điểm 📍, độ lệch, lời đã chọn cho từng video, preset kiểu chữ và cài đặt. Nhập lại ở máy khác hoặc sau khi cài lại; dữ liệu đang có được giữ, video nào có ở cả hai bên thì lấy bản sửa sau cùng.

## Cài đặt (chế độ nhà phát triển)

1. Mở `chrome://extensions`, bật **Developer mode** (góc trên bên phải).
2. Bấm **Load unpacked** và chọn thư mục `better-youtube-lyric`.

`manifest.json` có trường `key` để ID của extension luôn là `hpklleajpolgkiipenbegkgjmeogllno`, dù thư mục nằm ở đâu hay đổi tên. Dữ liệu trong `chrome.storage` gắn với ID này nên không bị mất khi chuyển thư mục.
3. Mở một video nhạc trên YouTube. Panel hiện ở đầu cột bên phải.

Bấm biểu tượng extension để **tắt hẳn extension** (công tắc "Bật trên YouTube", áp dụng ngay cho mọi tab), bật/tắt **tự hiện lời trên video** (mặc định tắt; chọn kiểu chữ hay mở 🎨 chỉ bật lời cho video đang xem), bật/tắt từng nguồn, ưu tiên lời có thời gian, số trang comment cần quét. Kiểu chữ chỉnh trong panel (🎨).

## Cách hoạt động

```
src/
  background.js        Service worker: tải lrclib.net, hopamchuan.com cho content script (chỉ 2 host này)
  bridge.js            Chạy trong page world: đọc ytcfg, dữ liệu player, giữ bản sao phụ đề mà player tải về
  content/
    util.js            Cài đặt, bộ nhớ theo video, tách tên bài/ca sĩ, nhận diện đoạn lời trong văn bản, đọc LRC
    youtube.js         Gọi API nội bộ của YouTube (InnerTube): next, search, comment, phụ đề
    sources.js         6 nguồn lời, mỗi nguồn trả về danh sách ứng viên có điểm
    align.js           Canh lời theo phụ đề: khớp chữ theo thứ tự (LCS), lọc mốc đi lùi, nội suy dòng thiếu
    ui.js              Panel + overlay (shadow DOM), đồng bộ theo thời gian video, tab karaoke
    main.js            Theo dõi chuyển trang trong YouTube, chạy các nguồn, chọn kết quả tốt nhất
  options/             Trang cài đặt (cũng là popup)
fonts/                 Roboto Condensed (Apache 2.0, có bộ chữ tiếng Việt) cho kiểu Karaoke
```

- **Tên bài và ca sĩ**: ưu tiên thẻ "Nhạc" của YouTube dưới mô tả. Nếu không có thì tách từ tiêu đề (bỏ `[Official MV]`, `Karaoke`, `Tone Nam`…), dùng tên kênh để biết bên nào là ca sĩ.
- **Nhận diện lời trong comment/mô tả**: tìm đoạn liền mạch dài nhất gồm các dòng ngắn, bỏ dòng có link, hashtag, @, "subscribe", lượt xem, năm, dòng credit (Tác giả:, Hòa âm:, Mixing Engineer…)… Cần ít nhất 8 dòng. Có tiêu đề "Lời bài hát:" / "Lyrics:" hoặc chứa tên bài thì được cộng điểm.
- **Gọi YouTube ẩn danh** (`credentials: 'omit'`), nên không đụng tới tài khoản người dùng.
- **Phụ đề**: YouTube chỉ trả file phụ đề cho chính trình phát (kèm token `pot`). Vì vậy `bridge.js` giữ bản sao của file trình phát đã tải. Nếu chưa có, extension bật CC thoáng qua để trình phát tải, rồi trả CC về trạng thái cũ.

## Tham khảo: các extension đang có

| Extension | Điểm hay | Thiếu |
|---|---|---|
| Singalong for YouTube | Lời có thời gian từ LRCLIB, overlay trên video, phiên âm Hàn/Nhật | Chỉ một nguồn, không tìm comment, không có karaoke |
| Singify | Widget nổi, cửa sổ luôn ở trên, tự căn theo CC | Phụ thuộc phụ đề |
| LyricYT, LyricScroll | Nhẹ, có chế độ karaoke | Ít nguồn, ít người dùng |

Better YouTube Lyric lấy ý tưởng overlay và LRCLIB, rồi thêm phần những extension trên chưa có: lời từ comment, từ bản đăng lại trên YouTube, nguồn nhạc Việt, và tìm bản karaoke ngay trong panel.

## Giới hạn

- Hợp âm chuẩn là đọc HTML trang web. Nếu trang đổi giao diện thì nguồn này có thể hỏng (các nguồn khác vẫn chạy). Tắt được trong cài đặt.
- Lời trong comment phụ thuộc thứ tự "comment hàng đầu" của YouTube, mỗi lần tải có thể khác nhau. Tăng "Số trang comment quét" nếu hay bị sót.
- Lời từ LRCLIB được canh theo bản audio. Với MV có đoạn mở đầu dài, cần chỉnh "Lệch".
- Chạy trên video thường và Shorts của `www.youtube.com` (YouTube Music đã có lời riêng).

## Đưa lên Chrome Web Store (sau này)

- Bỏ trường `key` trong `manifest.json` trước khi đóng gói (Store tự cấp ID).
- Quyền đang xin: `storage`, `unlimitedStorage` (không giới hạn 10 MB cho lời đã sửa), cùng host `lrclib.net` và `hopamchuan.com`. Không thu thập dữ liệu người dùng; cài đặt lưu trong `chrome.storage` (preset kiểu chữ và dữ liệu từng video ở `local`, các tuỳ chọn khác ở `sync`).
- Cần thêm: ảnh chụp màn hình 1280×800, trang chính sách quyền riêng tư, và mô tả lý do đọc hopamchuan.com (hoặc tắt nguồn này mặc định trong bản Store).
