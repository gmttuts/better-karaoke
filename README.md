# Better Karaoke

Extension Chrome giúp hát karaoke ngay trên YouTube: tự tìm lời bài hát cho video đang xem, chạy lời theo nhạc, hiện chữ to trên video, và tìm nhanh bản karaoke của bài, tất cả trong cùng một khung hình.

## Có gì mới ở 0.29

Bản 0.29 thiết kế lại panel để **dễ dùng hơn và bớt rối mắt**, mọi tính năng vẫn giữ nguyên.

- **Lời bài hát là trung tâm.** Bỏ hơn chục hàng nút xếp chồng phía trên lời; phần lời chiếm phần lớn panel.
- **Ít thứ phải nhìn cùng lúc.** Tốc độ, Lọc giọng, Tông, Lệch, Song ngữ và Kiểu chữ chỉ mở thành bảng nhỏ khi bấm, xong là đóng.
- **Mỗi thứ một chỗ cố định.** Thanh tiêu đề để chuyển màn hình (Karaoke, ⋯), khu Nguồn để chọn lời, thanh đáy để hát (Hát cùng, lời trên video, Kiểu chữ, Chỉnh lời).
- **Bỏ chế độ thẻ.** Không còn 3 thẻ Hát / Chỉnh lời / Karaoke phải nhớ; mở màn hình nào thì có nút ← để quay lại.
- **Tách hai việc hay bị nhầm.** Nút *lời trên video* chỉ bật / tắt lời; công tắc *Hát cùng* chỉ hiện / ẩn công cụ hát.
- **Gộp thao tác trùng.** Chọn bản lời và đánh dấu bản tiêu biểu nằm chung một danh sách; menu ⋯ chỉ còn 5 mục.
- **Gọn và đồng bộ với YouTube.** Màu nền, màu viền theo YouTube (sáng / tối), chữ Google Sans Flex, icon thay emoji; màu hồng chỉ dùng cho thứ đang bật.

## Tính năng

- **Panel lời bài hát** ở cột bên phải video, gồm 3 phần: thanh tiêu đề, phần lời (cùng các nguồn lời) và thanh công cụ ở đáy. Lời được tô sáng dòng đang hát và tự cuộn; bấm vào một dòng để tua tới đó (với lời có thời gian).
  - **Thanh tiêu đề**: tên bài và ca sĩ, nút **Karaoke** (mở danh sách bản karaoke của bài), menu **⋯** và nút thu gọn / mở. Ở màn hình Chỉnh lời, Karaoke hay Đã xem, nút **←** đưa về màn hình lời.
  - **Thu gọn**: chỉ còn tên bài, nút lời trên video, ⋯ và nút mở ra; lời trên video vẫn bật / tắt được ngay từ đó.
  - **Nguồn** (trên lời; khi panel rộng từ 560px thì thành một cột bên phải lời): mỗi nguồn là một chip, chip đang phát có dấu ✓. Bên phải tiêu đề "Nguồn" có nút **Tìm lại** (icon làm mới) và nút **Lệch** (icon điều chỉnh): mở bảng chỉnh độ lệch cả bài, các mốc 📍 và 🎯 canh theo phụ đề; nút có chấm hồng khi thời gian đã được chỉnh. Nguồn có nhiều bản mở danh sách để chọn; mỗi bản có **ngôi sao**: bấm để chọn làm bản tiêu biểu, lần sau mở video này sẽ phát bản đó. Chip **Song ngữ** ở cuối mở bảng chọn lời thứ 2 và **Dịch sang**.
  - **Thanh công cụ ở đáy**: công tắc **Hát cùng** hiện / ẩn các công cụ hát: **Tốc độ**, **Lọc giọng**, **Tông** (mỗi nút mở một bảng nhỏ) và nút **Hát** (bật mic chấm điểm). Bên phải là nút **lời trên video** (Alt L), nút **Kiểu chữ** (bảng mẫu kiểu chữ và 🎨 tuỳ chỉnh) và nút **Chỉnh lời** (bút chì).
  - **Cửa sổ nổi**: rê chuột vào phần lời, nút ở góc trên bên phải mở lời trong cửa sổ nổi (Alt P).
  - **Menu ⋯**: Tìm theo tên, Đã xem, Thêm vào bài yêu thích, Tự bật Karaoke khi mở video, Ngôn ngữ giao diện.
  - Giao diện theo màu nền và màu viền của YouTube (sáng / tối), chữ Google Sans Flex, icon thay cho emoji; màu hồng #FF2E63 chỉ dùng cho thứ đang bật hoặc đang phát. Lần đầu dùng, một gợi ý nhỏ chỉ vào nút lời trên video cho tới khi bạn bật nó.
