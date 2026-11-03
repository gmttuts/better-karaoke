# Better YouTube Lyric

Extension Chrome giúp hát karaoke ngay trên YouTube: tự tìm lời bài hát cho video đang xem, chạy lời theo nhạc, hiện chữ to trên video, và tìm nhanh bản karaoke của bài, tất cả trong cùng một khung hình.

## Tính năng

- **Panel lời bài hát** ở cột bên phải video: tô sáng dòng đang hát và tự cuộn. Bấm vào một dòng để tua tới đó (với lời có thời gian).
- **Karaoke trên video** (nút 🎤 Karaoke): chữ đổi màu mượt theo nhịp hát, dùng được khi toàn màn hình, chữ tự to theo kích thước video. Các kiểu chữ có sẵn ở "Kiểu chữ":
  - **Karaoke xanh dương** (mặc định) / **Karaoke đỏ**: giống đĩa karaoke Việt, chữ Roboto đậm (đổi sang chữ hẹp karaoke trong 🎨), trắng ánh bạc viền đen; phần đã hát chuyển xanh dương (hoặc đỏ) viền trắng, có bóng đổ, hai dòng so le.
  - **Nổi bật**: một dòng lớn, phần đã hát chuyển màu vàng sang hồng, dòng kế tiếp nhỏ bên dưới.
  - **Khung tối**: khung tối mờ, dễ đọc trên mọi nền video.
  - **Phụ đề YouTube**: mỗi dòng một khung đen mờ như phụ đề của YouTube.
  - **Dải điện ảnh**: một dải tối mờ chạy ngang hết video, chữ xanh nhạt.
  - **Gọn nhẹ**: một dòng nhỏ dạng viên thuốc, ít che video.

  - **🎨 Tuỳ chỉnh** (chia nhóm Chữ / Màu / Nền / Bố cục): phông chữ, độ đậm, cỡ chữ, màu chữ / màu đã hát (có chuyển màu), viền, bóng đổ, nền (khung, viên thuốc, dải ngang, từng dòng) cùng lề trong khung trên / dưới / trái / phải, bố cục (so le, 1 dòng, 2 dòng, 3 dòng), hiệu ứng (chạy từng chữ hoặc sáng cả dòng), khoảng cách mép. Lưu lại thành **preset** riêng, chọn lại trong "Kiểu chữ". **Nháy đúp một thanh trượt** để đưa thông số đó về mặc định của kiểu đang chọn.

  Nút **⬇ Dưới / ⬆ Trên** đổi vị trí lời để không che chữ có sẵn trong MV. Chỉnh cỡ chữ bằng A− / A+.

  **📌 Kiểu chữ theo kênh**: bấm 📌 để kênh đang xem nhớ kiểu chữ riêng (ví dụ kênh nhạc Việt dùng Karaoke xanh dương, kênh K-pop dùng Phụ đề YouTube). Khi 📌 đang bật, đổi kiểu hay chỉnh 🎨 chỉ áp dụng cho kênh đó; bấm lại để dùng kiểu chung.

  **Tô theo từng chữ**: khi lời có thời gian từng chữ (LRC mở rộng dạng `<01:02.30>` trước mỗi chữ, hoặc canh theo phụ đề tự động của YouTube vốn ghi giờ từng chữ), mỗi chữ sáng đúng lúc được hát thay vì chạy đều cả dòng. Thông báo sau khi 🎯 canh cho biết bao nhiêu dòng được tô theo từng chữ.
