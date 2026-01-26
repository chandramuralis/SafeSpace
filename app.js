/**
 * SafeSpace - Anti-Bullying Chat Application
 * 
 * This file handles all the client-side logic for the application.
 * Key Features:
 * 1. User Login (Ephemeral, stored in SessionStorage)
 * 2. Chat Interface (Messages, Bubbles, Scrolling)
 * 3. Bullying Detection (Regex-based validation)
 * 4. Multi-User Sync (LocalStorage + Polling/Events to sync across tabs)
 */

// --- Configuration ---
// The following rules were extracted from the 'ExcelFormula.xlsx' provided by the user.
// We use Regular Expressions (Regex) to find patterns in the text.
const REGEX_RULES = {
    // Rule: Detect specific unkind words.
    // The \\b matches "word boundaries" so "class" doesn't trigger "ass".
    bullyWords: new RegExp("\\b(idiot|loser|stupid|dumb|moron|jerk|trash|worthless|crybaby|weirdo|fool|lazy|ugly|nobody|pathetic|silly|annoying|ridiculous|losing|weak|lame|failure|idiotic|clown|jerkface|dummy|loserface)\\b", "i"),

    // Rule: Detect threatening phrases.
    threats: new RegExp("\\b(kill|i will kill|i'll kill|gonna kill|find you|make you pay|hurt you|beat you|stab you|shoot you|strangle you|choke you|punch you|kick you|destroy you|break your legs|end you|wipe you out|come after you|i'm coming for you|watch your back|attack you|i'll get you|i will get you|i'm gonna get you|send you to hell|threaten|stalk you)\\b", "i"),

    // Rule: Detect profanity.
    // Includes common variations and misspellings.
    profanity: new RegExp("\\b(fuck|fcuk|shit|ass|bitch|bastard|bullshit|cunt|dick|hell|motherfucker|niger|f u|asshole|wtf|what the fuck)\\b", "i")
};

// --- State Management ---
// currentUser: Stores the name of the user in the current tab.
let currentUser = "";

// STORAGE_KEY: The key used in LocalStorage to save the array of chat messages.
const STORAGE_KEY = 'safeSpace_messages';

// --- DOM Elements ---
// We cache references to HTML elements to avoid repeated lookups.
const loginSection = document.getElementById('login-section');
const chatSection = document.getElementById('chat-section');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

const currentUserDisplay = document.getElementById('current-user-display');
const logoutBtn = document.getElementById('logout-btn');
const chatWindow = document.getElementById('chat-window');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const validationFeedback = document.getElementById('validation-feedback');

// --- Event Listeners ---

/**
 * Window Load Event
 * Runs when the page is fully loaded.
 * 1. Checks SessionStorage to restore user session (if they refreshed).
 * 2. Loads the chat history from LocalStorage to show previous messages.
 */
// --- AI State ---
// We use the TensorFlow.js 'toxicity' model.
// It runs entirely in the browser (client-side), ensuring user privacy.
let toxicityModel = null;

// THRESHOLD: The confidence level (0.0 to 1.0) required to flag a message.
// We set it to 0.5 (50%) to be more sensitive and catch subtle bullying.
// A higher threshold (e.g., 0.9) would only catch very obvious toxicity.
const THRESHOLD = 0.7;

window.addEventListener('load', async () => {
    // 1. Check Identity (Session Storage)
    // SessionStorage is unique per tab. This keeps Tab A as "User A" and Tab B as "User B".
    const savedUser = sessionStorage.getItem('safeSpace_currentUser');
    if (savedUser) {
        currentUser = savedUser;
        currentUserDisplay.textContent = currentUser;
        toggleSections(true); // Show chat, hide login
    }

    // 2. Load History (Local Storage)
    // LocalStorage is shared across all tabs. This loads the common chat history.
    loadChatHistory();

    // 3. Load AI Model (Background)
    // This is an ASYNC operation that downloads the model (~200KB).
    // We start it immediately so it's ready by the time the user logs in.
    console.log("🧠 Loading AI Model...");
    try {
        toxicityModel = await toxicity.load(THRESHOLD);
        console.log("🧠 AI Model Loaded and Ready!");
    } catch (err) {
        console.error("Failed to load AI model:", err);
    }
});

