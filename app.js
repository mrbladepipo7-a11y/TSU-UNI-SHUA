// STUDIA frontend. Configure your Supabase project in the constants below.
const SUPABASE_URL = "https://hdmsrvjjwcettvgrsasm.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_g5y6r2jYioSkM9u8LF0-fg_rxV2EDhc";
const CONFIGURED = !SUPABASE_URL.includes("YOUR_PROJECT_ID") && !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY");
const supabase = CONFIGURED && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { user: null, profile: null, view: "dashboard", materials: [], summaries: [], users: [], authMode: "login" };

const authView = $("#authView");
const appView = $("#appView");
const contentArea = $("#contentArea");
const toast = $("#toast");

function notify(message, duration = 3600) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => toast.classList.remove("show"), duration);
}
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
}
function initials(first = "", last = "") {
  return ((first.trim()[0] || "") + (last.trim()[0] || "")).toUpperCase() || "S";
}
function dateLabel(date) {
  if (!date) return "თარიღი უცნობია";
  return new Intl.DateTimeFormat("ka-GE", { year:"numeric", month:"short", day:"numeric" }).format(new Date(date));
}
function showAuthMessage(message, error = false) {
  $("#authMessage").textContent = message;
  $("#authMessage").style.color = error ? "#e8a59b" : "var(--gold2)";
}
function setAuthMode(mode) {
  state.authMode = mode;
  const signup = mode === "signup";
  $("#loginTab").classList.toggle("active", !signup);
  $("#signupTab").classList.toggle("active", signup);
  $("#loginTab").setAttribute("aria-selected", String(!signup));
  $("#signupTab").setAttribute("aria-selected", String(signup));
  $("#nameFields").hidden = !signup;
  $("#firstName").required = signup;
  $("#lastName").required = signup;
  $("#authPassword").autocomplete = signup ? "new-password" : "current-password";
  $("#authSubmit").innerHTML = signup ? 'ანგარიშის შექმნა <span>↗</span>' : 'შესვლა <span>↗</span>';
  showAuthMessage("");
}
$("#loginTab").addEventListener("click", () => setAuthMode("login"));
$("#signupTab").addEventListener("click", () => setAuthMode("signup"));