- **🎙 Chấm điểm** (nút 🎙 cạnh ⧉): mở một cửa sổ nhỏ nghe micro trong lúc bạn hát theo lời trên video. Hết mỗi dòng, video hiện điểm dòng đó và điểm tổng (cửa sổ cũng hiện điểm, nốt bạn đang hát, độ to). Điểm gồm 40% hát đủ dòng và 60% hát đúng nốt: nốt bạn hát được so với các nốt đang vang trong nhạc của video, quãng tám nào cũng được. Cần lời có thời gian (⏱ / 🎯 / LRCLIB). **Đeo tai nghe**, nếu không micro sẽ nghe cả giọng ca sĩ từ loa. Micro chạy trong cửa sổ của extension nên quyền micro cấp cho extension, không cấp cho youtube.com; âm thanh chỉ xử lý trên máy, không ghi lại, không gửi đi.
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
- **🔠 Đọc chữ trên video** (trong ✏️ Sửa lời, hoặc nút ngay dưới "Chưa tìm thấy lời"): cho video không có lời ở đâu, không có phụ đề, nhưng có chữ lời bài hát trên hình (video lyric, karaoke, MV có chữ). Extension tua video ×2, tắt tiếng, đọc chữ trên các khung hình bằng Tesseract (chạy ngay trên máy, có sẵn bộ chữ tiếng Việt), rồi điền vào ô sửa lời kèm thời gian: lúc dòng chữ hiện ra, hoặc với video lời cuộn thành danh sách thì lúc dòng đó lên tới giữa. Mất khoảng nửa thời lượng bài; bấm ⏹ để dừng sớm và lấy phần đã đọc. Chữ đọc sai thì sửa ngay trong ô rồi bấm 💾 Lưu lời. Tên bài, ca sĩ, logo kênh và chữ nằm yên suốt video được bỏ đi.
- **✏️ Sửa lời / ✍ Tự nhập lời**: sửa lời đang hiện, hoặc tự gõ / dán / dịch lời khi không tìm được. Bản của bạn được nhớ riêng cho từng video và hiện trước ở lần mở sau (nguồn "✍ Lời của bạn"). Giữ `[phút:giây]` ở đầu dòng để giữ thời gian. Nút **📝 Lấy khung từ phụ đề** điền sẵn phụ đề YouTube kèm thời gian, chỉ cần sửa chữ hoặc thay bằng lời dịch.
  - Khi đang sửa: dòng đang phát được tô hồng và tự cuộn theo nhạc (tắt được bằng "Cuộn theo nhạc"). Nháy đúp một dòng có giờ để tua tới đó.
  - **🔎 Tìm trong lời**: gõ không dấu cũng tìm được, Enter / Shift+Enter để qua lại giữa các kết quả.
  - **📍 Gắn giờ đang phát** (Ctrl/⌘ + Enter): ghi giờ hiện tại vào dòng có con trỏ rồi xuống dòng kế, vừa nghe vừa bấm để canh lời dịch.
