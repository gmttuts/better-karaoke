// Unit tests for BYL.parseSong (title/artist from a video title and channel).
//   node tests/parse-song.test.mjs
import { readFileSync } from 'fs';
import vm from 'vm';

const ctx = { globalThis: {}, console };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../src/content/util.js', import.meta.url), 'utf8'), ctx);
const { BYL } = ctx;

const cases = [
  ['MV OST BÁU VẬT TRỜI CHO - BÙI CÔNG NAM | | KC: MÙNG 1 TẾT', 'CGV Cinemas Vietnam', 'Báu Vật Trời Cho', 'Bùi Công Nam'],
  ['SƠN TÙNG M-TP | CHÚNG TA CỦA TƯƠNG LAI | OFFICIAL MUSIC VIDEO', 'Sơn Tùng M-TP Official', 'Chúng Ta Của Tương Lai', 'Sơn Tùng M-TP'],
  ['HIEUTHUHAI - Không Thể Say (prod. by Kewtiie) | Official Music Video', 'HIEUTHUHAI', 'Không Thể Say', 'HIEUTHUHAI'],
  ['Đen - Trốn Tìm ft. MTV band (M/V)', 'Đen Vâu Official', 'Trốn Tìm', 'Đen'],
  ['Mất Kết Nối | Dương Domic | Official MV', 'Dương Domic', 'Mất Kết Nối', 'Dương Domic'],
  ['Em Của Ngày Hôm Qua (Official Music Video) - Sơn Tùng M-TP', 'Sơn Tùng M-TP Official', 'Em Của Ngày Hôm Qua', 'Sơn Tùng M-TP'],
  ['APJ - 1000 Days (Official MV)', 'APJ', '1000 Days', 'APJ'],
  ["MONO - 'Waiting For You' (Album 22 - Track No.10)", 'MONO', 'Waiting For You', 'MONO'],
  ['Hoàng Dũng - Nàng Thơ (Remix) | Lyrics Video', 'Nhạc Hay Mỗi Ngày', 'Nàng Thơ', 'Hoàng Dũng'],
  ['[Karaoke] Nơi Này Có Anh - Sơn Tùng M-TP (Beat Gốc)', 'Karaoke Việt', 'Nơi Này Có Anh', 'Sơn Tùng M-TP'],
  ['Tăng Duy Tân - Bên Trên Tầng Lầu | OFFICIAL MUSIC VIDEO', 'Tăng Duy Tân', 'Bên Trên Tầng Lầu', 'Tăng Duy Tân'],
  ['NGÀY MAI NGƯỜI TA LẤY CHỒNG | THÀNH ĐẠT | LYRICS VIDEO', 'Thành Đạt Official', 'Ngày Mai Người Ta Lấy Chồng', 'Thành Đạt'],
  ['Lời bài hát: Có Chàng Trai Viết Lên Cây - Phan Mạnh Quỳnh', 'Lyrics Việt', 'Có Chàng Trai Viết Lên Cây', 'Phan Mạnh Quỳnh'],
  ['Phan Mạnh Quỳnh | Có Chàng Trai Viết Lên Cây (Mắt Biếc OST) | Official MV', 'Phan Mạnh Quỳnh', 'Có Chàng Trai Viết Lên Cây', 'Phan Mạnh Quỳnh'],
  // Not covered: "Song - Artist" in English on a channel that names neither
  // side reads as "Artist - Song" (the usual order for English titles).
  ['Shape of You - Ed Sheeran (Lyrics) | Vietsub', 'Ed Sheeran', 'Shape of You', 'Ed Sheeran'],
  ['Ed Sheeran - Shape of You (Official Music Video)', 'Ed Sheeran', 'Shape of You', 'Ed Sheeran'],
  ['tlinh - nếu lúc đó (ft. 2pillz) | OFFICIAL MUSIC VIDEO', 'tlinh', 'nếu lúc đó', 'tlinh'],
  ['Vũ. - Lạ Lùng (Official MV)', 'Vũ.', 'Lạ Lùng', 'Vũ.'],
];

let bad = 0;
for (const [title, author, wantTitle, wantArtist] of cases) {
  const got = BYL.parseSong({ title, author, attrs: [] });
  const ok = got.title === wantTitle && got.artist === wantArtist;
  if (!ok) bad++;
  console.log(`${ok ? '✓' : '✗'} ${title}\n    → "${got.title}" / "${got.artist}"${ok ? '' : `   (cần "${wantTitle}" / "${wantArtist}")`}`);
}
console.log(bad ? `\n${bad}/${cases.length} sai` : `\n${cases.length}/${cases.length} đúng`);
process.exit(bad ? 1 : 0);
