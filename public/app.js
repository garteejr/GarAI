// === CONFIG ===
const API_URL = "/api/chat";

// === ELEMENTS ===
const chatbox = document.getElementById("chatbox");
const welcomeText = document.getElementById("welcomeText");
const inputBar = document.getElementById("inputBar");
const input = document.getElementById("userInput");
const micBtn = document.getElementById("micBtn");
const sendBtn = document.getElementById("sendBtn");
const chatList = document.getElementById("chatHistory");
const newChatBtn = document.getElementById("newChatBtn");
const toggleHistoryBtn = document.getElementById("toggleHistoryBtn");
const sidebar = document.querySelector(".sidebar");
const overlay = document.getElementById("overlay");
const hamburgerBtn = document.getElementById("hamburgerBtn");

// === STATE ===
let chatId = sessionStorage.getItem("activeChat") || Date.now().toString();
let chatHistory = [];
let chatNames = JSON.parse(localStorage.getItem("chatNames") || "{}"); 
let mode = "chat"; // chat | image
try {
  chatHistory = JSON.parse(sessionStorage.getItem(chatId)) || [];
} catch {
  chatHistory = [];
}

sessionStorage.setItem("activeChat", chatId);

// === HELPERS ===
function saveChat() {
  sessionStorage.setItem(chatId, JSON.stringify(chatHistory));
  updateChatList();
}

function scrollBottom(immediate = false) {
  if (!chatbox) return;
  setTimeout(() => {
    chatbox.scrollTo({
      top: chatbox.scrollHeight,
      behavior: immediate ? "auto" : "smooth",
    });
  }, 80);
}

function addMessage(role, text, scroll = true) {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.innerHTML = `<div class="bubble markdown-body">${marked.parse(text || "")}</div>`;
  chatbox.appendChild(div);
  if (scroll) scrollBottom();
}

// === CHAT LIST ===
function updateChatList() {
  if (!chatList) return;
  chatList.innerHTML = "";
  const keys = [];

  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (!k || k === "activeChat") continue;
    keys.push(k);
  }

  keys.sort((a, b) => Number(b) - Number(a));

  keys.forEach((key) => {
    const item = document.createElement("div");
    item.className = "chat-item";
    item.dataset.id = key;

    const label = document.createElement("span");
    label.className = "chat-title";

    let title = chatNames[key] || "Chat " + key;
    try {
      const arr = JSON.parse(sessionStorage.getItem(key));
      if (Array.isArray(arr) && arr.length && !chatNames[key]) {
        title =
          arr.find((m) => m.role === "user")?.content?.slice(0, 36) ||
          arr[0].content?.slice(0, 36) ||
          key;
      }
    } catch {}

    label.textContent = title;

    const renameBtn = document.createElement("button");
    renameBtn.className = "rename-btn";
    renameBtn.title = "Rename";
    renameBtn.textContent = "✏️";

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "×";

    item.append(label, renameBtn, del);
    chatList.appendChild(item);

    item.addEventListener("click", () => loadChat(key));

    // === DELETE MODAL ===
    del.addEventListener("click", (ev) => {
      ev.stopPropagation();

      const modal = document.getElementById("deleteModal");
      const cancelBtn = document.getElementById("cancelDelete");
      const confirmBtn = document.getElementById("confirmDelete");

      modal.classList.add("show");

      const closeModal = () => {
        modal.classList.remove("show");
      };

      // klik batal atau luar modal → tutup
      cancelBtn.onclick = closeModal;
      modal.onclick = (e) => {
        if (e.target === modal) closeModal();
      };

      confirmBtn.onclick = () => {
        sessionStorage.removeItem(key);
        delete chatNames[key]; // ✅ FIXED — variabel sudah ada
        localStorage.setItem("chatNames", JSON.stringify(chatNames));
        if (key === chatId) newChat();
        updateChatList();
        closeModal();
      };
    });
  });
}