- **🌐 Song ngữ**: chọn một bản lời khác (thường là lời bạn tự dịch) để hiện thành dòng nhỏ dưới mỗi dòng, trên video, trong panel và cửa sổ nổi. Hai bản cùng có thời gian thì ghép theo thời gian, không thì ghép theo thứ tự dòng (giữ số dòng như bản gốc là khớp). Nút ⇅ đổi chỗ lời chính và lời dịch. Lựa chọn được nhớ cho từng video.
- **🔤 Phiên âm Latin** (trong menu 🌐 Song ngữ): lời tiếng Hàn, tiếng Nhật, tiếng Trung hiện thêm cách đọc bằng chữ Latin dưới mỗi dòng, trên video và trong panel. Tiếng Hàn theo chuẩn Romanization của Hàn Quốc (có nối âm, biến âm mũi: 감사합니다 → gamsahamnida); tiếng Nhật đọc kana theo Hepburn (chữ Hán giữ nguyên vì cần từ điển theo từ); tiếng Trung ra pinyin có dấu thanh, mỗi chữ một cách đọc phổ biến nhất (dữ liệu Unihan của Unicode, 50 KB, chỉ tải khi cần).
- **⏱ Gõ nhịp**: phát bài, bấm **Space** đúng lúc bắt đầu hát dòng có viền; mỗi lần bấm ghi thời gian cho một dòng. **Backspace** lùi một dòng và tua lại 3 giây; bấm vào một dòng để gõ lại từ đó. Dòng bị bỏ qua được ước lượng theo hai dòng bên cạnh. Kết quả lưu thành "✍ Lời của bạn" có thời gian. Mỗi video giữ được hai bản của bạn, nên gõ nhịp lời gốc không ghi đè lên bản dịch đang hiện.
- **Kéo thanh dưới khung lời** để thu gọn hoặc mở rộng; độ cao được nhớ lại. Nháy đúp thanh để về mặc định.
- **🔍 Tìm theo tên**: extension đoán sai tên bài hoặc ca sĩ? Gõ lại rồi bấm Tìm, mọi nguồn chạy lại theo tên mới. Tên sửa được nhớ cho video đó (hiện dấu ✎ cạnh tên ca sĩ); bấm "Dùng tên tự đoán" để bỏ.
- **Tab "Đã xem"**: các bài đã mở, mới nhất trước, kèm số lần xem. Bấm ☆ cạnh tên bài (hoặc trong danh sách) để đánh dấu **★ yêu thích**; lọc "★ Yêu thích" để xem riêng. "Xoá lịch sử" giữ lại bài yêu thích. Lịch sử nằm trong file sao lưu.
- **Sao chép** lời, **Mở nguồn** để xem trang gốc.
- **⬇ Xuất**: lưu lời có thời gian ra file **`.lrc`** (cho trình phát nhạc) hoặc **`.srt`** (phụ đề cho VLC, CapCut, Premiere, YouTube Studio). File dùng đúng thời gian bạn đã canh: độ lệch, các mốc 📍, ⏱ gõ nhịp, 🎯 canh theo phụ đề. Lời chưa có thời gian thì canh trước rồi xuất.
- **☁ Gửi lên LRCLIB**: chia sẻ lời đã canh lên thư viện mở LRCLIB để người khác (và các ứng dụng nghe nhạc khác) dùng. Mở một trang riêng để kiểm tra tên bài, ca sĩ, album, thời lượng và lời; báo nếu LRCLIB đã có bản cùng thời lượng. Chỉ gửi khi bạn tích ô xác nhận và bấm gửi (LRCLIB yêu cầu máy giải một bài toán nhỏ thay cho tài khoản, mất khoảng 10–30 giây).
- **Phím tắt** (Alt, trên Mac là Option): **Alt L** bật/tắt lời trên video, **Alt P** cửa sổ nổi, **Alt K** ghim 📍 dòng đang hát, **Alt [ / Alt ]** lời sớm/muộn 0,5s (thêm Shift: 0,1s), **Alt − / Alt =** chữ nhỏ/to. Không dùng khi đang gõ trong ô nhập.
- **Mở lại video là có lời ngay**: kết quả tìm được lưu 7 ngày (1 ngày nếu không tìm thấy gì, vì comment và trang lời còn được bổ sung). Bấm **↻ Tìm lại** để tìm lại từ đầu ở mọi nguồn. Kết quả lưu không nằm trong file sao lưu.
- **💾 Sao lưu / khôi phục** (trong cửa sổ cài đặt của extension): xuất một file `.json` gồm lời bạn đã sửa, điểm 📍, độ lệch, lời đã chọn cho từng video, preset kiểu chữ và cài đặt. Nhập lại ở máy khác hoặc sau khi cài lại; dữ liệu đang có được giữ, video nào có ở cả hai bên thì lấy bản sửa sau cùng.

## Cài đặt (chế độ nhà phát triển)

1. Mở `chrome://extensions`, bật **Developer mode** (góc trên bên phải).
2. Bấm **Load unpacked** và chọn thư mục `better-youtube-lyric`.

`manifest.json` có trường `key` để ID của extension luôn là `hpklleajpolgkiipenbegkgjmeogllno`, dù thư mục nằm ở đâu hay đổi tên. Dữ liệu trong `chrome.storage` gắn với ID này nên không bị mất khi chuyển thư mục.
3. Mở một video nhạc trên YouTube. Panel hiện ở đầu cột bên phải.

