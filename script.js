const firebaseConfig = {
  apiKey: "AIzaSyACPv96U7A3S7zKvmmqLPsja1-T0LqJyAw",
  authDomain: "myfirstgame-e2f1f.firebaseapp.com",
  projectId: "myfirstgame-e2f1f",
  databaseURL: "https://myfirstgame-e2f1f-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "myfirstgame-e2f1f.firebasestorage.app",
  messagingSenderId: "490485495098",
  appId: "1:490485495098:web:f5212fd9270c4b40794c03",
  measurementId: "G-4VQYD12P1T"
};

let rankingRef = null;
let isFirebaseReady = false;

if (window.firebase) {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const database = firebase.database();
  rankingRef = database.ref("rankings");
  isFirebaseReady = true;
}

let target = Math.floor(Math.random() * 100) + 1;
let attempts = 0;
let chancesLeft = 10;
let gameStarted = false;
let isHandlingGuess = false;
let lastSpeakAt = 0;
let selectedAvatar = "🐶";
let playerProfile = { nickname: "", gender: "male", avatar: "🐶" };

const registerModal = document.getElementById("registerModal");
const gameContainer = document.getElementById("gameContainer");
const enterGameBtn = document.getElementById("enterGameBtn");
const nicknameInput = document.getElementById("nicknameInput");
const genderSelect = document.getElementById("genderSelect");
const welcomeBar = document.getElementById("welcomeBar");
const avatarButtons = document.querySelectorAll(".avatar-btn");
const guessInput = document.getElementById("guessInput");
const submitBtn = document.getElementById("submitBtn");
const result = document.getElementById("result");
const count = document.getElementById("count");
const left = document.getElementById("left");
const historyList = document.getElementById("historyList");
const leaderboard = document.getElementById("leaderboard");
const leaderboardTip = document.getElementById("leaderboardTip");
const leaderboardList = document.getElementById("leaderboardList");

function showMessage(text, className) {
  result.textContent = text;
  result.className = className;
}

function setControlsEnabled(enabled) {
  guessInput.disabled = !enabled;
  submitBtn.disabled = !enabled;
  submitBtn.style.opacity = enabled ? "1" : "0.65";
  submitBtn.style.cursor = enabled ? "pointer" : "not-allowed";
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    return;
  }

  const now = Date.now();
  if (now - lastSpeakAt < 120) {
    return;
  }

  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
    lastSpeakAt = now;
  } catch (_error) {
    // ignore speech errors
  }
}

function unlockSpeechInUserGesture() {
  if (!("speechSynthesis" in window)) {
    return;
  }
  try {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    window.speechSynthesis.resume();
  } catch (_error) {
    // ignore activation errors
  }
}

function addHistory(value) {
  const item = document.createElement("li");
  item.textContent = `第 ${attempts} 次：${value}`;
  historyList.appendChild(item);
}

