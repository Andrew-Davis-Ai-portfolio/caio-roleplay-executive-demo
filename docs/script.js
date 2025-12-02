// ---- Scenario configuration ----

const scenarios = {
  budget: {
    id: "budget",
    name: "AI Budget Alignment",
    intro:
      "You are requesting AI budget across tools, teams, and time. Assume the CFO and CEO are listening. You have two minutes. Focus on outcomes, not tools.",
    focusAreas: [
      "business outcomes and ROI",
      "runway and cost discipline",
      "prioritisation across teams"
    ]
  },
  risk: {
    id: "risk",
    name: "Risk & Governance Incident",
    intro:
      "A recent AI-related incident raised risk, compliance, and ethics concerns. You have to explain what happened and how you will prevent it recurring.",
    focusAreas: [
      "root cause and accountability",
      "governance controls",
      "communication with regulators and customers"
    ]
  },
  scale: {
    id: "scale",
    name: "Pilot to Production",
    intro:
      "You want to graduate AI pilots into critical production workflows. Leadership is skeptical because previous pilots never scaled.",
    focusAreas: [
      "clear success criteria",
      "change management and ownership",
      "post-launch monitoring"
    ]
  }
};

// ---- State ----

let state = {
  scenario: null,
  turn: 0,
  maxTurns: 3,
  finished: false
};

// ---- DOM ----

const scenarioRow = document.getElementById("scenarioRow");
const chatLog = document.getElementById("chatLog");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const debriefPanel = document.getElementById("debriefPanel");
const resetBtn = document.getElementById("resetBtn");
const voiceToggle = document.getElementById("voiceToggle");

// ---- TTS helpers ----

function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function speak(text) {
  if (!voiceToggle.checked || !canSpeak()) return;
  const synth = window.speechSynthesis;
  try {
    synth.cancel();
  } catch (e) {}
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 1.0;
  u.pitch = 1.0;
  synth.speak(u);
}

// ---- Chat helpers ----

function scrollChatToBottom() {
  chatLog.scrollTop = chatLog.scrollHeight;
}

function clearChat() {
  chatLog.innerHTML = "";
}

function addMessage({ role, text, kind = "normal" }) {
  const wrapper = document.createElement("div");
  wrapper.className =
    "chat-message" + (kind === "system" ? " system" : "");

  const meta = document.createElement("div");
  meta.className = "chat-meta " + (role === "user" ? "user" : role === "caio" ? "caio" : "");
  meta.textContent =
    role === "user"
      ? "You"
      : role === "caio"
      ? "CAIO"
      : "System";

  const bubble = document.createElement("div");
  const bubbleRole =
    role === "user" ? "user" : role === "caio" ? "caio" : "system";
  bubble.className = "chat-bubble " + bubbleRole;
  bubble.textContent = text;

  wrapper.appendChild(meta);
  wrapper.appendChild(bubble);
  chatLog.appendChild(wrapper);
  scrollChatToBottom();

  if (role === "caio") {
    speak(text);
  }
}

// ---- Scenario selection ----

function selectScenario(id) {
  const scenario = scenarios[id];
  if (!scenario) return;

  state = {
    scenario,
    turn: 0,
    maxTurns: 3,
    finished: false
  };

  // UI active state
  document
    .querySelectorAll(".scenario-btn")
    .forEach((btn) => btn.classList.remove("active"));
  const activeBtn = document.querySelector(
    `.scenario-btn[data-scenario="${id}"]`
  );
  if (activeBtn) activeBtn.classList.add("active");

  // Reset chat + debrief
  clearChat();
  debriefPanel.innerHTML =
    '<p class="debrief-placeholder">Debrief will appear here once the demo completes.</p>';

  // Intro messages
  addMessage({
    role: "system",
    text: `Scenario loaded: ${scenario.name}.`,
    kind: "system"
  });

  addMessage({
    role: "caio",
    text:
      scenario.intro +
      " Briefly present your position. I will interrupt if you’re vague or misaligned."
  });

  sendBtn.disabled = false;
  userInput.disabled = false;
  userInput.placeholder =
    "Your move. How do you open this conversation with the CAIO and leadership?";
  userInput.focus();
}