// === RENAME CHAT ===
chatList.addEventListener("click", (e) => {
  const item = e.target.closest(".chat-item");
  if (!item) return;

  const renameBtn = e.target.closest(".rename-btn");
  if (!renameBtn) return;

  const title = item.querySelector(".chat-title");
  const oldName = title.textContent;

  const inputEl = document.createElement("input");
  inputEl.type = "text";
  inputEl.value = oldName;
  inputEl.className = "rename-input";
  title.replaceWith(inputEl);
  inputEl.focus();

  const saveName = () => {
    const newName = inputEl.value.trim() || oldName;
    const span = document.createElement("span");
    span.className = "chat-title";
    span.textContent = newName;
    inputEl.replaceWith(span);

    const chatId = item.dataset.id;
    if (chatId) {
      chatNames[chatId] = newName;
      localStorage.setItem("chatNames", JSON.stringify(chatNames));
    }

    updateChatList();
  };

  inputEl.addEventListener("blur", saveName);

  inputEl.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      ev.stopPropagation();
      inputEl.blur();
    } else if (ev.key === "Escape") {
      inputEl.value = oldName;
      inputEl.blur();
    }
  });
});

// === LOAD / NEW CHAT ===
function loadChat(id) {
  chatId = id;
  sessionStorage.setItem("activeChat", chatId);

  try {
    chatHistory = JSON.parse(sessionStorage.getItem(id)) || [];
  } catch {
    chatHistory = [];
  }

  chatbox.innerHTML = "";
  chatHistory.forEach((m) => addMessage(m.role, m.content, false));

  welcomeText.style.display = "none";
  chatbox.classList.add("active");
  inputBar.classList.add("fixed");

  scrollBottom(true);
}

function newChat() {
  chatId = Date.now().toString();
  chatHistory = [];
  sessionStorage.setItem(chatId, JSON.stringify([]));
  sessionStorage.setItem("activeChat", chatId);

  chatbox.innerHTML = "";
  welcomeText.style.display = "block";
  chatbox.classList.remove("active");
  inputBar.classList.remove("fixed");

  updateChatList();
}

// === SEND MESSAGE ===
async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;

  // Aktivasi chat area pertama kali
  if (!chatbox.classList.contains("active")) {
    welcomeText.style.display = "none";
    chatbox.classList.add("active");
    inputBar.classList.add("fixed");
  }

  addMessage("user", message);
  chatHistory.push({ role: "user", content: message });
  saveChat();
  input.value = "";

  // Bot typing bubble
  const typingDiv = document.createElement("div");
  typingDiv.className = "message bot";
  typingDiv.innerHTML = `<div class="bubble"><span class="typing">GarAI sedang mengetik...</span></div>`;
  chatbox.appendChild(typingDiv);
  scrollBottom();

 
//   MODE: GENERATE IMAGE
if (mode === "image") {
  try {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
     prompt: message,
     size: currentSize,
     style: currentStyle
   }) 
});

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      console.error("Failed to parse JSON from image API:", e);
    }

    if (!res.ok) {
      console.error("Image API error (status " + res.status + "):", data);
      typingDiv.querySelector(".bubble").innerHTML =
        "⚠️ Gagal membuat gambar (server error).";
      return;
    }

    if (!data || !data.image) {
      console.error("Image API invalid response:", data);
      typingDiv.querySelector(".bubble").innerHTML =
        "⚠️ Gagal membuat gambar.";
      return;
    }

    typingDiv.querySelector(".bubble").innerHTML =
      "Gambar berhasil dibuat:<br/><br/>";

    const img = document.createElement("img");
img.src = data.image;
img.className = "chat-image"; 
img.style.maxWidth = "100%";
img.style.borderRadius = "12px";
img.style.marginTop = "10px";
typingDiv.querySelector(".bubble").appendChild(img);

    typingDiv.querySelector(".bubble").appendChild(img);

    chatHistory.push({ role: "bot", content: "[Gambar]" });
    saveChat();
    scrollBottom();
    return;
  } catch (err) {
    typingDiv.querySelector(".bubble").innerHTML =
      "⚠️ Terjadi kesalahan saat generate gambar.";
    console.error("Image mode exception:", err);
    return;
  }
}

  //       MODE NORMAL (CHAT)
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: chatHistory }),
    });

    const data = await res.json();
    const reply = data.reply || "⚠️ Tidak ada respon dari server.";

    typingDiv.querySelector(".bubble").innerHTML = marked.parse(reply);

    chatHistory.push({ role: "bot", content: reply });
    saveChat();
  } catch (err) {
    typingDiv.querySelector(".bubble").innerHTML =
      "⚠️ Gagal terhubung ke server lokal.";
    console.error("Fetch error:", err);
  }

  scrollBottom();
}