- **Karaoke trên video** (nút lời trên video ở thanh công cụ, Alt L): chữ đổi màu mượt theo nhịp hát, dùng được khi toàn màn hình, chữ tự to theo kích thước video. Các kiểu chữ có sẵn trong bảng **Kiểu chữ** (nút bảng màu ở thanh công cụ), mỗi kiểu một ô xem trước:
  - **Karaoke xanh dương** (mặc định) / **Karaoke đỏ**: giống đĩa karaoke Việt, chữ Roboto đậm (đổi sang chữ hẹp karaoke trong 🎨), trắng ánh bạc viền đen; phần đã hát chuyển xanh dương (hoặc đỏ) viền trắng, có bóng đổ, hai dòng so le.
  - **Nổi bật**: một dòng lớn, phần đã hát chuyển màu vàng sang hồng, dòng kế tiếp nhỏ bên dưới.
  - **Khung tối**: khung tối mờ, dễ đọc trên mọi nền video.
  - **Phụ đề YouTube**: mỗi dòng một khung đen mờ như phụ đề của YouTube.
  - **Dải điện ảnh**: một dải tối mờ chạy ngang hết video, chữ xanh nhạt.
  - **Sáng dần**: chữ chưa hát mờ, hát tới đâu sáng trắng tới đó, trên một lớp tối mờ dần (như lời bài hát của Apple Music, Spotify).
  - **Chữ lớn**: một dòng chữ in hoa rất to giữa màn hình, viền đen dày, hát tới đâu vàng tới đó (kiểu video TikTok, Shorts).
  - **Gọn nhẹ**: một dòng nhỏ dạng viên thuốc, ít che video.

  - **🎨 Tuỳ chỉnh** (các thẻ Chữ / Màu / Nền / Bố cục): phông chữ, độ đậm, cỡ chữ, giãn chữ, in hoa, màu chữ / màu đã hát (có chuyển màu), độ rõ chữ chưa hát (kéo về 0 thành chữ rỗng), tô nền bút dạ quang, viền, bóng đổ, phát sáng, nền (khung, viên thuốc, dải ngang, từng dòng, phủ mờ) cùng lề trong khung trên / dưới / trái / phải, bố cục (so le, 1 dòng, 2 dòng, 3 dòng), hiệu ứng (chạy từng chữ hoặc sáng cả dòng), khoảng cách mép. Cạnh các thẻ có nút **Ngẫu nhiên** (icon trộn bài: thử ngay một kiểu mới, luôn dễ đọc) và **Mặc định** (về kiểu đang chọn); bên dưới là ô **Lưu preset**: bấm Ngẫu nhiên đến khi ưng rồi lưu thành **preset** riêng, chọn lại trong "Kiểu chữ". **Nháy đúp một thanh trượt** để đưa thông số đó về mặc định của kiểu đang chọn.

  Cặp nút **lên / xuống** (nút đang sáng là vị trí hiện tại) đặt lời ở trên hoặc dưới video để không che chữ có sẵn trong MV. Chỉnh cỡ chữ bằng A− / A+.

  **📌 Kiểu chữ theo kênh**: bấm 📌 để kênh đang xem nhớ kiểu chữ riêng (ví dụ kênh nhạc Việt dùng Karaoke xanh dương, kênh K-pop dùng Phụ đề YouTube). Khi 📌 đang bật, đổi kiểu hay chỉnh 🎨 chỉ áp dụng cho kênh đó; bấm lại để dùng kiểu chung.

  **Tô theo từng chữ**: khi lời có thời gian từng chữ (LRC mở rộng dạng `<01:02.30>` trước mỗi chữ, hoặc canh theo phụ đề tự động của YouTube vốn ghi giờ từng chữ), mỗi chữ sáng đúng lúc được hát thay vì chạy đều cả dòng. Thông báo sau khi 🎯 canh cho biết bao nhiêu dòng được tô theo từng chữ.
