# Chrome Web Store listing

Ảnh: `screenshot-1.png`, `screenshot-2.png`, `screenshot-3.png` (1280×800) và
`promo-440x280.png`, tạo lại bằng `node scripts/store-assets.mjs` (nguồn:
`assets.html`, ảnh panel `p-*.png` chụp từ extension với lời tự viết, nền
video là hình vẽ, không dùng nội dung có bản quyền).

Bản nộp: `npm run build:store` → `dist/better-youtube-lyric-<version>-store.zip`
(đã bỏ trường `key`).

---

## Tên · Name
Better YouTube Lyric

## Mô tả ngắn (≤ 132 ký tự)
**vi:** Tìm lời bài hát ngay trên YouTube, hát karaoke trên video, song ngữ, phiên âm, xuất LRC/SRT/ASS.
**en:** Lyrics right on YouTube: karaoke on the video, translations, romanization, LRC/SRT/ASS export.

## Mô tả chi tiết · Description

**vi:**

Mở một video nhạc trên YouTube là có lời bài hát ở cột bên phải, dòng đang hát được tô sáng và tự cuộn.

• Tự tìm lời ở nhiều nơi: mô tả video, comment, các bản đăng lại cùng bài, thư viện mở LRCLIB, Hợp âm chuẩn, phụ đề YouTube.
• 🎤 Karaoke trên video: chữ đổi màu theo nhịp hát, cả khi toàn màn hình và trên YouTube Shorts. Tô theo từng chữ khi có thời gian từng chữ.
• 🎨 7 kiểu chữ có sẵn, 5 kiểu nền, chỉnh màu, viền, phông, lề… lưu thành preset, ghim 📌 kiểu riêng cho từng kênh.
• 🎯 Tự canh lời theo phụ đề của video, ⏱ gõ nhịp bằng phím Space, 📍 ghim dòng đang hát để sửa lệch từng đoạn.
• ⬇ Xuất file LRC / SRT / ASS (phụ đề karaoke đúng kiểu chữ, ghép cứng được vào video của bạn) với đúng thời gian bạn đã canh; ☁ chia sẻ lên LRCLIB (chỉ khi bạn xác nhận).
• 🌐 Song ngữ: hiện lời dịch dưới mỗi dòng. 🔤 Phiên âm Latin cho lời Hàn, Nhật, Trung.
• 🎙 Chấm điểm karaoke: hát vào micro, mỗi dòng có điểm (đủ lời, đúng nốt).
• ⧉ Cửa sổ lời nổi luôn nằm trên cùng, kể cả khi chuyển tab.
• ✏️ Sửa hoặc tự nhập lời, 🔍 tìm lại theo tên bài, ★ bài yêu thích, lịch sử bài đã xem, phím tắt Alt + phím.
• Giao diện 12 ngôn ngữ (Việt, Anh, Trung, Nhật, Hàn, Thái, Indonesia, Tây Ban Nha, Bồ Đào Nha, Pháp, Đức, Nga), đổi ngay trên panel.

Không quảng cáo, không thu thập dữ liệu. Mã nguồn mở: https://github.com/gmttuts/better-youtube-lyric

**en:**

Open a music video on YouTube and the lyrics appear in the right column, with the line being sung highlighted and scrolling along.

• Finds lyrics in many places: the video description, comments, other uploads of the song, the open LRCLIB library, Hợp âm chuẩn, YouTube captions.
• 🎤 Karaoke on the video: words change colour as they are sung, in full screen and on YouTube Shorts too. Word-by-word when the timing allows.
• 🎨 7 built-in styles, 5 background shapes, colours, outline, font, padding… saved as presets, or pinned 📌 per channel.
• 🎯 Sync the lyrics to the video's captions, ⏱ tap along with Space, 📍 pin the line being sung to fix one part of the song.
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
- **offscreen**: runs the on-device text recognition (Tesseract, WebAssembly) for "🔠 Read text in the video" in an offscreen document; nothing is sent anywhere.
- **Remote code**: none. All code ships in the package; data/pinyin.json is a static reading table.

## Dữ liệu người dùng · Data usage (form)
- Collects: **Website content** only in the sense that song titles taken from the YouTube page are sent to lrclib.net / hopamchuan.com to search for lyrics. No personally identifiable information, health, financial, authentication, personal communications, location, web history or user activity is collected.
- Not sold to third parties; not used for purposes unrelated to the single purpose; not used for credit-worthiness or lending.

## Chính sách quyền riêng tư · Privacy policy URL
https://github.com/gmttuts/better-youtube-lyric/blob/main/PRIVACY.md
