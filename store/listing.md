# Chrome Web Store listing

Ảnh (tạo lại bằng `node scripts/store-assets.mjs`):
- Ảnh chụp 1280×800, tải lên theo ngôn ngữ của trang: `vi/1-hero.png` …
  `vi/5-studio.png` (tiếng Việt), `en/1-hero.png` … `en/4-sound.png` (English).
  Nguồn: `mockups.html` dựng quanh ảnh chụp thật trên YouTube ở `shots/`
  (panel, các kiểu chữ ở chế độ rạp); `5-studio` từ `assets.html`.
- Ô quảng cáo nhỏ 440×280 (bắt buộc): `promo-440x280.png`.
- Ảnh marquee 1400×560 (tuỳ chọn): `vi/marquee-1400x560.png`, `en/marquee-1400x560.png`.
- Icon 128×128: `../icons/icon128.png`.

Ảnh chụp thật có khung hình và lời của video Rick Astley trên YouTube. Nếu
bị nhắc về bản quyền, chụp lại `shots/` bằng một video có quyền dùng hoặc
quay lại bộ ảnh vẽ trong `assets.html`.

Bản nộp: `npm run build:store` → `dist/better-youtube-lyric-<version>-store.zip`
(đã bỏ trường `key`).

---

## Tên · Name
Better Karaoke

(Không mở đầu bằng "YouTube" để không bị hiểu là sản phẩm của YouTube; tên cũ "Better YouTube Lyric" dễ bị từ chối vì nhãn hiệu.)

## Mô tả ngắn (≤ 132 ký tự)
**vi:** Tìm lời bài hát ngay trên YouTube, hát karaoke trên video, song ngữ, phiên âm, xuất LRC/SRT/ASS.
**en:** Lyrics right on YouTube: karaoke on the video, translations, romanization, LRC/SRT/ASS export.

## Mô tả chi tiết · Description

**vi:**

Mở một video nhạc trên YouTube là có lời bài hát ở cột bên phải, dòng đang hát được tô sáng và tự cuộn.

• Tự tìm lời ở nhiều nơi: mô tả video, comment, các bản đăng lại cùng bài, thư viện mở LRCLIB, Hợp âm chuẩn, Genius, phụ đề YouTube.
• 🎤 Karaoke trên video: chữ đổi màu theo nhịp hát, cả khi toàn màn hình và trên YouTube Shorts. Tô theo từng chữ khi có thời gian từng chữ.
• 🎨 9 kiểu chữ có sẵn, 6 kiểu nền, chỉnh màu, viền, phông, lề… lưu thành preset, ghim 📌 kiểu riêng cho từng kênh.
• 🎯 Tự canh lời theo phụ đề của video, ⏱ gõ nhịp bằng phím Space, 📍 ghim dòng đang hát để sửa lệch từng đoạn.
• 🎚 Đổi tông (nâng / hạ nửa cung, không đổi tốc độ) và 🎤 Lọc giọng ca sĩ để hát trên bài gốc, chạy ngay trên máy.
• ⬇ Xuất file LRC / SRT / ASS (phụ đề karaoke đúng kiểu chữ, ghép cứng được vào video của bạn) với đúng thời gian bạn đã canh; ☁ chia sẻ lên LRCLIB (chỉ khi bạn xác nhận).
• 🌐 Song ngữ: hiện lời dịch dưới mỗi dòng. 🔤 Phiên âm Latin cho lời Hàn, Nhật, Trung.
• 🎙 Chấm điểm karaoke: hát vào micro, mỗi dòng có điểm (đủ lời, đúng nốt).
• ⧉ Cửa sổ lời nổi luôn nằm trên cùng, kể cả khi chuyển tab.
• ✏️ Sửa hoặc tự nhập lời, 🔍 tìm lại theo tên bài, ★ bài yêu thích, lịch sử bài đã xem, phím tắt Alt + phím.
• Giao diện 12 ngôn ngữ (Việt, Anh, Trung, Nhật, Hàn, Thái, Indonesia, Tây Ban Nha, Bồ Đào Nha, Pháp, Đức, Nga), đổi ngay trên panel.

Không quảng cáo, không thu thập dữ liệu. Mã nguồn mở: https://github.com/gmttuts/better-youtube-lyric

**en:**

Open a music video on YouTube and the lyrics appear in the right column, with the line being sung highlighted and scrolling along.

