// ImageGuard frontend - JavaScript thuan, khong framework.
// Dang nhap: Cognito Managed Login, OAuth 2.0 Authorization Code + PKCE (danh cho SPA, khong can client secret).
(() => {
  const cfg = window.IMAGEGUARD_CONFIG;
  const MAX_BYTES = 5 * 1024 * 1024;
  const $ = (id) => document.getElementById(id);
  let pollTimer = null;

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

  async function upload() {
    const file = $("fileInput").files[0];
    if (!file) return showMessage("Hãy chọn một ảnh.", true);
    if (file.type !== "image/jpeg") return showMessage("Chỉ nhận ảnh JPEG.", true);
    if (file.size > MAX_BYTES) return showMessage("Ảnh vượt quá 5 MB.", true);

    $("uploadBtn").disabled = true;
    try {
      showMessage("Đang xin URL tải lên…");
      const { uploadUrl, contentType } = await api("/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type }),
      });
      showMessage("Đang tải ảnh lên S3…");
      // PUT thang len S3 bang presigned URL: anh khong di qua API Gateway / Lambda
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file });
      if (!put.ok) throw new Error(`S3 trả về ${put.status}`);
      showMessage("Đã tải lên, đang kiểm duyệt…");
      $("fileInput").value = "";
      await loadImages();
    } catch (err) {
      showMessage(err.message, true);
    } finally {
      $("uploadBtn").disabled = false;
    }
  }

  async function loadImages() {
    const { images } = await api("/images");
    renderGallery(images);
    clearTimeout(pollTimer);
    // Con anh PENDING thi tu hoi lai sau 3 giay
    if (images.some((i) => i.status === "PENDING")) pollTimer = setTimeout(loadImages, 3000);
  }

  // ---------- UI ----------
  // Dung textContent / createElement (khong innerHTML voi du lieu) -> tranh XSS
  function renderGallery(images) {
    const gallery = $("gallery");
    gallery.replaceChildren();
    if (!images.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "Chưa có ảnh nào.";
      gallery.append(p);
      return;
    }
    for (const img of images) {
      const item = document.createElement("div");
      item.className = "item";

      const thumb = document.createElement("div");
      thumb.className = "thumb";
      if (img.status === "APPROVED" && img.imageUrl) {
        const el = document.createElement("img");
        el.src = img.imageUrl;
        el.alt = img.labels.join(", ");
        thumb.append(el);
      } else if (img.status === "REJECTED") {
        thumb.textContent = `Ảnh bị chặn: ${img.blockedCategories.join(", ") || "không hợp lệ"}`;
      } else {
        thumb.textContent = "Đang kiểm duyệt…";
      }

      const meta = document.createElement("div");
      meta.className = "meta";
      const badge = document.createElement("span");
      badge.className = `badge ${img.status}`;
      badge.textContent = img.status;
      const time = document.createElement("div");
      time.className = "muted";
      time.textContent = img.createdAt ? new Date(img.createdAt).toLocaleString("vi-VN") : "";
      const tags = document.createElement("div");
      tags.className = "tags";
      tags.textContent = img.labels.length ? img.labels.join(" · ") : "";
      meta.append(badge, time, tags);

      item.append(thumb, meta);
      gallery.append(item);
    }
  }

  function showMessage(text, isError = false) {
    const el = $("message");
    el.textContent = text;
    el.style.color = isError ? "var(--bad)" : "var(--muted)";
  }

  function render() {
    const t = currentToken();
    $("guest").classList.toggle("hidden", !!t);
    $("app").classList.toggle("hidden", !t);
    $("loginBtn").classList.toggle("hidden", !!t);
    $("logoutBtn").classList.toggle("hidden", !t);
    $("user").textContent = t ? emailFromIdToken(t.id_token) : "";
  }

  $("loginBtn").addEventListener("click", login);
  $("logoutBtn").addEventListener("click", logout);
  $("uploadBtn").addEventListener("click", upload);
  $("refreshBtn").addEventListener("click", () => loadImages().catch((e) => showMessage(e.message, true)));

  (async () => {
    await handleCallback();
    render();
    if (currentToken()) loadImages().catch((e) => showMessage(e.message, true));
  })();
})();