// === VOICE ===
let recognition = null;
let isListening = false;

function setupSpeech() {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) {
    micBtn.style.opacity = 0.5;
    micBtn.title = "Voice tidak didukung di browser ini";
    return;
  }

  recognition = new Speech();
  recognition.lang = "id-ID";

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add("listening");
  };
  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("listening");
  };
  recognition.onerror = () => {
    isListening = false;
    micBtn.classList.remove("listening");
  };
  recognition.onresult = (ev) => {
    const transcript = ev.results[0][0].transcript;
    input.value = transcript;
    sendMessage();
  };

  micBtn.addEventListener("click", () => {
    if (!recognition) return;
    if (isListening) recognition.stop();
    else recognition.start();
  });
}
// === SPLASH TEXT ANIMASI HIDUP ===
const loadingTexts = [
  "🔹 Menginisialisasi otak digital...",
  "🔸 Menghubungkan ke server GarAI...",
  "🔹 Menyiapkan kecerdasan...",
  "🔸 Menghangatkan neuron virtual...",
  "✨ Hampir siap untuk berpikir..."
];

const loadingText = document.getElementById("loadingText");
let idx = 0;
let splashInterval;

if (loadingText) {
  loadingText.style.opacity = 0;

  const changeText = () => {
    loadingText.style.opacity = 0; // fade out
    setTimeout(() => {
      loadingText.textContent = loadingTexts[idx];
      loadingText.style.opacity = 1; // fade in
      idx = (idx + 1) % loadingTexts.length;
    }, 500);
  };

  changeText(); // pertama kali langsung tampil
  splashInterval = setInterval(changeText, 2200); // tiap 2.2 detik ganti teks

  // biar splash-nya terasa lebih lama & elegan (6 detik)
  setTimeout(() => {
    clearInterval(splashInterval);
    const splash = document.getElementById("splashScreen");
    splash?.classList.add("hidden");
  }, 60000);
}


// === SPLASH + INIT ===
window.addEventListener("load", () => {
  const splash = document.getElementById("splashScreen");
  if (splash) setTimeout(() => splash.classList.add("hidden"), 60000);
  updateChatList();
  setupSpeech();
  if (chatHistory.length > 0) loadChat(chatId);
});

window.addEventListener("load", () => {
  const quotes = [
    "“Kreativitas adalah kecerdasan yang bersenang-senang.” — Albert Einstein",
    "“Setiap pertanyaan besar dimulai dari rasa penasaran.”",
    "“AI tidak menggantikan manusia, tapi membantu manusia menjadi lebih.”"
  ];
  if (chatbox.children.length === 0) {
    welcomeText.textContent = quotes[Math.floor(Math.random() * quotes.length)];
  }
});

// === EVENTS ===
sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});
newChatBtn.addEventListener("click", newChat);

// === SIDEBAR TOGGLE ===
hamburgerBtn?.addEventListener("click", () => {
  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");
});

overlay?.addEventListener("click", () => {
  sidebar.classList.remove("active");
  overlay.classList.remove("active");
});

// === DROPDOWN CHAT LIST ===
toggleHistoryBtn.addEventListener("click", () => {
  chatList.classList.toggle("active");
  toggleHistoryBtn.classList.toggle("active");
});

function showTyping() {
  const typingDiv = document.createElement("div");
  typingDiv.className = "message bot";
  typingDiv.innerHTML = `
    <div class="bubble">
      <span class="typing">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </span>
    </div>`;
  chatbox.appendChild(typingDiv);
  scrollBottom();
  return typingDiv;
}

// === TOGGLE MODE TERANG / GELAP ===
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

// Cek tema tersimpan
if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light");
  themeToggle.querySelector("span").textContent = "Mode Gelap";
  themeIcon.innerHTML = '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707M18.364 5.636l-.707.707M5.636 18.364l-.707-.707"/><circle cx="12" cy="12" r="5"/>';
}

