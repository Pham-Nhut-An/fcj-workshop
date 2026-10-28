# Hướng dẫn đưa web báo cáo lên GitHub Pages

1. Tạo repo mới (Public) trên GitHub, ví dụ tên `fcj-workshop`. KHÔNG tick "Add a README".
2. Mở terminal trong thư mục này rồi chạy:
   ```bash
   git remote add origin https://github.com/<username>/fcj-workshop.git
   git push -u origin main
   ```
3. Vào repo > Actions: đợi workflow "Deploy Hugo site to GitHub Pages" chạy xong (dấu tick xanh).
4. Vào Settings > Pages > Source: "Deploy from a branch" > Branch: `gh-pages` / `(root)` > Save.
5. Sau 1-2 phút web sẽ có ở: https://<username>.github.io/fcj-workshop/

Chạy thử trên máy (cần cài Hugo extended): `hugo server` rồi mở http://localhost:1313

Cập nhật nội dung: sửa file trong `content/` (file `_index.md` = tiếng Anh, `_index.vi.md` = tiếng Việt), rồi:
```bash
git add .
git commit -m "Update worklog week 7"
git push
```
Ảnh đại diện: thay file `static/images/avatar.png` bằng ảnh của bạn (giữ nguyên tên file).
