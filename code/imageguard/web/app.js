// ImageGuard frontend - JavaScript thuan, khong framework.
// Dang nhap: Cognito Managed Login, OAuth 2.0 Authorization Code + PKCE (danh cho SPA, khong can client secret).
(() => {
  const cfg = window.IMAGEGUARD_CONFIG;
  const MAX_BYTES = 5 * 1024 * 1024;
  const $ = (id) => document.getElementById(id);
  let pollTimer = null;
  let pollCount = 0;
  let images = [];
  let lastLoaded = 0;
  const known = new Map(); // imageId -> status, de bao toast khi trang thai doi

  // ---------- Ngon ngu (i18n): chi doi chu hien thi tren trinh duyet ----------
  const I18N = {
    vi: {
      "nav.upload": "Tải lên", "nav.library": "Thư viện", login: "Đăng nhập", logout: "Đăng xuất",
      "hero.h1": "Kiểm duyệt ảnh<br><span>tự động bằng AI</span>",
      "hero.p": "Tải ảnh lên, hệ thống kiểm tra nội dung trong vài giây. Ảnh vi phạm bị chặn và quản trị viên nhận email cảnh báo; ảnh hợp lệ được gắn nhãn mô tả.",
      "hero.cta": "Đăng nhập để bắt đầu", "flow.aria": "Luồng xử lý", "flow.browser": "Trình duyệt",
      "s1.h": "Tải ảnh lên", "s1.p": "Ảnh đi thẳng lên Amazon S3 qua URL ký sẵn, hết hạn sau 5 phút. Không đi qua máy chủ trung gian.",
      "s2.h": "AI kiểm duyệt", "s2.p": "Phát hiện bạo lực, khiêu dâm, ma túy và thuốc lá, biểu tượng thù ghét. Ảnh vi phạm bị chặn ngay.",
      "s3.h": "Gắn nhãn", "s3.p": "Ảnh hợp lệ được gắn tối đa 10 nhãn mô tả nội dung, giúp tìm lại ảnh nhanh.",
      "st.total": "Tổng ảnh", "st.ok": "Đã duyệt", "st.bad": "Bị chặn", "st.wait": "Đang xử lý", "st.avg": "TB hoàn tất",
      "st.avgTip": "Trung bình từ lúc xin URL tải lên đến khi kiểm duyệt xong (gồm cả thời gian upload)",
      "up.h": "Tải ảnh lên", "up.hint": "JPEG · tối đa 5 MB · nhiều ảnh", "up.drop": "Chọn hoặc kéo thả ảnh vào đây",
      "up.dropHint": "Có thể chọn nhiều ảnh cùng lúc; ảnh được kiểm tra định dạng ngay trên trình duyệt.",
      "up.btn": "Tải lên", "up.clear": "Xóa danh sách",
      "lib.h": "Thư viện ảnh", "lib.live": "Đang cập nhật", "lib.refresh": "Làm mới", "tab.all": "Tất cả",
      "lib.q": "Tìm theo nhãn hoặc danh mục (vd: Cat, Violence)", "lib.qAria": "Tìm theo nhãn", "lib.sort": "Sắp xếp",
      "lib.new": "Mới nhất", "lib.old": "Cũ nhất", "lib.popular": "NHÃN PHỔ BIẾN",
      "lib.empty": "Chưa có ảnh nào. Hãy tải ảnh đầu tiên lên.", "lib.noMatch": "Không có ảnh nào khớp bộ lọc.",
      "lib.itemAria": "Xem chi tiết ảnh {0}",
      "m.aria": "Chi tiết ảnh", "m.close": "Đóng", "m.created": "Tải lên", "m.processed": "Xử lý xong",
      "m.duration": "Tổng thời gian", "m.seconds": "{0} giây", "m.labels": "Nhãn", "m.blocked": "Danh mục vi phạm",
      "m.none": "Chưa có", "m.copyId": "Sao chép ID", "m.copyLabels": "Sao chép nhãn",
      "q.wait": "Chờ tải lên", "q.notJpeg": "Không phải JPEG", "q.tooBig": "Vượt quá 5 MB", "q.fake": "Nội dung không phải ảnh JPEG",
      "q.url": "Đang xin URL…", "q.s3": "Đang tải lên S3…", "q.done": "Đã tải lên ✓",
      "msg.state": "Sai tham số state, vui lòng đăng nhập lại.", "msg.loginFail": "Đăng nhập thất bại.",
      "msg.expired": "Phiên đăng nhập đã hết hạn", "msg.api": "API {0} lỗi {1}", "msg.s3": "S3 trả về {0}",
      "msg.uploaded": "Đã tải lên {0} ảnh, đang kiểm duyệt…", "msg.noneUploaded": "Không tải lên được ảnh nào.",
      "t.approved": "Ảnh đã được duyệt: {0}", "t.noLabels": "không có nhãn", "t.rejected": "Ảnh bị chặn: {0}", "t.invalid": "không hợp lệ",
      "t.copied": "Đã sao chép {0}", "t.copyFail": "Trình duyệt không cho phép sao chép", "t.labelsWord": "nhãn",
      "pic.blocked": "Ảnh bị chặn: {0}", "pic.waiting": "Đang kiểm duyệt…",
    },
    en: {
      "nav.upload": "Upload", "nav.library": "Library", login: "Sign in", logout: "Sign out",
      "hero.h1": "AI-powered<br><span>image moderation</span>",
      "hero.p": "Upload an image and the system checks its content within seconds. Violating images are blocked and the administrator gets an alert email; valid images are tagged with descriptive labels.",
      "hero.cta": "Sign in to get started", "flow.aria": "Processing flow", "flow.browser": "Browser",
      "s1.h": "Upload images", "s1.p": "Images go straight to Amazon S3 through a presigned URL that expires after 5 minutes. No intermediate server.",
      "s2.h": "AI moderation", "s2.p": "Detects violence, explicit content, drugs and tobacco, and hate symbols. Violating images are blocked immediately.",
      "s3.h": "Labeling", "s3.p": "Valid images get up to 10 labels describing their content, so they are easy to find again.",
      "st.total": "Total images", "st.ok": "Approved", "st.bad": "Blocked", "st.wait": "Processing", "st.avg": "Avg. completion",
      "st.avgTip": "Average time from requesting the upload URL to moderation finished (includes upload time)",
      "up.h": "Upload images", "up.hint": "JPEG · max 5 MB · multiple files", "up.drop": "Choose or drag and drop images here",
      "up.dropHint": "You can pick several images at once; the format is checked right in the browser.",
      "up.btn": "Upload", "up.clear": "Clear list",
      "lib.h": "Image library", "lib.live": "Updating", "lib.refresh": "Refresh", "tab.all": "All",
      "lib.q": "Search by label or category (e.g. Cat, Violence)", "lib.qAria": "Search by label", "lib.sort": "Sort",
      "lib.new": "Newest", "lib.old": "Oldest", "lib.popular": "POPULAR LABELS",
      "lib.empty": "No images yet. Upload your first one.", "lib.noMatch": "No images match the filter.",
      "lib.itemAria": "View details of {0} image",
      "m.aria": "Image details", "m.close": "Close", "m.created": "Uploaded", "m.processed": "Processed",
      "m.duration": "Total time", "m.seconds": "{0} seconds", "m.labels": "Labels", "m.blocked": "Violating categories",
      "m.none": "None", "m.copyId": "Copy ID", "m.copyLabels": "Copy labels",
      "q.wait": "Waiting to upload", "q.notJpeg": "Not a JPEG", "q.tooBig": "Larger than 5 MB", "q.fake": "Content is not a JPEG image",
      "q.url": "Requesting URL…", "q.s3": "Uploading to S3…", "q.done": "Uploaded ✓",
      "msg.state": "Invalid state parameter, please sign in again.", "msg.loginFail": "Sign-in failed.",
      "msg.expired": "Your session has expired", "msg.api": "API {0} error {1}", "msg.s3": "S3 returned {0}",
      "msg.uploaded": "Uploaded {0} image(s), moderating…", "msg.noneUploaded": "No images were uploaded.",
      "t.approved": "Image approved: {0}", "t.noLabels": "no labels", "t.rejected": "Image blocked: {0}", "t.invalid": "invalid",
      "t.copied": "Copied {0}", "t.copyFail": "The browser does not allow copying", "t.labelsWord": "labels",
      "pic.blocked": "Image blocked: {0}", "pic.waiting": "Moderating…",
    },
  };
  const qs = new URLSearchParams(location.search).get("lang");
  let lang = (() => {
    if (qs === "vi" || qs === "en") return qs;
    try { const s = localStorage.getItem("ig_lang"); if (s === "vi" || s === "en") return s; } catch {}
    return "vi";
  })();
  const tr = (key, ...args) => (I18N[lang][key] ?? I18N.vi[key] ?? key).replace(/\{(\d)\}/g, (_, n) => args[n]);
  const locale = () => (lang === "en" ? "en-US" : "vi-VN");

  // Chu tinh trong HTML: chi lay tu tu dien I18N o tren (khong phai du lieu nguoi dung)
  function applyStatic() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((e) => { e.textContent = tr(e.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach((e) => { e.innerHTML = tr(e.dataset.i18nHtml); });
    document.querySelectorAll("[data-i18n-ph]").forEach((e) => { e.placeholder = tr(e.dataset.i18nPh); });
    document.querySelectorAll("[data-i18n-aria]").forEach((e) => e.setAttribute("aria-label", tr(e.dataset.i18nAria)));
    document.querySelectorAll("[data-i18n-title]").forEach((e) => { e.title = tr(e.dataset.i18nTitle); });
    document.querySelectorAll("#lang button").forEach((b) => {
      const on = b.dataset.lang === lang;
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", on);
    });
  }
  function setLang(l) {
    if (l === lang) return;
    lang = l;
    try { localStorage.setItem("ig_lang", l); } catch {}
    applyStatic();
    for (const q of queue) if (q.stKey) setSt(q, q.stKey, q.cls, q.stArg);
    if (images.length || currentToken()) renderAll();
    if ($("modal").open && current) fillModal(current);
  }

  // ---------- PKCE helpers ----------
  const base64Url = (bytes) =>
    btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const randomString = (len = 64) => base64Url(crypto.getRandomValues(new Uint8Array(len)));
  const sha256 = (text) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));

  // Token luu trong sessionStorage: mat khi dong tab (an toan hon localStorage).
  const tokens = {
    get: () => JSON.parse(sessionStorage.getItem("ig_tokens") || "null"),
    set: (t) => sessionStorage.setItem("ig_tokens", JSON.stringify(t)),
    clear: () => sessionStorage.removeItem("ig_tokens"),
  };

  async function login() {
    const verifier = randomString();
    const state = randomString(16);
    sessionStorage.setItem("ig_pkce_verifier", verifier);
    sessionStorage.setItem("ig_oauth_state", state);
    const challenge = base64Url(await sha256(verifier));
    const params = new URLSearchParams({
      response_type: "code",
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      scope: "openid email",
      state,
      code_challenge_method: "S256",
      code_challenge: challenge,
    });
    location.assign(`${cfg.cognitoDomain}/oauth2/authorize?${params}`);
  }

  async function handleCallback() {
    const url = new URL(location.href);
    const code = url.searchParams.get("code");
    if (!code) return;
    const state = url.searchParams.get("state");
    // Chong CSRF: state tra ve phai trung state da gui di
    if (state !== sessionStorage.getItem("ig_oauth_state")) {
      showMessage(tr("msg.state"), true);
      return;
    }
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: cfg.clientId,
      code,
      redirect_uri: cfg.redirectUri,
      code_verifier: sessionStorage.getItem("ig_pkce_verifier"),
    });
    const res = await fetch(`${cfg.cognitoDomain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    sessionStorage.removeItem("ig_pkce_verifier");
    sessionStorage.removeItem("ig_oauth_state");
    history.replaceState({}, "", cfg.redirectUri); // xoa ?code= khoi thanh dia chi
    if (!res.ok) {
      showMessage(tr("msg.loginFail"), true);
      return;
    }
    const t = await res.json();
    tokens.set({ ...t, expiresAt: Date.now() + t.expires_in * 1000 });
  }

  function logout() {
    tokens.clear();
    const params = new URLSearchParams({ client_id: cfg.clientId, logout_uri: cfg.redirectUri });
    location.assign(`${cfg.cognitoDomain}/logout?${params}`);
  }

  function currentToken() {
    const t = tokens.get();
    if (!t || Date.now() > t.expiresAt - 30000) {
      tokens.clear();
      return null;
    }
    return t;
  }

  function emailFromIdToken(idToken) {
    try {
      const payload = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(payload)).email || "";
    } catch {
      return "";
    }
  }

  // ---------- API ----------
  async function api(path, options = {}) {
    const t = currentToken();
    if (!t) {
      render();
      throw new Error(tr("msg.expired"));
    }
    const res = await fetch(`${cfg.apiUrl}${path}`, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${t.access_token}` },
    });
    if (!res.ok) throw new Error(tr("msg.api", path, res.status));
    return res.json();
  }


  // ---------- Kiem tra file ngay tren trinh duyet ----------
  // Doc 3 byte dau: JPEG luon bat dau bang FF D8 FF (tranh file doi duoi .jpg)
  async function isRealJpeg(file) {
    const b = new Uint8Array(await file.slice(0, 3).arrayBuffer());
    return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  }

  // ---------- Hang doi upload (nhieu anh, tai lan luot) ----------
  let queue = []; // {file, url, li, st, state}
  function addFiles(files) {
    for (const file of files) {
      const li = el("li");
      const pic = el("img"); pic.alt = "";
      const url = URL.createObjectURL(file); pic.src = url;
      const name = el("span", "name", file.name);
      const st = el("span", "st", tr("q.wait"));
      li.append(pic, name, st);
      $("queue").append(li);
      const q = { file, url, li, st, state: "wait", stKey: "q.wait" };
      queue.push(q);
      validate(q);
    }
    syncUploadBtn();
  }
  async function validate(q) {
    const f = q.file;
    let err = null;
    if (f.type !== "image/jpeg") err = "q.notJpeg";
    else if (f.size > MAX_BYTES) err = "q.tooBig";
    else if (!(await isRealJpeg(f))) err = "q.fake";
    if (err) { q.state = "invalid"; setSt(q, err, "bad"); }
    syncUploadBtn();
  }
  // key: khoa trong I18N (luu lai de doi ngon ngu); raw: thong bao loi goc
  function setSt(q, key, cls, arg) {
    q.stKey = key; q.cls = cls; q.stArg = arg;
    q.st.textContent = key === "raw" ? arg : tr(key, arg); q.st.className = "st " + (cls || "");
  }
  function syncUploadBtn() {
    const ready = queue.some((q) => q.state === "wait");
    $("uploadBtn").disabled = !ready;
    $("clearBtn").classList.toggle("hidden", !queue.length);
  }
  function clearQueue() {
    queue.filter((q) => q.state !== "run").forEach((q) => { URL.revokeObjectURL(q.url); q.li.remove(); });
    queue = queue.filter((q) => q.state === "run");
    syncUploadBtn(); showMessage("");
  }

  async function uploadOne(q) {
    q.state = "run"; setSt(q, "q.url", "run");
    const { uploadUrl, contentType } = await api("/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: q.file.type }),
    });
    setSt(q, "q.s3", "run");
    // PUT thang len S3 bang presigned URL: anh khong di qua API Gateway / Lambda
    const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: q.file });
    if (!put.ok) throw new Error(tr("msg.s3", put.status));
    q.state = "done"; setSt(q, "q.done", "ok");
  }

  async function upload() {
    const todo = queue.filter((q) => q.state === "wait");
    if (!todo.length) return;
    $("uploadBtn").disabled = true;
    let ok = 0;
    for (const q of todo) {
      try { await uploadOne(q); ok++; }
      catch (err) { q.state = "error"; setSt(q, "raw", "bad", err.message); }
    }
    showMessage(ok ? tr("msg.uploaded", ok) : tr("msg.noneUploaded"), !ok);
    syncUploadBtn();
    pollCount = 0;
    await loadImages().catch((e) => showMessage(e.message, true));
  }

  async function loadImages() {
    const data = await api("/images");
    images = data.images || [];
    lastLoaded = Date.now();
    notifyChanges(images);
    renderAll();
    clearTimeout(pollTimer);
    // Con anh PENDING thi tu hoi lai sau 3 giay (toi da ~2 phut)
    const pending = images.some((i) => i.status === "PENDING");
    $("live").classList.toggle("hidden", !pending);
    if (pending && pollCount < 40) { pollCount++; pollTimer = setTimeout(() => loadImages().catch(() => {}), 3000); }
  }

  function notifyChanges(list) {
    for (const i of list) {
      const before = known.get(i.imageId);
      if (before === "PENDING" && i.status !== "PENDING") {
        if (i.status === "APPROVED") toast(tr("t.approved", i.labels.slice(0, 3).join(", ") || tr("t.noLabels")), "ok");
        else toast(tr("t.rejected", (i.blockedCategories || []).join(", ") || tr("t.invalid")), "bad");
      }
      known.set(i.imageId, i.status);
    }
  }

  // ---------- UI ----------
  // Dung textContent / createElement (khong innerHTML voi du lieu) -> tranh XSS
  const STATUS_KEY = { APPROVED: "st.ok", REJECTED: "st.bad", PENDING: "st.wait" };
  const statusText = (s) => (STATUS_KEY[s] ? tr(STATUS_KEY[s]) : s);
  const fmt = (s) => (s ? new Date(s).toLocaleString(locale(), { dateStyle: "short", timeStyle: "medium" }) : "–");
  const secs = (i) => (i.createdAt && i.processedAt ? (new Date(i.processedAt) - new Date(i.createdAt)) / 1000 : null);

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  const badge = (status) => el("span", `badge ${status}`, statusText(status));

  let filter = "ALL", query = "", sortNew = true;

  function renderAll() { renderStats(); renderChips(); renderGallery(); }

  function renderStats() {
    const c = (s) => images.filter((i) => i.status === s).length;
    $("sTotal").textContent = images.length;
    $("sOk").textContent = c("APPROVED");
    $("sBad").textContent = c("REJECTED");
    $("sWait").textContent = c("PENDING");
    const d = images.map(secs).filter((x) => x !== null && x >= 0 && x < 600);
    $("sAvg").textContent = d.length ? `${(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1)}s` : "–";
    $("nALL").textContent = images.length;
    for (const s of ["APPROVED", "REJECTED", "PENDING"]) $("n" + s).textContent = c(s);
  }

  // Nhan pho bien nhat trong anh cua chinh nguoi dung (loc tren trinh duyet, khong goi them API)
  function renderChips() {
    const freq = new Map();
    for (const i of images) for (const l of i.labels || []) freq.set(l, (freq.get(l) || 0) + 1);
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const box = $("chips");
    box.replaceChildren();
    if (!top.length) return;
    box.append(el("span", "lbl", tr("lib.popular")));
    for (const [l, n] of top) {
      const b = el("button", "chip" + (query.toLowerCase() === l.toLowerCase() ? " on" : ""), `${l} · ${n}`);
      b.type = "button";
      b.addEventListener("click", () => { query = query.toLowerCase() === l.toLowerCase() ? "" : l; $("q").value = query; renderChips(); renderGallery(); });
      box.append(b);
    }
  }

  function visible() {
    const q = query.trim().toLowerCase();
    return images
      .filter((i) => filter === "ALL" || i.status === filter)
      .filter((i) => !q || [...(i.labels || []), ...(i.blockedCategories || [])].some((l) => l.toLowerCase().includes(q)))
      .sort((a, b) => (sortNew ? 1 : -1) * String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }

  function renderGallery() {
    const gallery = $("gallery");
    gallery.replaceChildren();
    const list = visible();
    if (!images.length) { gallery.append(el("p", "empty", tr("lib.empty"))); return; }
    if (!list.length) { gallery.append(el("p", "empty", tr("lib.noMatch"))); return; }
    for (const img of list) {
      const item = el("button", "item"); item.type = "button";
      item.setAttribute("aria-label", tr("lib.itemAria", statusText(img.status)));
      const thumb = el("div", "thumb");
      fillPic(thumb, img, true);
      const meta = el("div", "meta");
      const row = el("div", "row");
      row.append(badge(img.status), el("span", "time", img.createdAt ? new Date(img.createdAt).toLocaleString(locale(), { dateStyle: "short", timeStyle: "short" }) : ""));
      meta.append(row);
      if ((img.labels || []).length) {
        const tags = el("div", "tags");
        for (const l of img.labels.slice(0, 6)) tags.append(el("span", "tag", l));
        if (img.labels.length > 6) tags.append(el("span", "tag", `+${img.labels.length - 6}`));
        meta.append(tags);
      }
      item.append(thumb, meta);
      item.addEventListener("click", () => openModal(img.imageId));
      gallery.append(item);
    }
  }

  function fillPic(box, img, lazy) {
    box.replaceChildren(); box.classList.remove("blocked", "waiting");
    if (img.status === "APPROVED" && img.imageUrl) {
      const pic = el("img"); pic.src = img.imageUrl; pic.alt = (img.labels || []).join(", ");
      if (lazy) pic.loading = "lazy";
      box.append(pic);
    } else if (img.status === "REJECTED") {
      box.classList.add("blocked");
      box.textContent = tr("pic.blocked", (img.blockedCategories || []).join(", ") || tr("t.invalid"));
    } else {
      box.classList.add("waiting");
      box.textContent = tr("pic.waiting");
    }
  }

  // ---------- Chi tiet anh ----------
  let current = null;
  async function openModal(id) {
    // Presigned URL het han sau 5 phut: du lieu cu hon 4 phut thi tai lai truoc khi mo
    if (Date.now() - lastLoaded > 240000) await loadImages().catch(() => {});
    const img = images.find((i) => i.imageId === id);
    if (!img) return;
    current = img;
    fillModal(img);
    $("modal").showModal();
  }
  function fillModal(img) {
    $("mBadge").replaceChildren(badge(img.status));
    fillPic($("mPic"), img, false);
    $("mCreated").textContent = fmt(img.createdAt);
    $("mProcessed").textContent = fmt(img.processedAt);
    const s = secs(img);
    $("mDuration").textContent = s === null ? "–" : tr("m.seconds", s.toFixed(1));
    $("mId").textContent = img.imageId;
    const blocked = img.status === "REJECTED";
    const list = blocked ? img.blockedCategories || [] : img.labels || [];
    $("mTagsTitle").textContent = blocked ? tr("m.blocked") : tr("m.labels");
    $("mTags").replaceChildren(...(list.length ? list.map((l) => el("span", "tag", l)) : [el("span", "muted", tr("m.none"))]));
    $("copyLabels").classList.toggle("hidden", !list.length);
  }
  async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); toast(tr("t.copied", label)); }
    catch { toast(tr("t.copyFail"), "bad"); }
  }

  function toast(text, kind) {
    const t = el("div", "toast " + (kind || ""), text);
    $("toasts").append(t);
    setTimeout(() => t.remove(), 4500);
  }

  function showMessage(text, isError = false) {
    const m = $("message");
    m.textContent = text;
    m.style.color = isError ? "var(--bad)" : "var(--muted)";
  }

  function render() {
    const t = currentToken();
    $("guest").classList.toggle("hidden", !!t);
    $("app").classList.toggle("hidden", !t);
    $("nav").classList.toggle("hidden", !t);
    $("loginBtn").classList.toggle("hidden", !!t);
    $("logoutBtn").classList.toggle("hidden", !t);
    $("user").textContent = t ? emailFromIdToken(t.id_token) : "";
  }

  // ---------- Su kien ----------
  $("fileInput").addEventListener("change", (e) => { addFiles([...e.target.files]); e.target.value = ""; });
  const drop = $("drop");
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, () => drop.classList.add("over")));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove("over")));

  $("lang").addEventListener("click", (e) => { const b = e.target.closest("button[data-lang]"); if (b) setLang(b.dataset.lang); });
  $("loginBtn").addEventListener("click", login);
  $("heroLogin").addEventListener("click", login);
  $("logoutBtn").addEventListener("click", logout);
  $("uploadBtn").addEventListener("click", upload);
  $("clearBtn").addEventListener("click", clearQueue);
  $("refreshBtn").addEventListener("click", () => { pollCount = 0; loadImages().catch((e) => showMessage(e.message, true)); });
  $("tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-f]"); if (!b) return;
    filter = b.dataset.f;
    [...$("tabs").children].forEach((x) => x.classList.toggle("on", x === b));
    renderGallery();
  });
  $("q").addEventListener("input", (e) => { query = e.target.value; renderChips(); renderGallery(); });
  $("sort").addEventListener("change", (e) => { sortNew = e.target.value === "new"; renderGallery(); });
  $("closeModal").addEventListener("click", () => $("modal").close());
  $("modal").addEventListener("click", (e) => { if (e.target === $("modal")) $("modal").close(); });
  $("copyId").addEventListener("click", () => current && copy(current.imageId, "Image ID"));
  $("copyLabels").addEventListener("click", () => {
    if (!current) return;
    const list = current.status === "REJECTED" ? current.blockedCategories : current.labels;
    copy((list || []).join(", "), tr("t.labelsWord"));
  });

  applyStatic();
  (async () => {
    await handleCallback();
    render();
    if (currentToken()) loadImages().catch((e) => showMessage(e.message, true));
  })();
})();
