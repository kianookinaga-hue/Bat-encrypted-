const PASSPHRASE = "vengeance";

let cryptoKey = null;
let memory = [];

const login = document.getElementById("login");
const boot = document.getElementById("boot");
const os = document.getElementById("os");
const bootText = document.getElementById("bootText");
const loginStatus = document.getElementById("loginStatus");

document.getElementById("unlockBtn").onclick = unlock;

/* ---------- CRYPTO ---------- */

async function deriveKey(pass) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(pass),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("batcomputer"),
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoded
  );
  localStorage.setItem("bat_iv", JSON.stringify(Array.from(iv)));
  localStorage.setItem("bat_data", btoa(String.fromCharCode(...new Uint8Array(cipher))));
}

async function decryptData() {
  const iv = new Uint8Array(JSON.parse(localStorage.getItem("bat_iv")));
  const data = Uint8Array.from(atob(localStorage.getItem("bat_data")), c => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

/* ---------- LOGIN ---------- */

async function unlock() {
  const pass = document.getElementById("password").value;
  if (pass !== PASSPHRASE) {
    loginStatus.textContent = "ACCESS DENIED";
    return;
  }

  cryptoKey = await deriveKey(pass);

  if (localStorage.getItem("bat_data")) {
    try {
      memory = await decryptData();
    } catch {
      memory = [];
    }
  }

  login.classList.add("hidden");
  startBoot();
}

/* ---------- BOOT ---------- */

function startBoot() {
  boot.classList.remove("hidden");
  const lines = [
    "VERIFYING CREDENTIALS",
    "DECRYPTING MEMORY",
    "LOADING MODULES",
    "SYSTEM STABLE",
    "ACCESS GRANTED"
  ];
  let i = 0;
  bootText.textContent = "";
  const interval = setInterval(() => {
    bootText.textContent += lines[i] + "\n";
    i++;
    if (i === lines.length) {
      clearInterval(interval);
      setTimeout(() => {
        boot.classList.add("hidden");
        os.classList.remove("hidden");
        render();
      }, 600);
    }
  }, 500);
}

/* ---------- DATA ---------- */

function setCase() {
  const c = document.getElementById("caseName").value || "UNASSIGNED";
  localStorage.setItem("activeCase", c);
  render();
}

async function saveEntry() {
  const text = entryText.value.trim();
  if (!text) return;

  memory.unshift({
    type: entryType.value,
    text,
    tags: tags.value,
    time: new Date().toLocaleString(),
    case: localStorage.getItem("activeCase")
  });

  await encryptData(memory);
  entryText.value = "";
  tags.value = "";
  render();
}

async function saveDiscipline() {
  const text = disciplineInput.value.trim();
  if (!text) return;

  memory.unshift({
    type: "discipline",
    text,
    time: new Date().toLocaleString(),
    case: localStorage.getItem("activeCase")
  });

  await encryptData(memory);
  disciplineInput.value = "";
  render();
}

function render() {
  const active = localStorage.getItem("activeCase") || "UNASSIGNED";
  document.getElementById("activeCase").textContent = "ACTIVE: " + active;
  timeline.innerHTML = "";
  disciplineLog.innerHTML = "";

  memory.filter(e => e.case === active).forEach(e => {
    const div = document.createElement("div");
    div.className = "log";
    div.textContent = `[${e.type.toUpperCase()}] ${e.time}\n${e.text}`;
    timeline.appendChild(div);

    if (e.type === "discipline") {
      const d = document.createElement("div");
      d.className = "log";
      d.textContent = `${e.time} – ${e.text}`;
      disciplineLog.appendChild(d);
    }
  });
}
