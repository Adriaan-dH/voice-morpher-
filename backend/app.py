from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import io
from audio_processor import AudioProcessor

app = Flask(__name__)

# CORS, allow Vite dev server (localhost:5173 or 127.0.0.1:5173)
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type"],
        }
    },
)

processor = AudioProcessor()

# Routes
@app.route("/")
def home():
    return jsonify({"message": "Voice Morpher API – ready"})


@app.route("/api/effects", methods=["GET"])
def get_effects():
    """Return static list of available effects."""
    return jsonify(
        [
            {"id": "deep", "name": "Deep Voice"},
            {"id": "chipmunk", "name": "Chipmunk"},
            {"id": "echo", "name": "Echo"},
            {"id": "reverse", "name": "Reverse"},
        ]
    )


@app.route("/api/process-audio", methods=["POST", "OPTIONS"])
def process_audio():
    # Handle CORS pre-flight
    if request.method == "OPTIONS":
        return "", 204

    # Validate incoming data
    if "audio" not in request.files:
        return jsonify({"error": "Missing 'audio' file"}), 400

    if "effect" not in request.form:
        return jsonify({"error": "Missing 'effect' in form data"}), 400

    file = request.files["audio"]
    effect = request.form["effect"]

    # Process and return morphed audio
    try:
        out_buffer = processor.process_audio(file, effect)
        return send_file(
            out_buffer,
            mimetype="audio/wav",
            as_attachment=True,
            download_name="morphed_voice.wav",
        )
    except Exception as e:
        app.logger.error(f"Processing failed: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, threaded=True)