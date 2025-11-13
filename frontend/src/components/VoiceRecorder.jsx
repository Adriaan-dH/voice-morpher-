import React, { useState, useRef } from "react";

const VoiceRecorder = ({ onRecorded, disabled }) => {
  const [recording, setRecording] = useState(false);
  const [originalUrl, setOriginalUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Find supported MIME type
  const getSupportedMime = () => {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return "";
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = getSupportedMime();
      const options = mime ? { mimeType: mime } : {};
      const recorder = new MediaRecorder(stream, options);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        const wavBlob = await convertToWav(blob);
        const url = URL.createObjectURL(wavBlob);

        setOriginalUrl(url);
        onRecorded(wavBlob);

        // Clean up
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Microphone error:", err);
      alert("Microphone access failed. Please allow microphone and try again.");
    }
  };

  const stop = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="voice-recorder">
      {!recording ? (
        <button className="record-button" onClick={start} disabled={disabled}>
          Record
        </button>
      ) : (
        <button className="stop-button" onClick={stop}>
          Stop
        </button>
      )}
    </div>
  );
};

// Convert any audio blob (webm, mp4, etc.) to WAV (16-bit PCM)
// Uses Web Audio API
async function convertToWav(inputBlob) {
  const arrayBuffer = await inputBlob.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  let audioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (e) {
    console.error("Failed to decode audio:", e);
    throw e;
  }

  const sampleRate = 22050; // Match backend
  const numChannels = 1;
  const duration = audioBuffer.duration;
  const offlineContext = new OfflineAudioContext(numChannels, sampleRate * duration, sampleRate);

  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();

  const renderedBuffer = await offlineContext.startRendering();

  // Convert to 16-bit PCM
  const channelData = renderedBuffer.getChannelData(0);
  const int16Array = new Int16Array(channelData.length);
  for (let i = 0; i < channelData.length; i++) {
    int16Array[i] = Math.max(-32768, Math.min(32767, channelData[i] * 32767));
  }

  // Build WAV header
  const wavBuffer = createWavFile(int16Array, sampleRate);
  return new Blob([wavBuffer], { type: "audio/wav" });
}

// Create WAV file header (RIFF format)
function createWavFile(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");

  // fmt subchunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, 1, true); // NumChannels (mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // Data subchunk
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  // Write samples
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, samples[i], true);
  }

  return buffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export default VoiceRecorder;