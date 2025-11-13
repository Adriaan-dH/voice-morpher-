import React, { useState, useEffect } from "react";
import axios from "axios";
import VoiceRecorder from "./components/VoiceRecorder";
import AudioPlayer from "./components/AudioPlayer";
import "./App.css";

// Backend API URL
const API_BASE = "http://localhost:5000";

export default function App() {
  // STATE VARIABLES

  // List of available audio effects (e.g., "Deep Voice", "Chipmunk")
  // Fetched from the backend. If backend is down, it stays empty.
  const [effects, setEffects] = useState([]);

  // The original recorded audio (as a WAV Blob from the browser)
  const [originalBlob, setOriginalBlob] = useState(null);

  // URL for the transformed (morphed) audio. Used to play/download result
  const [transformedUrl, setTransformedUrl] = useState(null);

  // True while sending audio to backend and waiting for response
  const [processing, setProcessing] = useState(false);

  // Tracks if backend is reachable: null = checking, true = online, false = offline
  const [backendOk, setBackendOk] = useState(null);

  // Currently selected effect ID (e.g., "deep", "chipmunk")
  const [selected, setSelected] = useState("");

  // FETCH EFFECTS FROM BACKEND (runs once when app loads)
  useEffect(() => {
    // Try to get the list of effects from Flask API
    axios
      .get(`${API_BASE}/api/effects`)
      .then((response) => {
        // Success: save effects and mark backend as healthy
        setEffects(response.data);
        setBackendOk(true);
      })
      .catch((error) => {
        // Failed: log warning, clear effects, mark backend as down
        console.warn("Backend unreachable. Effects will be disabled.", error);
        setEffects([]); // No effects available
        setBackendOk(false); // Disable all effect-related UI
      });
  }, []); // Empty dependency array, runs only once on mount

  // CALLBACK: When user finishes recording
  const handleRecorded = (wavBlob) => {
    // Store the recorded WAV file (as a Blob)
    setOriginalBlob(wavBlob);

    // Reset any previous transformation
    setTransformedUrl(null);

    // Reset effect selection so user must pick again
    setSelected("");
  };

  // APPLY SELECTED EFFECT: Send audio + effect to backend
  const transform = async () => {
    // Safety checks: must have recording AND backend online
    if (!originalBlob || !backendOk || !selected) return;

    setProcessing(true); // Show "Transforming…" and disable buttons

    try {
      // Prepare form data to send file + effect name
      const formData = new FormData();
      formData.append("audio", originalBlob, "recording.wav");
      formData.append("effect", selected);

      // Send to Flask backend, expect audio blob back
      const response = await axios.post(
        `${API_BASE}/api/process-audio`,
        formData,
        { responseType: "blob" } // Important: receive raw audio data
      );

      // Convert response blob to object URL for <audio> playback
      const audioUrl = URL.createObjectURL(response.data);
      setTransformedUrl(audioUrl);
    } catch (error) {
      // Show user-friendly error
      alert("Transformation failed. The backend is offline or crashed.");
      console.error("Audio processing error:", error);
    } finally {
      // Always stop the loading state
      setProcessing(false);
    }
  };

  // RENDER UI
  return (
    <div className="app">
      {/* HEADER */}
      <header className="app-header">
        <h1>Voice Morpher</h1>

        {/* Show warning if backend failed to load */}
        {backendOk === false && (
          <p style={{ color: "#ff0", fontWeight: "bold" }}>
            Warning: Backend offline. Effects are unavailable.
          </p>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="app-main">
        {/* Record your voice */}
        <VoiceRecorder
          onRecorded={handleRecorded}
          disabled={processing} // Prevent recording during transform
        />

        {/* Only show if user has recorded something */}
        {originalBlob && (
          <div className="transform-section" style={{ marginTop: "2rem" }}>
            {/* Original Recording Player + Download */}
            <div className="original-player" style={{ marginBottom: "1.5rem" }}>
              <h4>Your original recording</h4>
              <audio
                controls
                src={URL.createObjectURL(originalBlob)}
                style={{ width: "100%", maxWidth: "400px" }}
              />
              <div className="download-link" style={{ marginTop: "0.5rem" }}>
                <a
                  href={URL.createObjectURL(originalBlob)}
                  download="original_recording.wav"
                  style={{
                    background: "#28a745",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "5px",
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  Download Original
                </a>
              </div>
            </div>

            {/* Effect Selector (only if backend is online) */}
            {backendOk && effects.length > 0 && (
              <>
                <div className="effects-selector">
                  <label htmlFor="effect">Choose an effect:</label>
                  <select
                    id="effect"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    disabled={processing}
                  >
                    <option value="" disabled>
                      Select an effect
                    </option>
                    {effects.map((effect) => (
                      <option key={effect.id} value={effect.id}>
                        {effect.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Apply Effect Button */}
                <button
                  className="record-button"
                  onClick={transform}
                  disabled={processing || !selected}
                  style={{ marginTop: "1rem" }}
                >
                  {processing ? "Transforming…" : "Apply Effect"}
                </button>
              </>
            )}

            {/* Optional future features (disabled for now) */}
            <div style={{ marginTop: "1rem", opacity: 0.6 }}>
              <button disabled>Text to Speech (coming)</button>{" "}
              <button disabled>Speech to Text (coming)</button>
            </div>
          </div>
        )}

        {/* Play the transformed result */}
        {transformedUrl && <AudioPlayer url={transformedUrl} />}
      </main>
    </div>
  );
}