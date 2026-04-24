const target = Math.floor(Math.random() * 100) + 1;
let attempts = 0;
let chancesLeft = 10;
let gameStarted = false;
let audioUnlocked = false;

const startBtn = document.getElementById("startBtn");
const guessInput = document.getElementById("guessInput");
const submitBtn = document.getElementById("submitBtn");
const result = document.getElementById("result");
const count = document.getElementById("count");
const left = document.getElementById("left");
const historyList = document.getElementById("historyList");

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

function unlockSpeech() {
  if (!("speechSynthesis" in window)) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const unlockUtterance = new SpeechSynthesisUtterance(" ");
    unlockUtterance.lang = "zh-CN";
    unlockUtterance.volume = 0;
    window.speechSynthesis.speak(unlockUtterance);
    audioUnlocked = true;
    return true;
  } catch (_error) {
    return false;
  }
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    return;
  }

  if (!audioUnlocked) {
    unlockSpeech();
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 1;

  const voices = window.speechSynthesis.getVoices();
  const zhVoice = voices.find((voice) => voice.lang && voice.lang.toLowerCase().startsWith("zh"));
  if (zhVoice) {
    utterance.voice = zhVoice;
  }

  window.speechSynthesis.speak(utterance);
}

function endGame() {
  setControlsEnabled(false);
}

function addHistory(value) {
  const item = document.createElement("li");
  item.textContent = `第 ${attempts} 次：${value}`;
  historyList.appendChild(item);
}

function handleGuess() {
  unlockSpeech();

  if (!gameStarted) {
    showMessage("请先点击“开始游戏”以激活移动端声音。", "hint-error");
    return;
  }

  if (chancesLeft <= 0) {
    return;
  }

  const value = Number(guessInput.value);

  if (!Number.isInteger(value) || value < 1 || value > 100) {
    showMessage("请输入 1 到 100 的整数。", "hint-error");
    return;
  }

  attempts += 1;
  count.textContent = String(attempts);
  addHistory(value);

  if (value === target) {
    showMessage(`恭喜你猜对了！答案就是 ${target}。`, "hint-win");
    speak("恭喜你猜对了");
    document.body.style.background =
      "linear-gradient(140deg, #14532d, #166534 45%, #064e3b)";
    endGame();
    return;
  }

  chancesLeft -= 1;
  left.textContent = String(chancesLeft);

  if (chancesLeft <= 0) {
    showMessage(`游戏结束，正确数字是 ${target}。`, "hint-error");
    endGame();
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
}

function startGame() {
  gameStarted = true;
  unlockSpeech();
  setControlsEnabled(true);
  startBtn.disabled = true;
  startBtn.textContent = "游戏已开始";
  showMessage("游戏开始！请输入 1 到 100 的数字。", "");
  guessInput.focus();
}

setControlsEnabled(false);
startBtn.addEventListener("click", startGame);
submitBtn.addEventListener("click", handleGuess);
guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleGuess();
  }
});