function renderNotConfigured() {
  authView.hidden = false;
  appView.hidden = true;
  showAuthMessage("საიტის გასააქტიურებლად ჯერ შეავსე Supabase-ის URL და anon key app.js ფაილში.", true);
  $("#authSubmit").disabled = true;
  $("#authSubmit").style.opacity = ".5";
}
$("#authForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!supabase) return renderNotConfigured();
  const email = $("#authEmail").value.trim().toLowerCase();
  const password = $("#authPassword").value;
  const submit = $("#authSubmit");
  submit.disabled = true;
  submit.textContent = "მუშავდება…";
  showAuthMessage("");
  try {
    if (state.authMode === "signup") {
      const first_name = $("#firstName").value.trim();
      const last_name = $("#lastName").value.trim();
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { first_name, last_name, full_name: `${first_name} ${last_name}`.trim() } }
      });
      if (error) throw error;
      if (!data.session) {
        showAuthMessage("ანგარიში შეიქმნა. შეამოწმე ელფოსტა დასადასტურებელი წერილისთვის.");
      } else {
        state.user = data.user;
        await loadApp();
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      state.user = data.user;
      await loadApp();
    }
  } catch (error) {
    showAuthMessage(friendlyError(error), true);
  } finally {
    submit.disabled = false;
    submit.innerHTML = state.authMode === "signup" ? 'ანგარიშის შექმნა <span>↗</span>' : 'შესვლა <span>↗</span>';
  }
});
function friendlyError(error) {
  const message = String(error?.message || "უცნობი შეცდომა");
  if (/Invalid login credentials/i.test(message)) return "ელფოსტა ან პაროლი არასწორია.";
  if (/already registered/i.test(message)) return "ეს ელფოსტა უკვე რეგისტრირებულია. სცადე შესვლა.";
  if (/Password should be at least/i.test(message)) return "პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს.";
  if (/Email not confirmed/i.test(message)) return "ჯერ დაადასტურე ელფოსტა და შემდეგ შედი.";
  return message;
}
async function loadApp() {
  if (!state.user) return;
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", state.user.id).maybeSingle();
  if (error) throw error;
  state.profile = profile || {
    id: state.user.id, email: state.user.email,
    first_name: state.user.user_metadata?.first_name || "",
    last_name: state.user.user_metadata?.last_name || "", role: "student"
  };
  authView.hidden = true;
  appView.hidden = false;
  const fullName = `${state.profile.first_name || ""} ${state.profile.last_name || ""}`.trim() || state.user.email;
  $("#sideName").textContent = fullName;
  $("#sideRole").textContent = state.profile.role === "admin" ? "ადმინისტრატორი" : "სტუდენტი";
  $("#sideAvatar").textContent = initials(state.profile.first_name, state.profile.last_name);
  $("#topAvatar").textContent = initials(state.profile.first_name, state.profile.last_name);
  $("#welcomeTitle").textContent = `მოგესალმები, ${state.profile.first_name || "სტუდენტო"}.`;
  $("#todayChip").textContent = new Intl.DateTimeFormat("ka-GE", { day:"numeric", month:"short", year:"numeric" }).format(new Date());
  $("#adminNav").hidden = state.profile.role !== "admin";
  await refreshData();
  renderView("dashboard");
}
async function refreshData() {
  const [materialsResult, summariesResult] = await Promise.all([
    supabase.from("materials").select("id,title,description,filename,storage_path,category,created_at").order("created_at", { ascending: false }),
    supabase.from("summaries").select("id,material_id,title,content,created_at").eq("user_id", state.user.id).order("created_at", { ascending: false })
  ]);
  if (materialsResult.error) throw materialsResult.error;
  if (summariesResult.error) throw summariesResult.error;
  state.materials = materialsResult.data || [];
  state.summaries = summariesResult.data || [];
  $("#statMaterials").textContent = state.materials.length;
  $("#statSummaries").textContent = state.summaries.length;
}
function setView(view) {
  if (view === "admin" && state.profile?.role !== "admin") return notify("ამ განყოფილებაზე წვდომა არ გაქვს.");
  state.view = view;
  $$(".side-link").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  $("#sidebar").classList.remove("open");
  renderView(view);
}
$$(".side-link").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
$$("[data-goto]").forEach(button => button.addEventListener("click", () => setView(button.dataset.goto)));
$("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#logoutButton").addEventListener("click", async () => {
  if (supabase) await supabase.auth.signOut();
  state.user = null; state.profile = null;
  appView.hidden = true; authView.hidden = false;
  $("#authPassword").value = "";
  setAuthMode("login");
});

