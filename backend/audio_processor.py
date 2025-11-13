import io
import numpy as np
import soundfile as sf
from pydub import AudioSegment
import librosa

class AudioProcessor:
    """All processing happens at 22 050 Hz mono. Optimal for web delivery."""
    def __init__(self):
        self.sr = 22050

    # Public API
    def process_audio(self, file_storage, effect: str) -> io.BytesIO:
        """
        Entry point called from Flask.
        file_storage: Flask request.files['audio']
        effect: one of the IDs returned by /api/effects
        """
        # Load with pydub (handles any browser-provided codec)
        segment = AudioSegment.from_file(file_storage)
        segment = segment.set_frame_rate(self.sr).set_channels(1)

        # Convert to float32 numpy array, normalised to [-1, 1]
        samples = np.array(segment.get_array_of_samples(), dtype=np.float32)
        if segment.sample_width == 2: # 16-bit
            samples /= 32768.0
        elif segment.sample_width == 4: # 32-bit
            samples /= 2147483648.0
        else:
            samples /= 32768.0 # fallback

        # Apply effect
        processed = self._apply_effect(samples, effect)

        # Clamp and convert back to 16-bit PCM
        processed = np.clip(processed, -1.0, 1.0)
        processed_int16 = (processed * 32767).astype(np.int16)

        # Write to in-memory WAV
        buffer = io.BytesIO()
        sf.write(buffer, processed_int16, self.sr, subtype='PCM_16', format='WAV')
        buffer.seek(0)
        return buffer

    # Effect implementations (all return float32 samples in [-1, 1])
    def _apply_effect(self, samples: np.ndarray, effect: str) -> np.ndarray:
        if effect == "deep":
            return self._deep(samples)
        if effect == "chipmunk":
            return self._chipmunk(samples)
        if effect == "echo":
            return self._echo(samples)
        if effect == "reverse":
            return self._reverse(samples)
        return samples # unknown = passthrough

    def _deep(self, samples):
        """Pitch down 4 semitones, keep duration with time-stretch."""
        return librosa.effects.pitch_shift(samples, sr=self.sr, n_steps=-4)

    def _chipmunk(self, samples):
        """Pitch up 5 semitones."""
        return librosa.effects.pitch_shift(samples, sr=self.sr, n_steps=5)

    def _echo(self, samples):
        """300 ms delay, 50 % wet."""
        delay_samples = int(0.3 * self.sr)
        echo = np.zeros_like(samples)
        echo[delay_samples:] = samples[:-delay_samples] * 0.5
        return samples + echo

    def _reverse(self, samples):
        return samples[::-1]