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
window.addEventListener('load', () => {
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
 * 1. Validates the message against bullying rules.
 * 2. If safe, saves to LocalStorage.
 * 3. If unsafe, shows a warning.
 */
function handleSendMessage() {
    const text = messageInput.value.trim();
    if (!text) return; // Don't send empty messages

    // 1. VALIDATION LOGIC
    const validationResult = validateMessage(text);

    if (validationResult.safe) {
        // Message is safe!

        // Save to History (LocalStorage)
        saveMessageToHistory(currentUser, text);

        messageInput.value = ""; // Clear input
        validationFeedback.classList.add('hidden');
        messageInput.classList.remove('error-border');
    } else {
        // Message is UNSAFE!
        showWarning(text, validationResult.reasons);
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
 * @param {string} message - The message text to check.
 * @returns {object} { safe: boolean, reasons: Array<{rule: string, match: string}> }
 */
function validateMessage(message) {
    let checkFailures = []; // Store failures: { rule: "Reason", match: "MatchedWord" }

    // 1. Check Bullying Words
    const bullyMatch = message.match(REGEX_RULES.bullyWords);
    if (bullyMatch) {
        checkFailures.push({
            rule: "Contains unkind word",
            match: bullyMatch[0] // The specific word found
        });
    }

    // 2. Check Threats
    const threatMatch = message.match(REGEX_RULES.threats);
    if (threatMatch) {
        checkFailures.push({
            rule: "Contains threatening language",
            match: threatMatch[0]
        });
    }

    // 3. Check Profanity
    // We normalize the string (lower case, remove some punctuation) to catch tricks like "f.u.c.k"
    const cleanMsg = " " + message.toLowerCase().replace(/[^a-z0-9 ]/g, " ") + " ";
    const profanityMatch = cleanMsg.match(REGEX_RULES.profanity);
    if (profanityMatch) {
        checkFailures.push({
            rule: "Contains Inappropriate language",
            match: profanityMatch[0].trim()
        });
    }

    // Note: All-Caps and Exclamation rules were removed based on user feedback to be less strict.

    if (checkFailures.length > 0) {
        return {
            safe: false,
            reasons: checkFailures
        };
    }

    return { safe: true, reasons: [] };
}

/**
 * Displays a visual warning block detailing why a message was rejected.
 * @param {string} originalMessage - The text user tried to send.
 * @param {Array} reasons - List of failed rules.
 */
function showWarning(originalMessage, reasons) {
    const detailsDiv = document.getElementById('feedback-details');
    detailsDiv.innerHTML = ''; // Clear previous warnings

    // Header
    const explanationP = document.createElement('p');
    explanationP.innerHTML = `Your message <strong>"${originalMessage}"</strong> was blocked because:`;
    detailsDiv.appendChild(explanationP);

    // List specific reasons
    reasons.forEach(failure => {
        const item = document.createElement('div');
        item.className = 'feedback-rule';

        let matchText = "";
        // Don't repeat the word if it was a generic rule like CAPS
        if (failure.match && failure.match !== "CAPS" && failure.match !== "!!!") {
            matchText = ` (Found: <span class="feedback-quote">${failure.match}</span>)`;
        }

        item.innerHTML = `<strong>${failure.rule}</strong>${matchText}`;
        detailsDiv.appendChild(item);
    });

    validationFeedback.classList.remove('hidden');

    // Add red border and shake animation to input
    messageInput.classList.add('error-border');
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