/**
 * Storage Event
 * Fires when another tab modifies LocalStorage.
 * This allows Tab A to see messages sent by Tab B immediately.
 */
window.addEventListener('storage', (e) => {
    console.log("🔔 Storage event triggered:", e.key);
    if (e.key === STORAGE_KEY) {
        console.log("🔄 Syncing chat history from storage update...");
        loadChatHistory(); // Re-render chat if history changed
    }
});

/**
 * Polling Fallback
 * Sometimes the 'storage' event is unreliable (e.g. on file:// protocol or some local servers).
 * This interval checks LocalStorage every 1 second to ensure we never miss a message.
 */
let lastKnownHistory = "";
setInterval(() => {
    const currentHistory = localStorage.getItem(STORAGE_KEY) || "[]";
    if (currentHistory !== lastKnownHistory) {
        console.log("⏰ Polling found new messages!");
        loadChatHistory();
    }
}, 1000);

// User Interaction Listeners
loginBtn.addEventListener('click', handleLogin);
// Allow pressing "Enter" to login
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});

logoutBtn.addEventListener('click', () => {
    currentUser = "";
    sessionStorage.removeItem('safeSpace_currentUser'); // Clear session
    toggleSections(false);
    usernameInput.value = "";
    loginError.classList.add('hidden');
});

sendBtn.addEventListener('click', handleSendMessage);
// Allow pressing "Enter" to send message
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendMessage();
});

// --- Core Functions ---

/**
 * Handles the login process.
 * Validates the username and saves it to SessionStorage.
 */
function handleLogin() {
    const name = usernameInput.value.trim();
    if (name) {
        currentUser = name;
        sessionStorage.setItem('safeSpace_currentUser', currentUser); // Persist in session
        currentUserDisplay.textContent = currentUser;
        loginError.classList.add('hidden');
        toggleSections(true);
        loadChatHistory(); // Make sure we show latest messages
    } else {
        loginError.classList.remove('hidden');
    }
}

/**
 * Toggles visibility between the Login Screen and the Chat Interface.
 * @param {boolean} isLoggedIn - True to show chat, False to show login.
 */
function toggleSections(isLoggedIn) {
    if (isLoggedIn) {
        loginSection.classList.add('hidden');
        chatSection.classList.remove('hidden');
        // Scroll to bottom after visible so user sees latest messages
        setTimeout(() => chatWindow.scrollTop = chatWindow.scrollHeight, 10);
        messageInput.focus();
    } else {
        loginSection.classList.remove('hidden');
        chatSection.classList.add('hidden');
        usernameInput.focus();
    }
}

/**
 * Handles sending a new message.
 * Converted to ASYNC to support AI await.
 * This function manages the UI state (Waiting Cursor) while the AI thinks.
 */
async function handleSendMessage() {
    const text = messageInput.value.trim();
    if (!text) return; // Don't send empty messages

    // 1. ASYNC VALIDATION LOGIC
    // Show waiting state (Hourglass cursor) to indicate processing.
    // This is important because the AI check can take 50-200ms or longer.
    document.body.classList.add('wait-cursor');
    sendBtn.classList.add('wait-cursor');
    sendBtn.disabled = true; // Prevent double-submit

    try {
        // Await the result from the hybrid validator
        const validationResult = await validateMessage(text);

        if (validationResult.safe) {
            // Message is safe!

            // Save to History (LocalStorage)
            saveMessageToHistory(currentUser, text);

            messageInput.value = ""; // Clear input

            // Show Success Feedback with AI Status
            showFeedback(text, [], true, validationResult.aiChecked);
        } else {
            // Message is UNSAFE!
            showFeedback(text, validationResult.reasons, false, validationResult.aiChecked);
        }
    } finally {
        // CLEANUP: Always remove waiting state, whether success or error.
        document.body.classList.remove('wait-cursor');
        sendBtn.classList.remove('wait-cursor');
        sendBtn.disabled = false;
        // Refocus input so user can keep typing immediately
        messageInput.focus();
    }
}

/**
 * Saves a message to LocalStorage.
 * This makes the message available to all other tabs.
 * @param {string} sender - Username of the sender
 * @param {string} text - The message content
 */