themeToggle.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light");
  if (isLight) {
    localStorage.setItem("theme", "light");
    themeToggle.querySelector("span").textContent = "Mode Gelap";
    themeIcon.innerHTML = '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707M18.364 5.636l-.707.707M5.636 18.364l-.707-.707"/><circle cx="12" cy="12" r="5"/>';
  } else {
    localStorage.setItem("theme", "dark");
    themeToggle.querySelector("span").textContent = "Mode Terang";
    themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
});

collapseBtn?.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");

  if (sidebar.classList.contains("collapsed")) {
    inputBar.classList.add("no-sidebar");
    inputBar.classList.remove("with-sidebar");
  } else {
    inputBar.classList.add("with-sidebar");
    inputBar.classList.remove("no-sidebar");
  }
});

// === MODE IMAGE SETTINGS (GLOBAL) ===
let currentStyle = "realistic";
// kalau belum punya dropdown ukuran, kita kasih default saja
let currentSize = "1024x1024";

// Tampilkan / sembunyikan wrapper pengaturan gambar
function updateImageSettings() {
  const settings = document.getElementById("imageSettings");
  if (!settings) return;

  if (mode === "image") {
    settings.style.display = "flex";
  } else {
    settings.style.display = "none";
  }
}

// === MODE IMAGE TOGGLE ===
window.addEventListener("DOMContentLoaded", () => {
  const imgBtn = document.getElementById("imgBtn");

  if (!imgBtn) {
    console.error("❌ imgBtn tidak ditemukan di DOM!");
    return;
  }

  imgBtn.addEventListener("click", () => {
    mode = mode === "chat" ? "image" : "chat";

    input.placeholder =
      mode === "image"
        ? "Deskripsikan gambar yang ingin dibuat..."
        : "Tanyakan apa saja...";

    imgBtn.classList.toggle("active", mode === "image");

    // update tampilan panel image settings (kalau ada)
    updateImageSettings();
  });

  // Inisialisasi dropdown style setelah DOM siap
if (document.getElementById("styleDropdown")) {
  createDropdown("styleDropdown", (value) => {
    currentStyle = value;
    console.log("Style terpilih:", currentStyle);
  });
}

});

// FULLSCREEN IMAGE VIEWER
const modal = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImage");
const closeModal = document.getElementById("closeModal");

if (modal && modalImg && closeModal) {
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("chat-image")) {
      modal.style.display = "flex";
      modalImg.src = e.target.src;
    }
  });

  closeModal.onclick = () => {
    modal.style.display = "none";
  };

  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
} else {
  console.warn("Image modal elements not found");
}

// === SMART POSITION DROPDOWN (AUTO UP / DOWN) ===
function positionSmartDropdown(dropdown) {
  const rect = dropdown.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  // tinggi menu kira-kira
  const menuHeight = 220;

  if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
    dropdown.classList.add("drop-up");
  } else {
    dropdown.classList.remove("drop-up");
  }
}

// === DROPDOWN DENGAN AUTO POSITION ===
function createDropdown(id, callback) {
  const dropdown = document.getElementById(id);
  if (!dropdown) return console.warn("Dropdown not found:", id);

  const selected = dropdown.querySelector(".gpt-dropdown-selected");
  const menu = dropdown.querySelector(".gpt-dropdown-menu");

  if (!selected || !menu) {
    console.warn("Dropdown structure invalid for:", id);
    return;
  }

  // buka dropdown
  selected.addEventListener("click", (e) => {
    e.stopPropagation();

    // cek posisi → menentukan drop-up atau drop-down
    positionSmartDropdown(dropdown);

    dropdown.classList.toggle("open");
  });

  // memilih item
  menu.querySelectorAll("li").forEach((li) => {
    li.addEventListener("click", (e) => {
      e.stopPropagation();

      dropdown.classList.remove("open");

      const value = li.dataset.value;
      selected.querySelector("span").textContent = li.textContent;

      callback(value);
    });
  });

  // klik di luar → tutup
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) dropdown.classList.remove("open");
  });
}