- **🎙 Chấm điểm** (nút **Hát** ở thanh công cụ): mở một cửa sổ nhỏ nghe micro trong lúc bạn hát theo lời trên video. Hết mỗi dòng, video hiện điểm dòng đó và điểm tổng (cửa sổ cũng hiện điểm, nốt bạn đang hát, độ to). Điểm gồm 40% hát đủ dòng và 60% hát đúng nốt: nốt bạn hát được so với các nốt đang vang trong nhạc của video, quãng tám nào cũng được. Cần lời có thời gian (⏱ / 🎯 / LRCLIB). **Đeo tai nghe**, nếu không micro sẽ nghe cả giọng ca sĩ từ loa. Micro chạy trong cửa sổ của extension nên quyền micro cấp cho extension, không cấp cho youtube.com; âm thanh chỉ xử lý trên máy, không ghi lại, không gửi đi.
- **⧉ Cửa sổ nổi** (nút hiện khi rê chuột vào lời, hoặc Alt P): mở lời trong một cửa sổ nhỏ luôn nằm trên cùng (Document Picture-in-Picture), vẫn chạy khi chuyển tab hoặc làm việc khác. Dùng chung kiểu chữ với overlay. Có thanh điều khiển như mini player của YouTube (hiện khi rê chuột, luôn hiện khi đang dừng): bài trước, câu trước, phát/dừng, câu sau, bài sau, thanh tua; phím Space và ←/→ cũng dùng được.
- **YouTube Shorts**: panel nổi cạnh video Shorts (thu gọn được bằng cách bấm tiêu đề), lời karaoke hiện trên video đứng (tự nằm ngay trên tên kênh và tiêu đề, không che), tự tìm lời mới khi lướt sang Short khác. Short thường chỉ là một đoạn giữa bài: phụ đề sẽ tự canh, nếu không có thì bấm 📍 / bấm vào dòng đang hát.
- **Tìm lời theo thứ tự ưu tiên** (chạy song song, kết quả hiện dần):
  1. 📄 **Mô tả video** và 💬 **Comment** của chính video. Comment dạng `0:15 lời…` được chuyển thành lời có thời gian.
  2. 🔁 **Bản đăng khác** của cùng bài trên YouTube (video lyric, bản re-up): đọc mô tả, và với video "Lyrics" thì đọc thêm comment.
  3. 🌐 **LRCLIB** (lời có thời gian từng dòng, có cả nhạc Việt), 🎸 **Hợp âm chuẩn** (lời nhạc Việt, đã bỏ hợp âm) và 🎵 **Genius** (nhiều bài Việt mới cùng nhạc thế giới, có chia đoạn [Verse], [Chorus]).
  4. 📝 **Phụ đề YouTube**: là **lựa chọn thứ 2**. Khi không nguồn nào có bản lời chạy theo nhạc (có thời gian), extension tự tải phụ đề và chọn nó, vì phụ đề đi theo nhịp hát (chỉ chữ có thể sai, sửa trong ✏️ Sửa lời). Video không có phụ đề thì mới chọn bản lời chưa có thời gian. Đã có bản có thời gian thì phụ đề không tự tải, bấm vào chip để tải.
- **Chọn nguồn khác** bằng menu thả xuống (màn hình Chỉnh lời), hoặc bấm vào chip nguồn (bấm tiếp để xem kết quả khác của cùng nguồn; chip lỗi bấm để thử lại). Lựa chọn và độ lệch được nhớ riêng cho từng video.
- **🎯 Tự canh theo phụ đề** (**mặc định tắt và ẩn**, nằm trong bảng "Lệch"; bật ở trang Cài đặt → "🎯 Tự canh lời theo phụ đề". Tắt thì lời không tự khớp theo phụ đề, bạn canh từng đoạn trong ✏️ Sửa lời): dùng phụ đề YouTube của video (kể cả phụ đề tự động) làm nhịp. Extension so khớp chữ trong lời với chữ trong phụ đề theo thứ tự, nên phụ đề sai chính tả vẫn canh được. **Bấm lại được nhiều lần**: đang phát mà lời lệch ở đoạn nào, bấm 🎯 trong lúc hát đoạn đó, extension so vài giây phụ đề vừa qua với các dòng quanh đó và ghim một mốc 📍 ở đấy; đoạn khác lệch thì bấm tiếp ở đoạn khác.
- **⇆ So sánh** (màn hình Chỉnh lời): bản đang phát và một bản khác (vd. phụ đề YouTube và Hợp âm chuẩn) đặt cạnh nhau từng dòng, dòng khác nhau tô màu. Sửa thẳng bên trái, hoặc bấm **⇐** để lấy chữ của bản bên phải mà vẫn giữ thời gian; sau khi đổi, nút thành **↺** để trả lại chữ cũ; **⇐ Lấy hết bên phải** / **↺ Trả lại hết** cho cả bài. Hai bản được ghép dòng theo cả bài, nên bản có lời giới thiệu ở đầu hay thiếu một đoạn vẫn khớp. Với lời có thời gian, mỗi dòng có ô **giờ bắt đầu** và **giờ kết thúc** sửa được (gõ tay, hoặc bấm vào dòng rồi bấm ⏵ Đặt giờ bắt đầu / ⏹ Đặt giờ kết thúc trên đầu khung, cạnh ô "Giờ đang phát"). Nhạc đang phát thì dòng đang hát được đánh dấu ♪ và khung tự cuộn theo (dừng nhạc thì đứng yên). Lưu thành "✍ Lời của bạn". **↺ Về bản gốc** bỏ bản bạn đã sửa và quay về lời tìm được.
  - Lời **không có thời gian** (comment, Hợp âm chuẩn…): tự gán thời gian cho từng dòng. Việc này chạy tự động khi chọn lời đó.
  - Lời **có thời gian** nhưng lệch so với MV (LRCLIB canh theo bản audio): tự so với phụ đề. Lệch đều cả bài thì chỉnh một số; lệch thay đổi giữa các đoạn (intro, nhạc dạo, nhịp khác) thì đặt nhiều điểm canh dọc bài, mỗi đoạn lệch bao nhiêu sửa bấy nhiêu.
  - Phụ đề được chọn theo ngôn ngữ của lời (ưu tiên phụ đề do người đăng tải lên, sau đó mới tới phụ đề tự động). Nếu cần, CC được bật thoáng qua để trình phát tải phụ đề, rồi trả về như cũ.