function renderView(view) {
  const titleMap = { dashboard:"მთავარი დაფა", materials:"სასწავლო მასალები", summaries:"ჩემი ჩანაწერები", admin:"ადმინის პანელი" };
  $("#pageTitle").textContent = titleMap[view] || "STUDIA";
  $("#topEyebrow").textContent = view === "admin" ? "ADMINISTRATION" : "YOUR STUDY SPACE";
  if (view === "dashboard") renderDashboard();
  else if (view === "materials") renderMaterials();
  else if (view === "summaries") renderSummaries();
  else if (view === "admin") renderAdmin();
}
function renderDashboard() {
  contentArea.innerHTML = `
    <section class="welcome-banner"><div><p class="eyebrow">შენი პროგრესის სივრცე</p><h1>სწავლა, რომელსაც სტრუქტურა აქვს.</h1><p>აირჩიე მასალა, შეინახე საკუთარი კონსპექტები და მოემზადე შუალედურისთვის.</p></div><div class="banner-symbol">S<span>.</span></div></section>
    <div class="stats-grid">
      <article class="stat-card"><span class="stat-icon">▤</span><span class="stat-label">ხელმისაწვდომი მასალა</span><strong>${state.materials.length}</strong><span class="stat-foot">ადმინისტრატორის მიერ დამატებული</span></article>
      <article class="stat-card"><span class="stat-icon">✳</span><span class="stat-label">ჩემი ჩანაწერები</span><strong>${state.summaries.length}</strong><span class="stat-foot">შენ მიერ შენახული კონსპექტები</span></article>
      <article class="stat-card"><span class="stat-icon">◷</span><span class="stat-label">სასწავლო სივრცე</span><strong>24/7</strong><span class="stat-foot">შენი მასალები ერთ ადგილას</span></article>
    </div>
    <section class="section-block"><div class="section-title"><div><p class="eyebrow">START HERE</p><h3>სწრაფი მოქმედებები</h3></div></div>
      <div class="action-grid"><button class="action-card" data-goto="materials"><span class="action-icon">▤</span><strong>მასალის ნახვა</strong><small>გახსენი სასწავლო მასალები</small><span class="card-arrow">↗</span></button><button class="action-card" data-goto="summaries"><span class="action-icon">✳</span><strong>ჩანაწერების ნახვა</strong><small>გადახედე შენს შენახულ ჩანაწერებს</small><span class="card-arrow">↗</span></button></div>
    </section>
    <section class="section-block"><div class="section-title"><div><p class="eyebrow">RECENT</p><h3>ბოლო ჩანაწერები</h3></div><button class="text-button" data-goto="summaries">ყველას ნახვა ↗</button></div>${recentSummariesHTML()}</section>`;
  $$("[data-goto]", contentArea).forEach(button => button.addEventListener("click", () => setView(button.dataset.goto)));
}
function recentSummariesHTML() {
  if (!state.summaries.length) return `<div class="empty-state">ჯერ კონსპექტი არ შეგიქმნია. გახსენი „სასწავლო მასალები“ და აირჩიე „ჩანაწერის შექმნა“.</div>`;
  return `<div class="recent-list">${state.summaries.slice(0,3).map(item => `<div class="recent-item"><div><strong>${escapeHTML(item.title)}</strong><small>${dateLabel(item.created_at)}</small></div><button data-summary-id="${item.id}">გახსნა ↗</button></div>`).join("")}</div>`;
}
function renderMaterials() {
  contentArea.innerHTML = `
    <div class="page-heading"><div><p class="eyebrow">LIBRARY / MATERIALS</p><h3>სასწავლო მასალები</h3><p>აქ გამოჩნდება ადმინისტრატორის მიერ ატვირთული მასალები.</p></div></div>
    <div class="toolbar"><input id="materialSearch" class="search-input" placeholder="მოძებნე სათაურით ან აღწერით…" aria-label="მასალების ძიება"><span class="tag">${state.materials.length} მასალა</span></div>
    <div class="material-grid" id="materialGrid">${materialCardsHTML(state.materials)}</div>`;
  $("#materialSearch").addEventListener("input", event => {
    const q = event.target.value.toLocaleLowerCase("ka");
    const filtered = state.materials.filter(m => `${m.title} ${m.description || ""} ${m.category || ""}`.toLocaleLowerCase("ka").includes(q));
    $("#materialGrid").innerHTML = materialCardsHTML(filtered);
    attachMaterialActions();
  });
  attachMaterialActions();
}
function materialCardsHTML(items) {
  if (!items.length) return `<div class="empty-state">მასალა ჯერ არ დამატებულა. ადმინისტრატორს შეუძლია PDF, TXT ან MD ფაილის ატვირთვა.</div>`;
  return items.map(m => `<article class="material-card">
    <div class="material-card-top"><div class="file-icon">${escapeHTML((m.filename.split(".").pop() || "FILE").toUpperCase().slice(0,4))}</div><span class="tag">${escapeHTML(m.category || "სასწავლო")}</span></div>
    <h4>${escapeHTML(m.title)}</h4><p>${escapeHTML(m.description || "აღწერა დამატებული არ არის.")}</p><p style="margin-top:8px">${escapeHTML(m.filename)} · ${dateLabel(m.created_at)}</p>
    <div class="material-actions"><button class="outline-button" data-open-material="${m.id}">ფაილის გახსნა ↗</button><button class="gold-button" data-create-note="${m.id}">ჩანაწერის შექმნა ✎</button></div>
    </article>`).join("");
}
function attachMaterialActions() {
  $$("[data-open-material]").forEach(button => button.addEventListener("click", () => openMaterial(button.dataset.openMaterial)));
  $$("[data-create-note]").forEach(button => button.addEventListener("click", () => { setView("summaries"); const material = state.materials.find(m => m.id === button.dataset.createNote); if (material && $("#noteMaterial")) $("#noteMaterial").value = material.id; }));
}
async function openMaterial(id) {
  const material = state.materials.find(item => item.id === id);
  if (!material) return;
  const { data, error } = await supabase.storage.from("materials").createSignedUrl(material.storage_path, 120);
  if (error) return notify("ფაილის გახსნა ვერ მოხერხდა: " + error.message);
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}
function renderSummaries() {
  const materialOptions = state.materials.map(m => `<option value="${m.id}">${escapeHTML(m.title)}</option>`).join("");
  contentArea.innerHTML = `
    <div class="page-heading"><div><p class="eyebrow">YOUR KNOWLEDGE BASE</p><h3>ჩემი ჩანაწერები</h3><p>შექმენი, შეინახე და ნებისმიერ დროს გადახედე საკუთარ კონსპექტებს.</p></div></div>
    <div class="summary-layout">
      <section class="panel"><h4>ახალი ჩანაწერი</h4><p class="panel-note">ჩაწერე შენივე სიტყვებით მნიშვნელოვანი საკითხები და განმარტებები.</p>
        <form id="noteForm" class="upload-form">
          <label class="wide">სათაური<input class="field-input" id="noteTitle" required maxlength="160" placeholder="მაგ. საქართველოს ისტორია — ძირითადი თარიღები"></label>
          <label class="wide">დაკავშირებული მასალა<select class="field-select" id="noteMaterial"><option value="">არჩევითი</option>${materialOptions}</select></label>
          <label class="wide">ჩანაწერი<textarea class="field-textarea" id="noteContent" required maxlength="30000" rows="8" placeholder="ჩაწერე შენი კონსპექტი აქ…"></textarea></label>
          <div class="wide"><button class="gold-button" type="submit" id="noteSave">ჩანაწერის შენახვა ✓</button></div>
          <p class="status-message wide" id="noteStatus" role="status"></p>
        </form>
      </section>
      <section class="panel"><h4>შენახული ჩანაწერები</h4><p class="panel-note">ჩანაწერები შენს ანგარიშზე ინახება.</p>
        ${state.summaries.length ? `<div class="recent-list">${state.summaries.map(n => `<div class="recent-item"><div><strong>${escapeHTML(n.title)}</strong><small>${dateLabel(n.created_at)}</small></div><button data-show-summary="${n.id}">გახსნა ↗</button><button class="danger-button" data-delete-note="${n.id}">წაშლა</button></div>`).join("")}</div><article class="panel" style="margin-top:16px"><h4 id="summaryTitle">აირჩიე ჩანაწერი</h4><div id="summaryContent" class="summary-output">შენახული ჩანაწერის სანახავად დააჭირე „გახსნა“.</div><div style="margin-top:15px"><button class="outline-button" id="copySummary">კოპირება ⧉</button></div></article>` : `<div class="summary-empty">ჯერ ჩანაწერი არ გაქვს. შექმენი პირველი ჩანაწერი ფორმის საშუალებით.</div>`}
      </section>
    </div>`;
  $("#noteForm").addEventListener("submit", saveNote);
  $$("[data-show-summary]").forEach(button => button.addEventListener("click", () => {
    const note = state.summaries.find(item => item.id === button.dataset.showSummary);
    if (note) { $("#summaryTitle").textContent = note.title; $("#summaryContent").textContent = note.content; }
  }));
  $$("[data-delete-note]").forEach(button => button.addEventListener("click", () => deleteNote(button.dataset.deleteNote)));
  $("#copySummary")?.addEventListener("click", async () => {
    const text = $("#summaryContent")?.textContent || "";
    try { await navigator.clipboard.writeText(text); notify("ჩანაწერი დაკოპირდა."); }
    catch { notify("კოპირება ვერ მოხერხდა — მონიშნე ტექსტი და დააკოპირე."); }
  });
}
async function saveNote(event) {
  event.preventDefault();
  const status = $("#noteStatus"), button = $("#noteSave");
  button.disabled = true; button.textContent = "ინახება…"; status.textContent = "";
  try {
    const { error } = await supabase.from("summaries").insert({
      user_id: state.user.id,
      material_id: $("#noteMaterial").value || null,
      title: $("#noteTitle").value.trim(),
      content: $("#noteContent").value.trim()
    });
    if (error) throw error;
    await refreshData(); renderSummaries(); notify("ჩანაწერი შენახულია.");
  } catch (error) {
    status.textContent = "ვერ შეინახა: " + friendlyError(error);
    button.disabled = false; button.textContent = "ჩანაწერის შენახვა ✓";
  }
}
async function deleteNote(id) {
  if (!confirm("წავშალოთ ეს ჩანაწერი?")) return;
  const { error } = await supabase.from("summaries").delete().eq("id", id);
  if (error) return notify("წაშლა ვერ მოხერხდა: " + friendlyError(error), 6000);
  await refreshData(); renderSummaries(); notify("ჩანაწერი წაიშალა.");
}
function renderAdmin() {
  if (state.profile?.role !== "admin") return setView("dashboard");
  contentArea.innerHTML = `
    <div class="page-heading"><div><p class="eyebrow">ADMINISTRATION / PRIVATE</p><h3>ადმინის პანელი</h3><p>მართე სასწავლო მასალები და ნახე რეგისტრირებული მომხმარებლები.</p></div></div>
    <div class="admin-layout">
      <section class="panel"><h4>ახალი სასწავლო მასალის დამატება</h4><p class="panel-note">მხარდაჭერილია PDF, TXT და Markdown (.md). კონსპექტის სიზუსტისთვის ატვირთე მკაფიო, ტექსტზე დაფუძნებული ფაილი.</p>
        <form id="uploadForm" class="upload-form">
          <label>მასალის სათაური<input class="field-input" id="uploadTitle" required maxlength="160" placeholder="მაგ. საქართველოს ისტორია — თავი 3"></label>
          <label>კატეგორია<select class="field-select" id="uploadCategory"><option>შუალედური</option><option>ლექცია</option><option>სემინარი</option><option>საგამოცდო საკითხები</option><option>სხვა</option></select></label>
          <label class="wide">მოკლე აღწერა<textarea class="field-textarea" id="uploadDescription" maxlength="1000" placeholder="რა თემებს მოიცავს მასალა?"></textarea></label>
          <label class="wide">ფაილი<div class="file-drop">აირჩიე ფაილი კომპიუტერიდან<input id="uploadFile" type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" required></div></label>
          <div class="wide"><button class="gold-button" type="submit" id="uploadSubmit">მასალის ატვირთვა ↑</button></div>
          <p class="status-message wide" id="uploadStatus" role="status"></p>
        </form>
      </section>
      <section class="panel"><h4>ატვირთული მასალები</h4><p class="panel-note">მასალები ხელმისაწვდომია შესული მომხმარებლებისთვის.</p><div id="adminMaterialsTable">${adminMaterialsHTML()}</div></section>
      <section class="panel"><h4>რეგისტრირებული მომხმარებლები</h4><p class="panel-note">აქ ჩანს ანგარიშის შექმნისას მოწოდებული სახელი, გვარი და ელფოსტა.</p><div id="usersTable"><div class="loading-line">მომხმარებლები იტვირთება…</div></div></section>
    </div>`;
  $("#uploadForm").addEventListener("submit", uploadMaterial);
  attachDeleteActions();
  loadUsers();
}
function adminMaterialsHTML() {
  if (!state.materials.length) return `<div class="empty-state">მასალა ჯერ არ ატვირთულა.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>მასალა</th><th>კატეგორია</th><th>მოქმედება</th></tr></thead><tbody>${state.materials.map(m => `<tr><td><strong>${escapeHTML(m.title)}</strong><div class="user-email">${escapeHTML(m.filename)}</div></td><td>${escapeHTML(m.category || "—")}</td><td><button class="danger-button" data-delete-material="${m.id}">წაშლა</button></td></tr>`).join("")}</tbody></table></div>`;
}
function attachDeleteActions() {
  $$("[data-delete-material]").forEach(button => button.addEventListener("click", async () => {
    const material = state.materials.find(m => m.id === button.dataset.deleteMaterial);
    if (!material || !confirm(`წავშალოთ „${material.title}“? მასალასთან დაკავშირებული ფაილიც წაიშლება.`)) return;
    try {
      const { error: storageError } = await supabase.storage.from("materials").remove([material.storage_path]);
      if (storageError) throw storageError;
      const { error } = await supabase.from("materials").delete().eq("id", material.id);
      if (error) throw error;
      await refreshData(); renderAdmin(); notify("მასალა წაიშალა.");
    } catch (error) { notify("წაშლა ვერ მოხერხდა: " + error.message); }
  }));
}
async function uploadMaterial(event) {
  event.preventDefault();
  const file = $("#uploadFile").files[0];
  const status = $("#uploadStatus");
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) { status.textContent = "ფაილის ზომა 20 MB-ს არ უნდა აღემატებოდეს."; return; }
  const allowed = [".pdf", ".txt", ".md"];
  if (!allowed.some(ext => file.name.toLowerCase().endsWith(ext))) { status.textContent = "ატვირთე მხოლოდ PDF, TXT ან MD ფაილი."; return; }
  const submit = $("#uploadSubmit");
  submit.disabled = true; submit.textContent = "იტვირთება…"; status.textContent = "";
  const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const storagePath = `${crypto.randomUUID()}-${safeName}`;
  try {
    const { error: uploadError } = await supabase.storage.from("materials").upload(storagePath, file, { upsert: false, contentType: file.type || "application/octet-stream" });
    if (uploadError) throw uploadError;
    const { error } = await supabase.from("materials").insert({
      title: $("#uploadTitle").value.trim(),
      description: $("#uploadDescription").value.trim(),
      category: $("#uploadCategory").value,
      filename: file.name,
      storage_path: storagePath,
      uploaded_by: state.user.id
    });
    if (error) {
      await supabase.storage.from("materials").remove([storagePath]);
      throw error;
    }
    await refreshData(); renderAdmin(); notify("მასალა წარმატებით აიტვირთა.");
  } catch (error) {
    status.textContent = "შეცდომა: " + friendlyError(error);
    submit.disabled = false; submit.textContent = "მასალის ატვირთვა ↑";
  }
}
async function loadUsers() {
  const container = $("#usersTable");
  if (!container) return;
  const { data, error } = await supabase.from("profiles").select("id,first_name,last_name,email,role,created_at").order("created_at", { ascending: false }).limit(500);
  if (error) { container.innerHTML = `<div class="empty-state">მომხმარებლების სია ვერ ჩაიტვირთა: ${escapeHTML(error.message)}</div>`; return; }
  state.users = data || [];
  if (!state.users.length) { container.innerHTML = `<div class="empty-state">რეგისტრირებული მომხმარებელი ჯერ არ არის.</div>`; return; }
  container.innerHTML = `<div class="table-wrap"><table><thead><tr><th>მომხმარებელი</th><th>როლი</th><th>რეგისტრაცია</th></tr></thead><tbody>${state.users.map(user => `<tr><td><div class="user-name">${escapeHTML(`${user.first_name || ""} ${user.last_name || ""}`.trim() || "სახელი არაა მითითებული")}</div><div class="user-email">${escapeHTML(user.email || "")}</div></td><td><span class="tag">${user.role === "admin" ? "ადმინი" : "სტუდენტი"}</span></td><td>${dateLabel(user.created_at)}</td></tr>`).join("")}</tbody></table></div>`;
}

if (!CONFIGURED) {
  renderNotConfigured();
} else {
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session?.user) {
      state.user = session.user;
      try { await loadApp(); } catch (error) { notify("მონაცემების ჩატვირთვა ვერ მოხერხდა: " + error.message, 6000); }
    }
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      state.user = null; state.profile = null;
      appView.hidden = true; authView.hidden = false;
    }
  });
}
