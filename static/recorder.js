 const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const promptText = document.getElementById("prompt").innerText;
 let mediaRecorder;
    let audioChunks = [];
    const prompt = document.getElementById("prompt").innerText;

    document.getElementById("start").onclick = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.start();

        document.getElementById("start").disabled = true;
        document.getElementById("stop").disabled = false;
    };

    document.getElementById("stop").onclick = () => {
        mediaRecorder.stop();
        mediaRecorder.onstop = async () => {
            const blob = new Blob(audioChunks, { type: "audio/webm" });
            const formData = new FormData();
            formData.append("file", blob, "recording.webm");
            formData.append("prompt", prompt);

            const res = await fetch("/upload", { method: "POST", body: formData });
            const data = await res.json();
            console.log("Сохранили:", data);

            document.getElementById("start").disabled = false;
            document.getElementById("stop").disabled = true;
        };
    };