function saveMessageToHistory(sender, text) {
    // 1. Get existing history or empty array
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    // 2. Add new message object
    history.push({
        sender: sender,
        text: text,
        timestamp: new Date().toISOString()
    });

    // 3. Save back to string
    console.log("💾 Saving message to LocalStorage:", history);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

    // 4. Update my own UI manually (storage event doesn't trigger for the tab that made the change)
    loadChatHistory();
}

/**
 * Loads messages from LocalStorage and renders them to the screen.
 * Handles styling for "My Messages" vs "Others' Messages".
 */
function loadChatHistory() {
    // 1. Clear current view
    chatWindow.innerHTML = '';

    // 2. Add System Welcome Message
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'message system-message';
    welcomeDiv.textContent = 'Welcome to the chat! Remember to be nice. 😊';
    chatWindow.appendChild(welcomeDiv);

    // 3. Get history from DB
    const rawHistory = localStorage.getItem(STORAGE_KEY) || "[]";
    const history = JSON.parse(rawHistory);
    lastKnownHistory = rawHistory; // Update state to prevent polling loop from re-rendering unnecessarily

    // 4. Render each message
    history.forEach(msg => {
        // Determine if this message describes "Me" (the user in this specific tab)
        const isMe = (msg.sender === currentUser);
        displayMessage(msg.sender, msg.text, isMe);
    });

    // 5. Scroll to bottom
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

/**
 * Checks if the message violates any SafeSpace rules.
 * NOW ASYNC.
 * @param {string} message - The message text to check.
 * @returns {Promise<object>} { safe: boolean, reasons: Array<{rule: string, match: string}> }
 */
async function validateMessage(message) {
    let checkFailures = []; // Store failures: { rule: "Reason", match: "MatchedWord" }
    let aiChecked = false; // Track if AI actually ran

    // DEBUG FEATURE:
    // We allow the user to toggle Regex off to test the AI model in isolation.
    const useRegex = document.getElementById('regex-toggle').checked;

    // --- STEP 1: REGEX CHECKS (Fast & Deterministic) ---
    // We run these first because they are instant (0ms).
    if (useRegex) {
        // 1. Check Bullying Words
        const bullyMatch = message.match(REGEX_RULES.bullyWords);
        if (bullyMatch) {
            checkFailures.push({
                rule: "Contains unkind word (Regex)",
                match: bullyMatch[0] // The specific word found
            });
        }

        // 2. Check Threats
        const threatMatch = message.match(REGEX_RULES.threats);
        if (threatMatch) {
            checkFailures.push({
                rule: "Contains threatening language (Regex)",
                match: threatMatch[0]
            });
        }

        // 3. Check Profanity
        // We normalize the string (lower case, remove some punctuation) to catch tricks like "f.u.c.k"
        const cleanMsg = " " + message.toLowerCase().replace(/[^a-z0-9 ]/g, " ") + " ";
        const profanityMatch = cleanMsg.match(REGEX_RULES.profanity);
        if (profanityMatch) {
            checkFailures.push({
                rule: "Contains Inappropriate language (Regex)",
                match: profanityMatch[0].trim()
            });
        }
    } else {
        console.log("⏩ Regex validation skipped by user toggle.");
    }

    // Note: All-Caps and Exclamation rules were removed based on user feedback to be less strict.

    // --- AI State ---
    // let toxicityModel = null; // This is defined globally elsewhere
    const THRESHOLD = 0.5; // Lowered to 50% for better sensitivity

    // --- STEP 2: AI CHECKS (Contextual) ---
    // Only run AI if:
    // 1. The message passed Regex checks (checkFailures is empty).
    //    (Optimization: If Blocked by word bank, we don't need to waste CPU on AI).
    // 2. The AI Model is fully loaded (toxicityModel is not null).
    if (checkFailures.length === 0 && toxicityModel) {
        aiChecked = true; // Mark that we are running the AI
        try {
            console.log("🤔 AI Checking:", message);
            const predictions = await toxicityModel.classify([message]);

            // DEBUG: Print full analysis
            console.log("📊 Raw Predictions:", predictions);

            // Analyze predictions
            predictions.forEach(prediction => {
                // prediction.results[0].match is true if probability > threshold
                if (prediction.results[0].match) {
                    // Mapping technical labels to kid-friendly terms
                    let label = prediction.label; // e.g., 'toxicity', 'insult'
                    let friendlyRule = "Detected harmful content (AI)";

                    if (label === 'insult') friendlyRule = "AI detected an insult";
                    if (label === 'threat') friendlyRule = "AI detected a threat";
                    if (label === 'obscene') friendlyRule = "AI detected bad words";

                    // We only care about specific categories for this school context
                    // Categories: identity_attack, insult, obscene, severe_toxicity, sexual_explicit, threat, toxicity
                    if (['insult', 'threat', 'obscene', 'toxicity', 'identity_attack'].includes(label)) {
                        checkFailures.push({
                            rule: friendlyRule,
                            match: `AI (${label})`
                        });
                    }
                }
            });
        } catch (err) {
            console.error("AI Check Error:", err);
        }
    } else if (!toxicityModel) {
        console.warn("⚠️ AI Model not ready yet. Skipping AI check.");
    }

    if (checkFailures.length > 0) {
        return {
            safe: false,
            reasons: checkFailures,
            aiChecked: aiChecked
        };
    }

    return { safe: true, reasons: [], aiChecked: aiChecked };
}

/**
 * Displays a visual feedback block (Info or Warning).
 * @param {string} originalMessage - The text processed.
 * @param {Array} reasons - List of failed rules (empty if safe).
 * @param {boolean} isSafe - Whether message was allowed.
 * @param {boolean} aiChecked - Whether AI analysis ran.
 */
function showFeedback(originalMessage, reasons, isSafe, aiChecked) {
    const detailsDiv = document.getElementById('feedback-details');
    // We need to target the header text specifically
    const feedbackHeader = document.querySelector('.feedback-header span');
    const feedbackBox = document.getElementById('validation-feedback');

    detailsDiv.innerHTML = ''; // Clear previous

    if (isSafe) {
        // SUCCESS STATE
        feedbackHeader.textContent = "✅ Message Sent";
        feedbackBox.classList.add('info');
        document.querySelector('.feedback-header').classList.add('info');
        messageInput.classList.remove('error-border');

        const info = document.createElement('div');
        info.innerHTML = `
            <strong>AI Status:</strong> ${aiChecked ? "Checked (Clean)" : "Skipped (Not Needed)"}
        `;
        detailsDiv.appendChild(info);
    } else {
        // ERROR STATE
        feedbackHeader.textContent = "⚠️ Message Blocked";
        feedbackBox.classList.remove('info');
        document.querySelector('.feedback-header').classList.remove('info');
        messageInput.classList.add('error-border');

        const explanationP = document.createElement('p');
        explanationP.innerHTML = `<strong>AI Status:</strong> ${aiChecked ? "Checked (Found Issues)" : "Skipped (Blocked by word bank)"}<br><br>
                                  Your message was blocked because:`;
        detailsDiv.appendChild(explanationP);

        // List specific reasons
        reasons.forEach(failure => {
            const item = document.createElement('div');
            item.className = 'feedback-rule';

            let matchText = "";
            if (failure.match && failure.match !== "CAPS" && failure.match !== "!!!") {
                matchText = ` (Found: <span class="feedback-quote">${failure.match}</span>)`;
            }

            item.innerHTML = `<strong>${failure.rule}</strong>${matchText}`;
            detailsDiv.appendChild(item);
        });
    }

    validationFeedback.classList.remove('hidden');
}

/**
 * Creates a message bubble in the DOM.
 * @param {string} sender - Name of sender.
 * @param {string} text - Message content.
 * @param {boolean} isMe - True if sent by current user (aligns right, green color).
 */
function displayMessage(sender, text, isMe) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    if (isMe) msgDiv.classList.add('my-message');

    const authorSpan = document.createElement('span');
    authorSpan.classList.add('author');
    authorSpan.textContent = isMe ? "You" : sender;

    const textSpan = document.createElement('span');
    textSpan.textContent = text;

    msgDiv.appendChild(authorSpan);
    msgDiv.appendChild(document.createElement('br'));
    msgDiv.appendChild(textSpan);

    chatWindow.appendChild(msgDiv);

    // Auto-scroll logic happens in loadChatHistory, but doing it here ensures immediate update too
    chatWindow.scrollTop = chatWindow.scrollHeight;
}
