import sys, json, subprocess
import numpy as np
from faster_whisper import WhisperModel
m = WhisperModel(sys.argv[1], device="cpu", compute_type="int8", cpu_threads=4)
raw = subprocess.run(["ffmpeg","-loglevel","error","-i",sys.argv[2],"-f","f32le","-ac","1","-ar","16000","-"], capture_output=True, check=True).stdout
audio = np.frombuffer(raw, np.float32)
segs, info = m.transcribe(audio, language="hi", word_timestamps=True, beam_size=5, vad_filter=False, condition_on_previous_text=False)
out = []
for s in segs:
    out.append({"start": s.start, "end": s.end, "text": s.text, "words": [{"w": w.word, "s": w.start, "e": w.end, "p": w.probability} for w in s.words]})
    print(f"{s.start:6.2f} {s.end:6.2f} {s.text}")
json.dump(out, open(sys.argv[3], "w"), ensure_ascii=False, indent=1)