- **Ghim dòng 📍**: bấm 📍 cạnh dòng đang hát. Mốc đầu tiên dời cả bài; mốc tiếp theo chỉ làm co giãn phần giữa hai mốc, phần đã đúng giữ nguyên. Thường 2–3 mốc là đúng cả bài. Các mốc được nhớ cho từng video.
- **Lệch** (nút cạnh "Nguồn"): −0.5s / −0.1s / +0.1s / +0.5s dời cả bài (Alt [ ], thêm Shift: 0.1s). Bảng này cũng liệt kê các mốc 📍 (bỏ từng mốc được) và nút bỏ chỉnh lệch cùng mọi mốc.
- **Video không có phụ đề** và lời không có thời gian: bấm vào dòng đang hát, lời sẽ tự cuộn theo nhịp ước lượng.
- **Karaoke** (nút trên thanh tiêu đề): danh sách bản karaoke ngay trong panel, có nút nhanh *Tone nam / Tone nữ / Song ca / Beat* (bài Việt) hoặc *lower key / duet / instrumental* (bài quốc tế). Bấm là chuyển video, lời tự tìm lại.
- **🔠 Đọc chữ trên video** (trong ✏️ Sửa lời, hoặc nút ngay dưới "Chưa tìm thấy lời"): cho video không có lời ở đâu, không có phụ đề, nhưng có chữ lời bài hát trên hình (video lyric, karaoke, MV có chữ). Extension tua video ×2, tắt tiếng, đọc chữ trên các khung hình bằng Tesseract (chạy ngay trên máy, có sẵn bộ chữ tiếng Việt, đọc được cả tiếng Anh). Video có tên tiếng Nhật, Hàn, Trung hoặc Thái thì dùng bộ chữ của ngôn ngữ đó: lần đầu tải khoảng 1–2 MB từ jsDelivr (dữ liệu tessdata của Tesseract), sau đó giữ lại trên máy. Chữ karaoke kiểu này (màu, viền dày, furigana nhỏ phía trên) được phóng lớn và chuyển đen trắng trước khi đọc; dòng furigana bị bỏ. Video chữ La-tinh (tiếng Việt, tiếng Anh, lời phiên âm…) thì mấy khung hình có chữ đầu tiên được đọc theo cả hai cách, cách đọc ra nhiều chữ hơn dùng cho phần còn lại, rồi điền vào ô sửa lời kèm thời gian: lúc dòng chữ hiện ra, hoặc với video lời cuộn thành danh sách thì lúc dòng đó lên tới giữa. Mất khoảng nửa thời lượng bài; bấm ⏹ để dừng sớm và lấy phần đã đọc. Chữ đọc sai thì sửa ngay trong ô rồi bấm 💾 Lưu lời. Tên bài, ca sĩ, logo kênh và chữ nằm yên suốt video được bỏ đi.
- **✏️ Sửa lời / ✍ Tự nhập lời**: sửa lời đang hiện, hoặc tự gõ / dán / dịch lời khi không tìm được. Bản của bạn được nhớ riêng cho từng video và hiện trước ở lần mở sau (nguồn "✍ Lời của bạn"). Giữ `[phút:giây]` ở đầu dòng để giữ thời gian. Nút **📝 Lấy khung từ phụ đề** (chỉ hiện khi bật "🎯 Tự canh lời theo phụ đề" trong Cài đặt) điền sẵn phụ đề YouTube kèm thời gian. Thường không cần: chọn bản "📝 Phụ đề YouTube" rồi ✏️ Sửa lời là được.
  - Khi đang sửa: dòng đang phát được tô hồng và tự cuộn theo nhạc (tắt được bằng "Cuộn theo nhạc"). Nháy đúp một dòng có giờ để tua tới đó.
  - **🔎 Tìm trong lời**: gõ không dấu cũng tìm được, Enter / Shift+Enter để qua lại giữa các kết quả.
  - **Giờ đang phát: 1:20.0** · **⏵ Đặt giờ bắt đầu** · **⏹ Đặt giờ kết thúc** (Ctrl/⌘ + Enter / Ctrl/⌘ + Shift + Enter): hai nút lấy đúng giờ đang phát của YouTube (hiện ở ô bên cạnh). Chúng áp vào **dòng đang phát**; bấm vào một dòng trong ô thì áp vào dòng đó ("↺ Theo dòng đang phát" để quay lại). Dòng sẽ đổi được viền xanh, dưới ô ghi rõ "♪ Dòng đang phát · Dòng 7: … · bắt đầu 0:43.1 · kết thúc 0:45.6". Muốn câu kết thúc sớm hơn: dừng video đúng lúc ca sĩ hát xong câu đó, bấm ⏹. ⏵ ghi giờ rồi xuống dòng kế, vừa nghe vừa bấm để canh cả bài; giờ bắt đầu sớm hơn dòng phía trên bị chặn (thường là chọn nhầm dòng). Lời trên video đổi theo ngay khi bạn sửa (xem thử); 💾 Lưu lời để giữ, Huỷ để trở về bản cũ.