// ---- CAIO logic (simple heuristic engine) ----

function analyseUserText(text) {
  const lower = text.toLowerCase();
  const score = {
    mentionsRisk:
      lower.includes("risk") ||
      lower.includes("governance") ||
      lower.includes("compliance"),
    mentionsValue:
      lower.includes("roi") ||
      lower.includes("value") ||
      lower.includes("outcome") ||
      lower.includes("impact") ||
      lower.includes("revenue") ||
      lower.includes("savings"),
    mentionsPeople:
      lower.includes("team") ||
      lower.includes("people") ||
      lower.includes("training") ||
      lower.includes("staff") ||
      lower.includes("change"),
    mentionsData:
      lower.includes("data") ||
      lower.includes("metrics") ||
      lower.includes("kpi") ||
      lower.includes("measurement"),
    length:
      text.trim().split(/\s+/).filter(Boolean).length
  };

  return score;
}

function generateCaioReply(userText) {
  const s = state.scenario;
  const score = analyseUserText(userText);

  const short = score.length < 25;
  const medium = score.length >= 25 && score.length <= 80;
  // const long = score.length > 80; // not strictly needed but left for clarity

  let critique = "";
  let nextAsk = "";
  let framing = "";

  if (short) {
    critique =
      "Right now your answer is too light for this table. I need a structured position, not a headline.";
  } else if (medium) {
    critique =
      "You’re in the right range for an opening statement, but it still reads like a pitch rather than an executive plan.";
  } else {
    critique =
      "You’re oversupplying detail. Remember: at this level we open with the spine of the decision, not the whole binder.";
  }

  if (!score.mentionsValue) {
    framing =
      "You didn’t anchor strongly enough to business value. No leader funds AI because it’s interesting — only because it moves a number we care about.";
  } else if (!score.mentionsRisk && s.id === "risk") {
    framing =
      "In a risk scenario, if you don’t lead with accountability and controls, leadership will assume you’re dodging the core issue.";
  } else if (!score.mentionsData) {
    framing =
      "You referred to ideas, but not to any metrics or baselines. That makes your proposal hard to evaluate or defend.";
  } else if (!score.mentionsPeople && s.id === "scale") {
    framing =
      "Scaling pilots without a people and ownership plan is how initiatives quietly die after the first month.";
  } else {
    framing =
      "You did touch the right levers — value, risk, and some operational detail. What’s missing now is sharper prioritisation.";
  }

  if (s.id === "budget") {
    nextAsk =
      "Give me a simple breakdown: where would the first 100 units of budget go, and what measurable outcome would we expect in the next 90 days?";
  } else if (s.id === "risk") {
    nextAsk =
      "Spell out the control plan in three layers: immediate containment, short-term guardrails, and one structural change you’d implement.";
  } else if (s.id === "scale") {
    nextAsk =
      "Explain how you’d decide which pilot graduates first. What’s the gating criteria, and who owns the transition into production?";
  }

  return `${critique} ${framing} ${nextAsk}`;
}

// ---- Debrief ----