**Khi cập nhật:** bấm ↻ trên thẻ extension rồi tải lại các tab YouTube đang mở. Tab mở từ trước vẫn chạy bản cũ; từ 0.11 panel ở tab đó tự báo "Better Lyric vừa được cập nhật" kèm nút tải lại. Số phiên bản hiện trong popup và khi rê chuột lên tiêu đề panel.

## Phát triển

Cần Node 18+ và Google Chrome (không cần cài gói nào).

```bash
npm run build        # dist/better-youtube-lyric (thư mục để Load unpacked) + file zip
npm test             # build rồi chạy thử headless (tắt tiếng) trên một video YouTube
npm run build:store  # thêm bản zip bỏ trường "key" để nộp Chrome Web Store
```

`build` dừng lại nếu thiếu file mà `manifest.json` cần (icon, script, trang cài đặt, font). `test` chạy các bộ test (tách tên bài, thời gian từng chữ, xuất LRC/SRT, bài toán của LRCLIB), rồi mở video `6HQWus2DOsI` (đổi bằng `VIDEO=<id>`) và kiểm tra: panel, bảng 🎨, nút 🎤 Karaoke, tên bài, phím tắt, 📌, xuất SRT, trang gửi LRCLIB (không gửi thật) và lỗi JavaScript. Video có lời LRCLIB như `VIDEO=JGwWNGJdvx8` kiểm tra được cả file SRT.

**Ngôn ngữ giao diện**: tiếng Việt hoặc tiếng Anh, chọn trong cửa sổ cài đặt ("Ngôn ngữ / Language"). Mặc định *Tự động*: tiếng Việt khi Chrome hoặc danh sách ngôn ngữ ưa thích của trình duyệt có tiếng Việt, còn lại là tiếng Anh. Đổi ngôn ngữ xong thì tải lại tab YouTube.

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
    panel-css.js       Giao diện panel (CSS)
    looks.js           Các kiểu chữ trên video, thông số 🎨, cách vẽ một kiểu lên overlay
    ui.js              Panel + overlay (shadow DOM), đồng bộ theo thời gian video, cửa sổ nổi
    romanize.js        Phiên âm Latin cho lời Hàn / Nhật (kana) / Trung
    ui-editor.js       ✏️ Sửa lời / tự nhập lời
    ui-tap.js          ⏱ Gõ nhịp
    ui-tabs.js         Tab "Bản Karaoke" và "Đã xem" (lịch sử, ★ yêu thích)
    history.js         Lưu lịch sử bài đã xem và bài yêu thích
    export.js          Xuất .lrc / .srt, chuyển lời sang trang gửi LRCLIB
    ocr.js             🔠 Đọc chữ trên video: quét khung hình, gom các dòng chữ thành lời có thời gian
    keys.js            Phím tắt Alt + phím
    score.js           🎙 Chấm điểm: nốt nhạc của video (chroma), điểm từng dòng
    main.js            Theo dõi chuyển trang trong YouTube, chạy các nguồn, chọn kết quả tốt nhất
  i18n.js              Chữ giao diện tiếng Việt / tiếng Anh (từ điển L('…'))
  options/             Trang cài đặt (cũng là popup)
  ocr/                 Trang chạy nền (offscreen) chạy Tesseract cho 🔠
  score/               Cửa sổ 🎙 chấm điểm: nghe micro, tìm cao độ (YIN)
  publish/             Trang gửi lời lên LRCLIB, pow.js giải bài toán chống spam (SHA-256) trong worker
