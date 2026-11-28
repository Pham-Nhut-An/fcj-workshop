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
      showMessage("Sai tham số state, vui lòng đăng nhập lại.", true);
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
      showMessage("Đăng nhập thất bại.", true);
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
      throw new Error("Phiên đăng nhập đã hết hạn");
    }
    const res = await fetch(`${cfg.apiUrl}${path}`, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${t.access_token}` },
    });
    if (!res.ok) throw new Error(`API ${path} lỗi ${res.status}`);
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
      const st = el("span", "st", "Chờ tải lên");
      li.append(pic, name, st);
      $("queue").append(li);
      const q = { file, url, li, st, state: "wait" };
      queue.push(q);
      validate(q);
    }
    syncUploadBtn();
  }
  async function validate(q) {
    const f = q.file;
    let err = null;
    if (f.type !== "image/jpeg") err = "Không phải JPEG";
    else if (f.size > MAX_BYTES) err = "Vượt quá 5 MB";
    else if (!(await isRealJpeg(f))) err = "Nội dung không phải ảnh JPEG";
    if (err) { q.state = "invalid"; setSt(q, err, "bad"); }
    syncUploadBtn();
  }
  function setSt(q, text, cls) { q.st.textContent = text; q.st.className = "st " + (cls || ""); }
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
    q.state = "run"; setSt(q, "Đang xin URL…", "run");
    const { uploadUrl, contentType } = await api("/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: q.file.type }),
    });
    setSt(q, "Đang tải lên S3…", "run");
    // PUT thang len S3 bang presigned URL: anh khong di qua API Gateway / Lambda
    const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: q.file });
    if (!put.ok) throw new Error(`S3 trả về ${put.status}`);
    q.state = "done"; setSt(q, "Đã tải lên ✓", "ok");
  }

  async function upload() {
    const todo = queue.filter((q) => q.state === "wait");
    if (!todo.length) return;
    $("uploadBtn").disabled = true;
    let ok = 0;
    for (const q of todo) {
      try { await uploadOne(q); ok++; }
      catch (err) { q.state = "error"; setSt(q, err.message, "bad"); }
    }
    showMessage(ok ? `Đã tải lên ${ok} ảnh, đang kiểm duyệt…` : "Không tải lên được ảnh nào.", !ok);
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
        if (i.status === "APPROVED") toast(`Ảnh đã được duyệt: ${i.labels.slice(0, 3).join(", ") || "không có nhãn"}`, "ok");
        else toast(`Ảnh bị chặn: ${(i.blockedCategories || []).join(", ") || "không hợp lệ"}`, "bad");
      }
      known.set(i.imageId, i.status);
    }
  }

  // ---------- UI ----------
  // Dung textContent / createElement (khong innerHTML voi du lieu) -> tranh XSS
  const STATUS_TEXT = { APPROVED: "Đã duyệt", REJECTED: "Bị chặn", PENDING: "Đang xử lý" };
  const fmt = (s) => (s ? new Date(s).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "medium" }) : "–");
  const secs = (i) => (i.createdAt && i.processedAt ? (new Date(i.processedAt) - new Date(i.createdAt)) / 1000 : null);

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  const badge = (status) => el("span", `badge ${status}`, STATUS_TEXT[status] || status);

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
    box.append(el("span", "lbl", "NHÃN PHỔ BIẾN"));
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
    if (!images.length) { gallery.append(el("p", "empty", "Chưa có ảnh nào. Hãy tải ảnh đầu tiên lên.")); return; }
    if (!list.length) { gallery.append(el("p", "empty", "Không có ảnh nào khớp bộ lọc.")); return; }
    for (const img of list) {
      const item = el("button", "item"); item.type = "button";
      item.setAttribute("aria-label", `Xem chi tiết ảnh ${STATUS_TEXT[img.status] || ""}`);
      const thumb = el("div", "thumb");
      fillPic(thumb, img, true);
      const meta = el("div", "meta");
      const row = el("div", "row");
      row.append(badge(img.status), el("span", "time", img.createdAt ? new Date(img.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : ""));
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
      box.textContent = `Ảnh bị chặn: ${(img.blockedCategories || []).join(", ") || "không hợp lệ"}`;
    } else {
      box.classList.add("waiting");
      box.textContent = "Đang kiểm duyệt…";
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
    $("mBadge").replaceChildren(badge(img.status));
    fillPic($("mPic"), img, false);
    $("mCreated").textContent = fmt(img.createdAt);
    $("mProcessed").textContent = fmt(img.processedAt);
    const s = secs(img);
    $("mDuration").textContent = s === null ? "–" : `${s.toFixed(1)} giây`;
    $("mId").textContent = img.imageId;
    const blocked = img.status === "REJECTED";
    const list = blocked ? img.blockedCategories || [] : img.labels || [];
    $("mTagsTitle").textContent = blocked ? "Danh mục vi phạm" : "Nhãn";
    $("mTags").replaceChildren(...(list.length ? list.map((l) => el("span", "tag", l)) : [el("span", "muted", "Chưa có")]));
    $("copyLabels").classList.toggle("hidden", !list.length);
    $("modal").showModal();
  }
  async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); toast(`Đã sao chép ${label}`); }
    catch { toast("Trình duyệt không cho phép sao chép", "bad"); }
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
    copy((list || []).join(", "), "nhãn");
  });

  (async () => {
    await handleCallback();
    render();
    if (currentToken()) loadImages().catch((e) => showMessage(e.message, true));
  })();
})();
