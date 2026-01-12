// --- Configuration ---
// In a real app, this might come from a server or a more complex AI model.
// For this POC, we use a simple list of "bad words".
const BULLYING_KEYWORDS = [
    "stupid", "idiot", "dumb", "hate", "ugly", 
    "shut up", "loser", "kill", "die", "fat", "weirdo"
];

// --- State ---
let currentUser = "";

// --- Elements ---
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

// Login
loginBtn.addEventListener('click', handleLogin);
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});

// Logout
logoutBtn.addEventListener('click', () => {
    currentUser = "";
    toggleSections(false);
    usernameInput.value = "";
    loginError.classList.add('hidden');
});

// Send Message
sendBtn.addEventListener('click', handleSendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendMessage();
});

// --- Functions ---

function handleLogin() {
    const name = usernameInput.value.trim();
    if (name) {
        currentUser = name;
        currentUserDisplay.textContent = currentUser;
        loginError.classList.add('hidden');
        toggleSections(true);
    } else {
        loginError.classList.remove('hidden');
    }
}

function toggleSections(isLoggedIn) {
    if (isLoggedIn) {
        loginSection.classList.add('hidden');
        chatSection.classList.remove('hidden');
        messageInput.focus();
    } else {
        loginSection.classList.remove('hidden');
        chatSection.classList.add('hidden');
        usernameInput.focus();
    }
}

function handleSendMessage() {
    const text = messageInput.value.trim();
    if (!text) return; // Don't send empty messages

    // 1. VALIDATION LOGIC
    const validationResult = validateMessage(text);

    if (validationResult.safe) {
        // Message is safe!
        displayMessage(currentUser, text, true);
        messageInput.value = ""; // Clear input
        validationFeedback.classList.add('hidden');
    } else {
        // Message is UNSAFE!
        showWarning(validationResult.reason);
    }
}

/**
 * Checks if the message contains any bullying words.
 * Returns { safe: boolean, reason: string }
 */
function validateMessage(message) {
    const lowerCaseMsg = message.toLowerCase();
    
    // Check for specific words
    for (let word of BULLYING_KEYWORDS) {
        if (lowerCaseMsg.includes(word)) {
            return { 
                safe: false, 
                reason: `⚠️ Warning: The word "${word}" is not kind. Please be nice!` 
            };
        }
    }

    return { safe: true, reason: "" };
}

function showWarning(reason) {
    validationFeedback.textContent = reason;
    validationFeedback.classList.remove('hidden');
    validationFeedback.className = "feedback-msg warning-style";
    
    // Shake animation effect for the input box
    messageInput.classList.add('error-border');
    setTimeout(() => {
        validationFeedback.classList.add('hidden'); // Hide after 3 seconds
    }, 4000);
}

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
    
    // Auto-scroll to bottom
    chatWindow.scrollTop = chatWindow.scrollHeight;
}