_locales/              Mô tả extension theo ngôn ngữ (vi, en)
scripts/               build.mjs (đóng gói + kiểm tra file), smoke.mjs (test headless)
tests/                 Test tách tên bài, thời gian từng chữ, xuất file, bài toán LRCLIB
vendor/tesseract/       tesseract.js 5.1.1 + lõi WebAssembly + bộ chữ tiếng Việt (Apache 2.0), không tải từ CDN
data/pinyin.json       Cách đọc pinyin của 21 nghìn chữ Hán (Unicode Unihan, giấy phép Unicode v3)
fonts/                 Roboto Condensed (Apache 2.0, có bộ chữ tiếng Việt) cho kiểu Karaoke
```

- **Tên bài và ca sĩ**: ưu tiên thẻ "Nhạc" của YouTube dưới mô tả. Nếu không có thì tách từ tiêu đề:
  - Bỏ `[Official MV]`, `Karaoke`, `Tone Nam`, `MV OST`, `Lời bài hát:`, `(prod. by …)`, `(Remix)`, `(Album … - Track …)`… Khi phần trước dấu `|` đã có dạng "Bài - Ca sĩ" thì bỏ hết phần sau (`| KC: Mùng 1 Tết`).
  - Tên trong dấu nháy là tên bài (`MONO - 'Waiting For You'`).
  - Bên nào là ca sĩ: dựa vào tên kênh nếu tên kênh chỉ rõ, rồi tới họ người Việt (Bùi Công Nam, Phan Mạnh Quỳnh…), cuối cùng theo thói quen (tiêu đề tiếng Việt "Bài - Ca sĩ", tiếng Anh "Ca sĩ - Bài").
  - Tiêu đề viết hoa toàn bộ được đổi về dạng thường (BÁU VẬT TRỜI CHO → Báu Vật Trời Cho). Tên một chữ như HIEUTHUHAI, M-TP thì giữ nguyên.
  - Các trường hợp mẫu nằm trong `tests/parse-song.test.mjs`.
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
- Tô theo từng chữ chỉ có khi phụ đề là phụ đề tự động (ghi giờ từng chữ) hoặc lời là LRC mở rộng; phụ đề do kênh tải lên chỉ ghi giờ từng dòng.
- Tiêu đề tiếng Anh dạng "Bài - Ca sĩ" đăng ở kênh không mang tên ca sĩ sẽ bị đọc ngược (bài ↔ ca sĩ). Việc tìm lời gần như không bị ảnh hưởng vì các nguồn tìm theo cả hai.
- Chạy trên video thường và Shorts của `www.youtube.com` (YouTube Music đã có lời riêng).

## Đưa lên Chrome Web Store, Edge, Firefox

- **Chrome Web Store**: `npm run build:store` → `dist/better-youtube-lyric-<version>-store.zip` (đã bỏ trường `key`, Store tự cấp ID). Nội dung giới thiệu tiếng Việt / tiếng Anh, lý do xin từng quyền và câu trả lời mục "Dữ liệu người dùng" nằm trong [`store/listing.md`](store/listing.md). Ảnh chụp 1280×800 và ảnh 440×280 ở `store/`, tạo lại bằng `node scripts/store-assets.mjs`. Chính sách quyền riêng tư: [`PRIVACY.md`](PRIVACY.md) (dùng link GitHub của file này).
- **Microsoft Edge**: Edge chạy được đúng bản Chrome (Load unpacked ở `edge://extensions`, hoặc nộp cùng file `-store.zip` lên Edge Add-ons).
- **Firefox** (128 trở lên): `npm run build:firefox` → `dist/better-youtube-lyric-<version>-firefox.zip`. Bản này chạy nền bằng event page thay cho service worker và có ID `better-youtube-lyric@gmttuts`; đã qua `web-ext lint` (0 lỗi, 0 cảnh báo) nhưng **chưa chạy thử trên Firefox thật**. Firefox chưa có cửa sổ nổi (Document Picture-in-Picture), nút ⧉ sẽ báo không hỗ trợ. Thử tạm: `about:debugging` → *This Firefox* → *Load Temporary Add-on* → chọn `manifest.json` trong `dist/better-youtube-lyric-firefox`.
