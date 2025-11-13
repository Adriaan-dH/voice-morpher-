import React from "react";

// Simple wrapper that receives a Blob URL for the processed audio.
const AudioPlayer = ({ url }) => (
  <div className="audio-player">
    <h3>Transformed audio</h3>
    <audio controls src={url} className="audio-element">
      Your browser does not support the audio element.
    </audio>
    <div className="download-link">
      <a href={url} download="morphed_voice.wav">
        Download
      </a>
    </div>
  </div>
);

export default AudioPlayer;