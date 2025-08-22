from flask import Flask, request, jsonify, render_template
import os
import subprocess
import json
from datetime import datetime
import lingvanex.script  # твой модуль с pollinations_generate()

app = Flask(__name__)
UPLOAD_DIR = "data"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.route("/")
def index():
    text = lingvanex.script.pollinations_generate()
    return render_template("index.html", prompt=text)


@app.route("/new_text")
def new_text():
    text = lingvanex.script.pollinations_generate()
    return jsonify({"prompt": text})


REGISTRY_PATH = os.path.join(UPLOAD_DIR, "records.json")
# если реестр пустой, создаём
if not os.path.exists(REGISTRY_PATH):
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump([], f, ensure_ascii=False, indent=2)


@app.after_request
def add_header(r):
    r.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "-1"
    return r


@app.route("/upload", methods=["POST"])
def upload():
    f = request.files["file"]
    prompt = request.form["prompt"]

    idx = len([x for x in os.listdir(UPLOAD_DIR) if x.endswith(".wav")])
    base = str(idx).zfill(5)
    webm_path = os.path.join(UPLOAD_DIR, f"{base}.webm")
    wav_path = os.path.join(UPLOAD_DIR, f"{base}.wav")
    txt_path = os.path.join(UPLOAD_DIR, f"{base}.txt")

    f.save(webm_path)

    subprocess.run([
        "ffmpeg", "-i", webm_path,
        "-ar", "16000", "-ac", "1", "-c:a", "pcm16le", wav_path
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # читаем текущий реестр
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f_json:
        registry = json.load(f_json)

    # сохраняем текст отдельно
    with open(txt_path, "w", encoding="utf-8") as f_txt:
        f_txt.write(prompt)

    record = {
        "id": base,
        "text": prompt,
        "wav": f"{base}.wav",
        "uploaded_at": datetime.utcnow().isoformat()
    }
    registry.append(record)

    with open(REGISTRY_PATH, "w", encoding="utf-8") as f_json:
        json.dump(registry, f_json, ensure_ascii=False, indent=2)

    return jsonify({"status": "ok", "file": wav_path})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # use Render’s port if available
    app.run(host="0.0.0.0", port=port)
