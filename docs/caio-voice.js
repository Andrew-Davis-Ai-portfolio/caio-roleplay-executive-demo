console.log("🔊 caio-voice.js LOADED");

// --- CAIO preview text ---
const CAIO_PREVIEW_TEXT = `
I’ll be direct.

This is not a conversation about tools.
It’s a conversation about responsibility.

If your AI system makes a decision that fails,
who owns the consequences?

Before we talk about innovation,
I need you to tell me:
what risks you’ve identified,
what you’ve contained,
and what you’re prepared to say to the board
when something goes wrong.
`.trim();

// --- Simple speech utility ---
function speakCaioPreview() {
  const synth = window.speechSynthesis;

  if (!synth) {
    alert("Speech synthesis is not supported on this browser.");
    return;
  }

  // iOS Safari sometimes needs a fresh utterance each time
  const utterance = new SpeechSynthesisUtterance(CAIO_PREVIEW_TEXT);
  utterance.rate = 0.9;   // slightly slower, more executive
  utterance.pitch = 1.0;

  // stop anything currently speaking
  synth.cancel();
  synth.speak(utterance);
}