- **🌐 Song ngữ**: chọn một bản lời khác (thường là lời bạn tự dịch) để hiện thành dòng nhỏ dưới mỗi dòng, trên video, trong panel và cửa sổ nổi. Hai bản cùng có thời gian thì ghép theo thời gian, không thì ghép theo thứ tự dòng (giữ số dòng như bản gốc là khớp). Nút ⇅ đổi chỗ lời chính và lời dịch. Lựa chọn được nhớ cho từng video.
- **文A Dịch lời** (chip **Song ngữ** dưới các nguồn → **Dịch sang**: chọn ngôn ngữ rồi bấm Dịch; panel nhớ ngôn ngữ chọn lần trước): dịch bản lời đang phát (bản tìm được, bản bạn gõ nhịp, sửa hay nhập từ file) sang Tiếng Việt, English, 简体中文, 繁體中文, 日本語, 한국어, ไทย, Bahasa Indonesia, Español, Português, Français, Deutsch hoặc Русский. Dịch từng dòng nhưng gửi cả đoạn một lần để có ngữ cảnh, giữ nguyên thời gian của từng dòng. Bản dịch được lưu thành **bản lời thứ 2 của bạn** ("✍ Bản dịch …") cho video đó và hiện dưới từng dòng; nếu bạn đã lưu lời của mình thì lời đó vẫn là lời chính. Bấm ⇅ để đổi chỗ, hoặc chọn bản dịch rồi ✏️ Sửa lời để chỉnh câu chữ. Lời bài hát được gửi tới Google Dịch (translate.googleapis.com) để dịch; không gửi gì khác.
- **🔤 Phiên âm Latin** (trong bảng Song ngữ): lời tiếng Hàn, tiếng Nhật, tiếng Trung hiện thêm cách đọc bằng chữ Latin dưới mỗi dòng, trên video và trong panel. Tiếng Hàn theo chuẩn Romanization của Hàn Quốc (có nối âm, biến âm mũi: 감사합니다 → gamsahamnida); tiếng Nhật đọc kana theo Hepburn (chữ Hán giữ nguyên vì cần từ điển theo từ); tiếng Trung ra pinyin có dấu thanh, mỗi chữ một cách đọc phổ biến nhất (dữ liệu Unihan của Unicode, 50 KB, chỉ tải khi cần).
- **⏱ Gõ nhịp**: phát bài, bấm **Space** đúng lúc bắt đầu hát dòng có viền; mỗi lần bấm ghi thời gian cho một dòng. Câu có nốt ngân dài thì **giữ Space đến khi hết ngân rồi thả**: lúc thả là lúc câu kết thúc, chữ cuối chạy hết đúng lúc đó thay vì kéo tới câu sau. Trong file LRC, thời điểm kết thúc là mốc `<mm:ss.xx>` ở cuối dòng (gõ tay trong ✏️ Sửa lời cũng được); file `.ass` xuất ra cũng theo mốc này. **Backspace** lùi một dòng và tua lại 3 giây; bấm vào một dòng để gõ lại từ đó. Dòng bị bỏ qua được ước lượng theo hai dòng bên cạnh. Kết quả lưu thành "✍ Lời của bạn" có thời gian. Mỗi video giữ được hai bản của bạn, nên gõ nhịp lời gốc không ghi đè lên bản dịch đang hiện.
- **Kéo thanh dưới khung lời** để thu gọn hoặc mở rộng; độ cao được nhớ lại. Nháy đúp thanh để về mặc định.
- **🔍 Tìm theo tên** (menu ⋯): extension đoán sai tên bài hoặc ca sĩ? Gõ lại rồi bấm Tìm, mọi nguồn chạy lại theo tên mới. Tên sửa được nhớ cho video đó (hiện dấu ✎ cạnh tên ca sĩ); bấm "Dùng tên tự đoán" để bỏ.
- **🕘 Đã xem** (trong menu ⋯): các bài đã mở, mới nhất trước, kèm số lần xem. Chọn "Thêm vào bài yêu thích" trong menu ⋯ (hoặc bấm ngôi sao trong danh sách) để đánh dấu **★ yêu thích**; lọc "★ Yêu thích" để xem riêng. "Xoá lịch sử" giữ lại bài yêu thích. Lịch sử nằm trong file sao lưu.
- **Sao chép** lời, **Mở nguồn** để xem trang gốc.
- **🎚 Tông** (nút **Tông** ở thanh công cụ mở bảng hạ / nâng tông, Alt ↑ ↓): nâng / hạ tông bài hát từng nửa cung (tới ±6) mà không đổi tốc độ, để vừa giọng người hát. Tông được nhớ theo từng video; bấm số tông để về tông gốc. Chạy ngay trên máy (phase vocoder chồng 8 lần trong AudioWorklet, `src/audio/pitch-worklet.js`), trễ khoảng 75 ms.
- **⏩ Tốc độ** (nút **Tốc độ** ở thanh công cụ; 0,25× đến 3×, kéo thanh, bấm −/+ từng 0,05 hoặc chọn nhanh 0,5×–2×; bấm số để về 1×): bài chạy chậm hoặc nhanh hơn để tập, lời và karaoke trên video chạy theo. Đổi tốc độ bằng menu của YouTube cũng được. 🎙 Chấm điểm tự tính theo tông mới.
- **🎤 Lọc giọng** (nút **Lọc giọng** ở thanh công cụ, Alt V, luôn tắt khi mở video mới, chỉ bật khi bạn bấm): giảm giọng ca sĩ để tự hát trên bài gốc khi không có bản karaoke, kéo thanh để chỉnh mức lọc. Âm thanh được chia theo từng dải tần, và chỉ phần vừa nằm giữa hai loa (đo trung bình qua khoảng 30 ms để tiếng vang của giọng không che mất), vừa ở dải giọng người, vừa ngân dài như nốt hát (có tính cả rung giọng) mới bị giảm. Trống, bass, nhạc cụ lệch hai bên và tiếng cao vẫn giữ, nên bài không bị "rỗng". Tuỳ bài: thường giảm được phần lớn giọng nhưng vẫn còn vang và bè; bài thu mono hoặc có nhạc cụ ngân dài đặt giữa (piano, pad) thì kém hơn.
  - Cả hai cần một cú bấm trên trang trước (trình duyệt chỉ cho phát âm thanh sau khi người dùng bấm). Âm thanh không bị ghi lại hay gửi đi đâu.