function buildDebrief() {
  const s = state.scenario;
  if (!s) return;

  const strengths = [];
  const gaps = [];
  const nextSteps = [];

  // Simple narrative based on scenario
  if (s.id === "budget") {
    strengths.push("You were willing to make a clear ask.");
    gaps.push("Budget justification needs sharper linkage to revenue, savings, or risk reduction.");
    gaps.push("Ownership and phasing across teams could be clearer.");
    nextSteps.push("Practice framing budget in terms of business cases, not tools.");
  } else if (s.id === "risk") {
    strengths.push("You addressed the incident instead of avoiding it.");
    gaps.push("You can lean harder into accountability, controls, and external communication.");
    nextSteps.push("Lead future answers with: what happened, what we learned, and what will never happen again.");
  } else if (s.id === "scale") {
    strengths.push("You focused on moving beyond pilots, which leadership expects.");
    gaps.push("Selection criteria and production ownership weren’t fully locked in.");
    nextSteps.push("Define what 'ready for production' means in your context before you ask for scale.");
  }

  const html = `
    <div class="debrief-block">
      <strong>Scenario:</strong> ${s.name}
    </div>
    <div class="debrief-block">
      <strong>What you just practiced</strong>
      <ul class="debrief-list">
        <li>Opening an AI conversation at an executive table.</li>
        <li>Receiving pushback from a CAIO instead of approval by default.</li>
        <li>Adjusting your framing under limited time.</li>
      </ul>
    </div>
    <div class="debrief-block">
      <strong>Observed strengths</strong>
      <ul class="debrief-list">
        ${strengths.map((x) => `<li>${x}</li>`).join("")}
      </ul>
    </div>
    <div class="debrief-block">
      <strong>Growth edges</strong>
      <ul class="debrief-list">
        ${gaps.map((x) => `<li>${x}</li>`).join("")}
      </ul>
    </div>
    <div class="debrief-block">
      <strong>Next reps</strong>
      <ul class="debrief-list">
        ${nextSteps.map((x) => `<li>${x}</li>`).join("")}
      </ul>
    </div>
  `;

  debriefPanel.innerHTML = html;
}

// ---- Handlers ----

scenarioRow.addEventListener("click", (e) => {
  const btn = e.target.closest(".scenario-btn");
  if (!btn) return;
  const id = btn.dataset.scenario;
  selectScenario(id);
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!state.scenario || state.finished) return;

  const text = userInput.value.trim();
  if (!text) return;

  addMessage({ role: "user", text });

  userInput.value = "";
  userInput.focus();

  state.turn += 1;

  const reply = generateCaioReply(text);
  addMessage({ role: "caio", text: reply });

  if (state.turn >= state.maxTurns) {
    state.finished = true;
    addMessage({
      role: "caio",
      text:
        "We’ll stop the demo here. In a real session we’d keep iterating until your framing matches the room.",
      kind: "normal"
    });
    buildDebrief();
    sendBtn.disabled = true;
    userInput.disabled = true;
    userInput.placeholder =
      "Simulation complete. Reset if you want to run another scenario.";
  }
});

resetBtn.addEventListener("click", () => {
  if (canSpeak()) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
  state = {
    scenario: null,
    turn: 0,
    maxTurns: 3,
    finished: false
  };
  document
    .querySelectorAll(".scenario-btn")
    .forEach((btn) => btn.classList.remove("active"));
  clearChat();
  chatLog.innerHTML =
    '<div class="chat-placeholder"><p>Select a scenario to start the simulation.</p></div>';
  debriefPanel.innerHTML =
    '<p class="debrief-placeholder">Debrief will appear here once the demo completes.</p>';
  userInput.value = "";
  userInput.placeholder =
    "Speak like you’re at the executive table. What do you propose?";
  userInput.disabled = true;
  sendBtn.disabled = true;
});

// Initial state
userInput.disabled = true;
sendBtn.disabled = true;

function playCaioPreview() {
  const audio = document.getElementById("caioPreviewAudio");

  if (!audio) {
    console.error("CAIO preview audio element not found");
    return;
  }

  audio.currentTime = 0;
  audio.play();
}

function playCaioPreview() {
  console.log("🎧 playCaioPreview called");
  const audio = document.getElementById("caioPreviewAudio");

  if (!audio) {
    console.error("CAIO preview audio element not found");
    return;
  }

  audio.currentTime = 0;
  audio.play().catch(err => {
    console.error("Audio play failed:", err);
  });
}

function playCaioPreview() {
  console.log("🎧 CAIO preview triggered");

  const audio = document.getElementById("caioPreviewAudio");

  if (!audio) {
    console.error("❌ caioPreviewAudio element not found");
    return;
  }

  audio.currentTime = 0;

  audio.play()
    .then(() => console.log("✅ Playing CAIO voice preview"))
    .catch(err => console.error("❌ Audio failed:", err));
}
