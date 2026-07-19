(function () {
  "use strict";

  const cards = [...document.querySelectorAll(".family-pronunciation-card")];
  let activeRecorder = null;
  let activeStream = null;
  let activeCard = null;
  let chunks = [];

  function status(card, text, tone) {
    const box = card.querySelector(".practice-status");
    box.textContent = text;
    box.dataset.tone = tone || "normal";
  }

  function stopTracks() {
    if (activeStream) activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
  }

  function playModel(card) {
    const audio = new Audio(card.dataset.model);
    audio.preload = "auto";
    audio.playbackRate = 1;
    audio.play().then(() => {
      status(card, "正在播放0.75倍标准美语。听完后让孩子完整读一遍。", "working");
    }).catch(() => {
      status(card, "标准音暂时无法播放，请检查网络后重试。", "error");
    });
    audio.addEventListener("ended", () => {
      status(card, "现在让孩子完整读一遍。家人只提醒卡片上的一个关键点，然后重听、再读一次。", "normal");
    }, { once: true });
  }

  async function startRecording(card) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      status(card, "当前浏览器不支持本机录音；请直接让孩子跟读，由家人听辨即可。", "error");
      return;
    }
    if (activeRecorder && activeRecorder.state === "recording") activeRecorder.stop();
    stopTracks();
    try {
      activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      activeCard = card;
      activeRecorder = new MediaRecorder(activeStream);
      activeRecorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size) chunks.push(event.data);
      });
      activeRecorder.addEventListener("stop", () => {
        const blob = new Blob(chunks, { type: activeRecorder.mimeType || "audio/webm" });
        if (card.dataset.recordingUrl) URL.revokeObjectURL(card.dataset.recordingUrl);
        card.dataset.recordingUrl = URL.createObjectURL(blob);
        card.querySelector(".record-local").disabled = false;
        card.querySelector(".stop-recording").disabled = true;
        card.querySelector(".play-recording").disabled = false;
        status(card, "录音只留在本机内存中。点“回放孩子录音”，家人只检查上面的一个关键点。", "normal");
        stopTracks();
        activeCard = null;
      }, { once: true });
      activeRecorder.start();
      card.querySelector(".record-local").disabled = true;
      card.querySelector(".stop-recording").disabled = false;
      status(card, "正在本机录音，请让孩子完整读一遍；读完点“停止本机录音”。", "working");
    } catch (error) {
      stopTracks();
      status(card, "没有取得麦克风权限。可跳过录音，直接跟读并由家人听辨。", "error");
    }
  }

  function stopRecording(card) {
    if (activeRecorder && activeCard === card && activeRecorder.state === "recording") activeRecorder.stop();
  }

  function playRecording(card) {
    if (!card.dataset.recordingUrl) return;
    new Audio(card.dataset.recordingUrl).play().catch(() => {
      status(card, "本机录音无法回放，请直接跟读并由家人听辨。", "error");
    });
  }

  cards.forEach((card) => {
    card.querySelector(".play-standard").addEventListener("click", () => playModel(card));
    card.querySelector(".record-local").addEventListener("click", () => startRecording(card));
    card.querySelector(".stop-recording").addEventListener("click", () => stopRecording(card));
    card.querySelector(".play-recording").addEventListener("click", () => playRecording(card));
    card.querySelector(".complete-practice").addEventListener("click", () => {
      status(card, "这一项完成。能听清目标词就继续；暂时不稳也没关系，下次再复习。你太了不起啦！", "success");
    });
  });

  window.addEventListener("pagehide", () => {
    if (activeRecorder && activeRecorder.state === "recording") activeRecorder.stop();
    stopTracks();
    cards.forEach((card) => {
      if (card.dataset.recordingUrl) URL.revokeObjectURL(card.dataset.recordingUrl);
    });
  });
})();