- **⬇ Xuất** (màn hình Chỉnh lời): lưu lời có thời gian ra file **`.lrc`** (cho trình phát nhạc) **`.srt`** (phụ đề cho VLC, CapCut, Premiere, YouTube Studio) hoặc **`.ass`** (phụ đề karaoke giữ đúng kiểu chữ 🎨 đang dùng: phông, màu, viền, khung, bố cục so le hay ở giữa, dòng dịch, chữ đổi màu từng từ). File dùng đúng thời gian bạn đã canh: độ lệch, các mốc 📍, ⏱ gõ nhịp, 🎯 canh theo phụ đề. Lời chưa có thời gian thì canh trước rồi xuất.
- **📥 Nhập file** (màn hình Chỉnh lời, hoặc kéo thả file vào panel): nạp lời có thời gian từ file **`.lrc`**, **`.srt`** / **`.vtt`** hay **`.ass`**, của Better Karaoke hay của công cụ khác, để **chia sẻ lời đã canh với người khác**. Lời nạp vào thành "✍ Lời của bạn" cho video đang xem. File `.ass` xuất từ Better Karaoke còn giữ thời gian từng chữ, video gốc và kiểu chữ: kiểu chữ được thêm vào "Kiểu chữ" thành một preset ★ (chỉ nhận phông có sẵn và mã màu, không nhận gì khác). Nếu file làm cho video khác, panel nhắc chỉnh "Lệch".
  - **Ghép cứng (hard sub) vào video của bạn** bằng file `.ass`: `ffmpeg -i video.mp4 -vf ass="Ca sĩ - Bài.ass" video-co-loi.mp4` (ffmpeg cần có libass), hoặc mở bằng Aegisub, VLC, mpv, CapCut. Kiểu nền *Dải điện ảnh* thành khung quanh chữ, và viền của chữ đã hát giữ màu viền thường (ASS không đổi màu viền theo karaoke).
- **☁ Gửi lên LRCLIB**: chia sẻ lời đã canh lên thư viện mở LRCLIB để người khác (và các ứng dụng nghe nhạc khác) dùng. Mở một trang riêng để kiểm tra tên bài, ca sĩ, album, thời lượng và lời; báo nếu LRCLIB đã có bản cùng thời lượng. Chỉ gửi khi bạn tích ô xác nhận và bấm gửi (LRCLIB yêu cầu máy giải một bài toán nhỏ thay cho tài khoản, mất khoảng 10–30 giây).
- **Phím tắt** (Alt, trên Mac là Option): **Alt L** bật/tắt lời trên video, **Alt P** cửa sổ nổi, **Alt K** ghim 📍 dòng đang hát, **Alt [ / Alt ]** lời sớm/muộn 0,5s (thêm Shift: 0,1s), **Alt − / Alt =** chữ nhỏ/to. Không dùng khi đang gõ trong ô nhập.
- **Mở lại video là có lời ngay**: kết quả tìm được lưu 7 ngày (1 ngày nếu không tìm thấy gì, vì comment và trang lời còn được bổ sung). Bấm nút **Tìm lại** cạnh "Nguồn" để tìm lại từ đầu ở mọi nguồn. Kết quả lưu không nằm trong file sao lưu.
- **💾 Sao lưu / khôi phục** (trong cửa sổ cài đặt của extension): xuất một file `.json` gồm lời bạn đã sửa, điểm 📍, độ lệch, lời đã chọn cho từng video, preset kiểu chữ và cài đặt. Nhập lại ở máy khác hoặc sau khi cài lại; dữ liệu đang có được giữ, video nào có ở cả hai bên thì lấy bản sửa sau cùng.