• Finds lyrics in many places: the video description, comments, other uploads of the song, the open LRCLIB library, Hợp âm chuẩn, Genius, YouTube captions.
• 🎤 Karaoke on the video: words change colour as they are sung, in full screen and on YouTube Shorts too. Word-by-word when the timing allows.
• 🎨 9 built-in styles, 6 background shapes, colours, outline, font, padding… saved as presets, or pinned 📌 per channel.
• 🎯 Sync the lyrics to the video's captions, ⏱ tap along with Space, 📍 pin the line being sung to fix one part of the song.
• 🎚 Change the key (semitones up / down, same speed) and 🎤 cut the singer's voice to sing over the original, all on your device.
• ⬇ Export LRC / SRT / ASS files (styled karaoke subtitles you can burn into your own video) with your timing; ☁ share them on LRCLIB (only after you confirm).
• 🌐 Show a translation under each line. 🔤 Latin spelling for Korean, Japanese and Chinese lyrics.
• 🎙 Karaoke scoring: sing into your microphone and get a mark for every line (in time, in tune).
• ⧉ A floating, always-on-top lyrics window that keeps going when you switch tabs.
• ✏️ Edit or type lyrics, 🔍 search again by name, ★ favourites, watch history, Alt + key shortcuts.
• Interface in 12 languages (Vietnamese, English, Chinese, Japanese, Korean, Thai, Indonesian, Spanish, Portuguese, French, German, Russian), switchable from the panel.

No ads, no data collection. Open source: https://github.com/gmttuts/better-youtube-lyric

## Danh mục · Category
Entertainment (Giải trí)

## Mục đích duy nhất · Single purpose
Show song lyrics for the YouTube video being watched, in a side panel and as karaoke on the video, and let the user correct their timing.

## Lý do xin quyền · Permission justifications
- **storage**: saves settings, styles, the lyrics the user picked or edited and their timing per video, cached search results, history and favourites.
- **unlimitedStorage**: edited lyrics and timing for many videos can go past the 10 MB default; nothing is stored outside the browser.
- **Host `https://www.youtube.com/*` (content scripts)**: the panel and the karaoke overlay are drawn on YouTube watch and Shorts pages, and read the video's description, comments and captions there.
- **Host `https://lrclib.net/*`**: searches the open LRCLIB lyrics library by song title and artist, and (only when the user confirms on the publish page) sends lyrics the user timed.
- **Host `https://hopamchuan.com/*`**: searches Vietnamese lyrics by song title and artist. Can be turned off in the settings.
- **Host `https://genius.com/*`**: searches song lyrics (Vietnamese and international) by song title and artist. Can be turned off in the settings.
- **Content script on `https://www.youtube.com/*` loads `src/audio/pitch-worklet.js`** (web accessible resource): the 🎚 key change runs as an AudioWorklet on the video's own sound, on the device.
- **offscreen**: runs the on-device text recognition (Tesseract, WebAssembly) for "🔠 Read text in the video" in an offscreen document; nothing is sent anywhere.
- **Remote code**: none. All code ships in the package; data/pinyin.json is a static reading table.

## Remote code · Mã từ xa
No, I am not using remote code.

## Dữ liệu người dùng · Data usage (form)
Tick only **Website content**, then tick all three certifications.
- Collects: **Website content** only in the sense that song titles taken from the YouTube page are sent to lrclib.net / hopamchuan.com / genius.com to search for lyrics. No personally identifiable information, health, financial, authentication, personal communications, location, web history or user activity is collected.
- Not sold to third parties; not used for purposes unrelated to the single purpose; not used for credit-worthiness or lending.

## Chính sách quyền riêng tư · Privacy policy URL
https://github.com/gmttuts/better-youtube-lyric/blob/main/PRIVACY.md

## Ghi chú cho người duyệt · Notes for the reviewer (tuỳ chọn)
Open any music video on youtube.com (e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ): the lyrics panel appears at the top of the right column; click "🎤 Karaoke" to show them on the video. Microphone access is asked only when the user presses 🎙 (karaoke scoring) and the audio never leaves the device.

## Trước khi bấm gửi · Before you submit
1. Push repo lên GitHub để link chính sách quyền riêng tư ở trên mở được.
2. `npm run build:store` → tải file zip trong `dist/` lên.
3. Điền tab Store listing (mô tả, danh mục, ảnh), tab Privacy (mục đích duy nhất, lý do từng quyền, remote code, dữ liệu, link chính sách), tab Distribution (miễn phí, mọi quốc gia).
4. Khai báo non-trader trong tài khoản (miễn phí, không kinh doanh).
