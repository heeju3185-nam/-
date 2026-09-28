const THRESHOLD = 0.75;   // 이 확률 이상일 때만 전송
let writer = null;
let lastSent = -1;
const statusEl = document.getElementById("status");

// ① Web Serial로 마이크로비트 연결 (115200bps)
document.getElementById("btnSerial").onclick = async () => {
  if (!("serial" in navigator)) {
    alert("크롬 또는 엣지 브라우저에서 열어주세요.");
    return;
  }
  try {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    writer = port.writable.getWriter();
    statusEl.textContent = "마이크로비트 연결됨";
  } catch (e) {
    statusEl.textContent = "연결 실패: " + e.message +
      " (메이크코드 창의 기기 연결을 끊었는지 확인하세요)";
  }
};

async function send(text) {
  if (!writer) return;
  await writer.write(new TextEncoder().encode(text + "\n"));
}

// ② 티처블머신 오디오 모델 불러와서 듣기 시작
document.getElementById("btnStart").onclick = async () => {
  let url = document.getElementById("url").value.trim();
  if (!url) { alert("모델 링크를 넣어주세요."); return; }
  if (!url.endsWith("/")) url += "/";

  statusEl.textContent = "모델 불러오는 중...";
  const recognizer = speechCommands.create(
    "BROWSER_FFT", undefined, url + "model.json", url + "metadata.json");
  await recognizer.ensureModelLoaded();
  const labels = recognizer.wordLabels();

  // 막대그래프 만들기
  const bars = document.getElementById("bars");
  bars.innerHTML = labels.map((l, i) =>
    `<div class="row"><span class="name">${i}: ${l}</span>
     <div class="bar" id="b${i}" style="width:0"></div></div>`).join("");

  statusEl.textContent = "듣는 중... (마이크 허용 필요)";

  recognizer.listen(result => {
    const scores = result.scores;
    let best = 0;
    for (let i = 0; i < scores.length; i++) {
      document.getElementById("b" + i).style.width = (scores[i] * 250) + "px";
      if (scores[i] > scores[best]) best = i;
    }
    // 확률이 충분히 높고, 결과가 바뀌었을 때만 번호 전송
    if (scores[best] >= THRESHOLD && best !== lastSent) {
      lastSent = best;
      send(String(best));
      document.getElementById("sent").textContent =
        "보낸 값: " + best + " (" + labels[best] + ")";
    }
  }, {
    includeSpectrogram: false,
    probabilityThreshold: THRESHOLD,
    invokeCallbackOnNoiseAndUnknown: true,
    overlapFactor: 0.5
  });
};