## Cài đặt (chế độ nhà phát triển)

1. Mở `chrome://extensions`, bật **Developer mode** (góc trên bên phải).
2. Bấm **Load unpacked** và chọn thư mục `better-youtube-lyric`.

`manifest.json` có trường `key` để ID của extension luôn là `hpklleajpolgkiipenbegkgjmeogllno`, dù thư mục nằm ở đâu hay đổi tên. Dữ liệu trong `chrome.storage` gắn với ID này nên không bị mất khi chuyển thư mục.
3. Mở một video nhạc trên YouTube. Panel hiện ở đầu cột bên phải.

**Khi cập nhật:** bấm ↻ trên thẻ extension rồi tải lại các tab YouTube đang mở. Tab mở từ trước vẫn chạy bản cũ; từ 0.11 panel ở tab đó tự báo "Better Karaoke vừa được cập nhật" kèm nút tải lại. Số phiên bản hiện trong popup và khi rê chuột lên tiêu đề panel.

## Phát triển

Cần Node 18+ và Google Chrome (không cần cài gói nào).

```bash
npm run build        # dist/better-youtube-lyric (thư mục để Load unpacked) + file zip
npm test             # build rồi chạy thử headless (tắt tiếng) trên một video YouTube
npm run build:store  # thêm bản zip bỏ trường "key" để nộp Chrome Web Store
```

`build` dừng lại nếu thiếu file mà `manifest.json` cần (icon, script, trang cài đặt, font). `test` chạy các bộ test (tách tên bài, thời gian từng chữ, xuất LRC/SRT/ASS, bài toán của LRCLIB), rồi mở video `6HQWus2DOsI` (đổi bằng `VIDEO=<id>`) và kiểm tra: panel, bảng 🎨, nút lời trên video, tên bài, phím tắt, 📌, xuất SRT, trang gửi LRCLIB (không gửi thật) và lỗi JavaScript. Video có lời LRCLIB như `VIDEO=JGwWNGJdvx8` kiểm tra được cả file SRT và ASS.

**Ngôn ngữ giao diện**: tiếng Việt, English, 简体中文, 日本語, 한국어, ไทย, Bahasa Indonesia, Español, Português, Français, Deutsch, Русский. Đổi ngay trong menu **⋯ → Ngôn ngữ** của panel (mọi tab YouTube đang mở đổi theo, không cần tải lại) hoặc trong cửa sổ cài đặt. Mặc định *Tự động*: tiếng Việt khi máy ở múi giờ GMT+7, còn lại là tiếng Anh. Chuỗi nào bản dịch còn thiếu thì hiện tiếng Anh. Thêm ngôn ngữ: chép `src/lang/en.js` thành `src/lang/<mã>.js`, dịch phần giá trị, thêm mã vào `BYL.LANGS` (`src/i18n.js`), `manifest.json` và các trang trong `src/`; `node tests/i18n.test.mjs` báo chuỗi thiếu.

Bấm biểu tượng extension để **tắt hẳn extension** (công tắc "Bật trên YouTube", áp dụng ngay cho mọi tab), bật/tắt **Tự bật Karaoke khi mở video** (mặc định tắt, cũng có trong menu ⋯ của panel; nút lời trên video, chọn kiểu chữ hay mở 🎨 chỉ bật lời cho video đang xem), bật/tắt từng nguồn, ưu tiên lời có thời gian, số trang comment cần quét. Kiểu chữ chỉnh trong panel (nút Kiểu chữ). Cửa sổ cài đặt dùng cùng giao diện với panel.

## Cách hoạt động