function renderLeaderboard(items) {
  leaderboardList.innerHTML = "";
  if (items.length === 0) {
    leaderboardTip.style.display = "block";
    leaderboardTip.textContent = "暂无排行数据，快来成为第一名！";
    return;
  }

  leaderboardTip.style.display = "none";
  items.forEach((item, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${item.avatar} ${item.nickname} - ${item.attempts} 次`;
    leaderboardList.appendChild(li);
  });
}

function subscribeLeaderboard() {
  leaderboard.classList.remove("game-hidden");
  leaderboardTip.style.display = "block";
  leaderboardTip.textContent = "正在加载排行榜...";

  if (!isFirebaseReady || !rankingRef) {
    leaderboardTip.textContent = "排行榜服务暂不可用（网络或 CDN 受限），游戏可离线进行。";
    leaderboardList.innerHTML = "";
    return;
  }

  let resolved = false;

  setTimeout(() => {
    if (!resolved && leaderboardTip.textContent === "正在加载排行榜...") {
      leaderboardTip.textContent = "排行榜连接超时，请检查 Firebase Realtime Database 是否已启用及规则是否允许读取。";
    }
  }, 5000);

  rankingRef.orderByChild("attempts").limitToFirst(10).on(
    "value",
    (snapshot) => {
      resolved = true;
      const rows = [];
      snapshot.forEach((child) => {
        rows.push(child.val());
      });
      renderLeaderboard(rows);
    },
    () => {
      leaderboardTip.style.display = "block";
      leaderboardTip.textContent = "排行榜加载失败，请检查网络或 Firebase 规则。";
      leaderboardList.innerHTML = "";
    }
  );
}

function saveScoreToRanking() {
  if (!isFirebaseReady || !rankingRef) {
    return Promise.resolve();
  }

  return rankingRef.push({
    nickname: playerProfile.nickname,
    avatar: playerProfile.avatar,
    attempts,
    timestamp: Date.now()
  });
}

function getGenderIcon(value) {
  return value === "female" ? "♀️" : "♂️";
}

function endGame() {
  setControlsEnabled(false);
}

function handleGuess() {
  if (isHandlingGuess) {
    return;
  }
  isHandlingGuess = true;

  // Must be at top of submit handler for mobile autoplay policy.
  unlockSpeechInUserGesture();

  if (!gameStarted) {
    showMessage("请先完成玩家注册后再开始游戏。", "hint-error");
    isHandlingGuess = false;
    return;
  }

  if (chancesLeft <= 0) {
    isHandlingGuess = false;
    return;
  }

  const value = Number(guessInput.value);
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    showMessage("请输入 1 到 100 的整数。", "hint-error");
    isHandlingGuess = false;
    return;
  }

  attempts += 1;
  count.textContent = String(attempts);
  addHistory(value);

  if (value === target) {
    showMessage(`恭喜你猜对了！答案就是 ${target}。`, "hint-win");
    speak("恭喜你猜对了");
    document.body.style.background = "linear-gradient(140deg, #14532d, #166534 45%, #064e3b)";
    endGame();
    saveScoreToRanking().catch(() => null);
    isHandlingGuess = false;
    return;
  }

  chancesLeft -= 1;
  left.textContent = String(chancesLeft);

  if (chancesLeft <= 0) {
    showMessage(`游戏结束，正确数字是 ${target}。`, "hint-error");
    endGame();
    isHandlingGuess = false;
    return;
  }

  if (value > target) {
    showMessage("猜大了！", "hint-high");
    speak("大了");
  } else {
    showMessage("猜小了！", "hint-low");
    speak("小了");
  }

  guessInput.focus();
  guessInput.select();
  isHandlingGuess = false;
}

function persistPlayerProfile() {
  localStorage.setItem("myFirstGamePlayer", JSON.stringify(playerProfile));
}

function applyAvatarSelection(avatar) {
  selectedAvatar = avatar;
  avatarButtons.forEach((button) => {
    const isSelected = button.dataset.avatar === avatar;
    button.classList.toggle("selected", isSelected);
  });
}

function startGame(profile) {
  playerProfile = profile;
  persistPlayerProfile();
  gameStarted = true;
  unlockSpeechInUserGesture();
  setControlsEnabled(true);
  registerModal.style.display = "none";
  gameContainer.classList.remove("game-hidden");
  welcomeBar.textContent = `欢迎你，${playerProfile.nickname} ${getGenderIcon(playerProfile.gender)} ${playerProfile.avatar}`;
  showMessage("游戏开始！请输入 1 到 100 的数字。", "");
  guessInput.focus();
}

function tryAutoLogin() {
  const raw = localStorage.getItem("myFirstGamePlayer");
  if (!raw) {
    return false;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.nickname || !parsed.avatar || !parsed.gender) {
      return false;
    }
    nicknameInput.value = parsed.nickname;
    genderSelect.value = parsed.gender;
    applyAvatarSelection(parsed.avatar);
    startGame(parsed);
    return true;
  } catch (_error) {
    return false;
  }
}

setControlsEnabled(false);
subscribeLeaderboard();

avatarButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyAvatarSelection(button.dataset.avatar || "🐶");
  });
});

enterGameBtn.addEventListener("click", () => {
  unlockSpeechInUserGesture();
  const nickname = nicknameInput.value.trim();
  if (!nickname) {
    showMessage("请输入昵称后再进入游戏。", "hint-error");
    return;
  }

  startGame({
    nickname,
    gender: genderSelect.value,
    avatar: selectedAvatar
  });
});

submitBtn.addEventListener("click", handleGuess);
guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleGuess();
  }
});

tryAutoLogin();