```
src/
  background.js        Service worker: tải lrclib.net, hopamchuan.com, genius.com cho content script (chỉ 3 host này)
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
    ui-tabs.js         Thẻ "🎬 Karaoke" và trang "Đã xem" (lịch sử, ★ yêu thích)
    ui-compare.js      ⇆ So sánh lời hai bản, ↺ Về bản gốc
    history.js         Lưu lịch sử bài đã xem và bài yêu thích
    export.js          Xuất .lrc / .srt / .ass, chuyển lời sang trang gửi LRCLIB
    ocr.js             🔠 Đọc chữ trên video: quét khung hình, gom các dòng chữ thành lời có thời gian
    keys.js            Phím tắt Alt + phím
    audiofx.js         🎚 Đổi tông, 🎤 Lọc giọng (Web Audio trên âm thanh video)
    score.js           🎙 Chấm điểm: nốt nhạc của video (chroma), điểm từng dòng
    main.js            Theo dõi chuyển trang trong YouTube, chạy các nguồn, chọn kết quả tốt nhất
  i18n.js              L('…'), danh sách ngôn ngữ, chọn ngôn ngữ theo múi giờ
  lang/<mã>.js         Bản dịch giao diện (khoá là câu tiếng Việt gốc)
  options/             Trang cài đặt (cũng là popup)
  ocr/                 Trang chạy nền (offscreen) chạy Tesseract cho 🔠
  audio/pitch-worklet.js  Bộ đổi tông (phase vocoder) chạy trong AudioWorklet
  audio/vocal-worklet.js  Bộ lọc giọng theo dải tần (giữa · dải giọng · ngân dài)
  score/               Cửa sổ 🎙 chấm điểm: nghe micro, tìm cao độ (YIN)
  publish/             Trang gửi lời lên LRCLIB, pow.js giải bài toán chống spam (SHA-256) trong worker
_locales/              Mô tả extension theo ngôn ngữ (12 ngôn ngữ)
scripts/               build.mjs (đóng gói + kiểm tra file), smoke.mjs (test headless)
tests/                 Test tách tên bài, thời gian từng chữ, xuất file, bài toán LRCLIB, đổi tông, bản dịch
vendor/tesseract/       tesseract.js 5.1.1 + lõi WebAssembly + bộ chữ tiếng Việt (Apache 2.0); bộ chữ Nhật/Hàn/Trung/Thái tải khi cần từ cdn.jsdelivr.net
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

Better Karaoke lấy ý tưởng overlay và LRCLIB, rồi thêm phần những extension trên chưa có: lời từ comment, từ bản đăng lại trên YouTube, nguồn nhạc Việt, và tìm bản karaoke ngay trong panel.

## Giới hạn

- Hợp âm chuẩn và Genius là đọc HTML trang web. Nếu trang đổi giao diện thì nguồn này có thể hỏng (các nguồn khác vẫn chạy). Tắt được trong cài đặt.
- Genius chặn Chrome chạy ẩn (headless) bằng Cloudflare, nên `npm test` không kiểm tra được nguồn này; trên Chrome thường thì chạy bình thường.
- Lời trong comment phụ thuộc thứ tự "comment hàng đầu" của YouTube, mỗi lần tải có thể khác nhau. Tăng "Số trang comment quét" nếu hay bị sót.
- Lời từ LRCLIB được canh theo bản audio. Với MV có đoạn mở đầu dài, cần chỉnh "Lệch".
- Tô theo từng chữ chỉ có khi phụ đề là phụ đề tự động (ghi giờ từng chữ) hoặc lời là LRC mở rộng; phụ đề do kênh tải lên chỉ ghi giờ từng dòng.
- Tiêu đề tiếng Anh dạng "Bài - Ca sĩ" đăng ở kênh không mang tên ca sĩ sẽ bị đọc ngược (bài ↔ ca sĩ). Việc tìm lời gần như không bị ảnh hưởng vì các nguồn tìm theo cả hai.
- Chạy trên video thường và Shorts của `www.youtube.com` (YouTube Music đã có lời riêng).

## Đưa lên Chrome Web Store, Edge, Firefox

- **Chrome Web Store**: `npm run build:store` → `dist/better-youtube-lyric-<version>-store.zip` (đã bỏ trường `key`, Store tự cấp ID). Nội dung giới thiệu tiếng Việt / tiếng Anh, lý do xin từng quyền và câu trả lời mục "Dữ liệu người dùng" nằm trong [`store/listing.md`](store/listing.md). Ảnh chụp 1280×800 và ảnh 440×280 ở `store/`, tạo lại bằng `node scripts/store-assets.mjs`. Chính sách quyền riêng tư: [`PRIVACY.md`](PRIVACY.md) (dùng link GitHub của file này).
- **Microsoft Edge**: Edge chạy được đúng bản Chrome (Load unpacked ở `edge://extensions`, hoặc nộp cùng file `-store.zip` lên Edge Add-ons).
- **Firefox** (128 trở lên): `npm run build:firefox` → `dist/better-youtube-lyric-<version>-firefox.zip`. Bản này chạy nền bằng event page thay cho service worker và có ID `better-youtube-lyric@gmttuts`; đã qua `web-ext lint` (0 lỗi, 0 cảnh báo) nhưng **chưa chạy thử trên Firefox thật**. Firefox chưa có cửa sổ nổi (Document Picture-in-Picture), nút ⧉ sẽ báo không hỗ trợ. Thử tạm: `about:debugging` → *This Firefox* → *Load Temporary Add-on* → chọn `manifest.json` trong `dist/better-youtube-lyric-firefox`.

## Ủng hộ · Support

Better Karaoke miễn phí, không quảng cáo. Nếu thấy hữu ích, bạn có thể ủng hộ người làm tại ☕ https://buymeacoffee.com/gmttuts

Better Karaoke is free and ad-free. If it is useful to you, you can support the developer at ☕ https://buymeacoffee.com/gmttuts
