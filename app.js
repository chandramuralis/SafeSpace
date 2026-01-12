// --- Configuration ---
// Logic extracted from ExcelFormula.xlsx

const REGEX_RULES = {
    // Extracted from REGEXMATCH(..., "\b(idiot|loser|...)\b")
    bullyWords: new RegExp("\\b(idiot|loser|stupid|dumb|moron|jerk|trash|worthless|crybaby|weirdo|fool|lazy|ugly|nobody|pathetic|silly|annoying|ridiculous|losing|weak|lame|failure|idiotic|clown|jerkface|dummy|loserface)\\b", "i"),

    // Extracted from REGEXMATCH(..., "\b(kill|i will kill|...)\b")
    threats: new RegExp("\\b(kill|i will kill|i'll kill|gonna kill|find you|make you pay|hurt you|beat you|stab you|shoot you|strangle you|choke you|punch you|kick you|destroy you|break your legs|end you|wipe you out|come after you|i'm coming for you|watch your back|attack you|i'll get you|i will get you|i'm gonna get you|send you to hell|threaten|stalk you)\\b", "i"),

    // Extracted from REGEXMATCH(..., "\b(fuck|shit|...)\b")
    profanity: new RegExp("\\b(fuck|fcuk|shit|ass|bitch|bastard|bullshit|cunt|dick|hell|motherfucker|niger|f u|asshole|wtf|what the fuck)\\b", "i")
};

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
        messageInput.classList.remove('error-border');
    } else {
        // Message is UNSAFE!
        showWarning(text, validationResult.reasons);
    }
}

/**
 * Checks if the message violates any SafeChat rules.
 * Returns { safe: boolean, reasons: Array<{rule: string, match: string}> }
 */
function validateMessage(message) {
    let checkFailures = []; // Store object { rule: "Reason", match: "MatchedWord" }

    // 1. Bully Words
    const bullyMatch = message.match(REGEX_RULES.bullyWords);
    if (bullyMatch) {
        checkFailures.push({
            rule: "Contains unkind word",
            match: bullyMatch[0] // The specific word found
        });
    }

    // 2. Threats
    const threatMatch = message.match(REGEX_RULES.threats);
    if (threatMatch) {
        checkFailures.push({
            rule: "Contains threatening language",
            match: threatMatch[0]
        });
    }

    // 3. Profanity
    const cleanMsg = " " + message.toLowerCase().replace(/[^a-z0-9 ]/g, " ") + " ";
    const profanityMatch = cleanMsg.match(REGEX_RULES.profanity);
    if (profanityMatch) {
        // Trimming match because we added spaces for boundary checks
        checkFailures.push({
            rule: "Contains Inappropriate language",
            match: profanityMatch[0].trim()
        });
    }

    // 4. All Caps
    // RELAXED: User requested that we do not block just for upper case.
    /*
    const upperCaseCount = (message.match(/[A-Z]/g) || []).length;
    if (upperCaseCount > 4 && upperCaseCount > message.length * 0.5) {
         checkFailures.push({
            rule: "Too much shouting (All Caps)",
            match: "CAPS"
         });
    }
    */

    // 5. Exclamations
    // RELAXED: "HELLO!!!" should be allowed.
    /*
    const exclamationCount = (message.match(/!/g) || []).length;
    if (exclamationCount >= 3) {
        checkFailures.push({
            rule: "Too much shouting (Exclamations)",
            match: "!!!"
        });
    }
    */

    if (checkFailures.length > 0) {
        return {
            safe: false,
            reasons: checkFailures
        };
    }

    return { safe: true, reasons: [] };
}

function showWarning(originalMessage, reasons) {
    const detailsDiv = document.getElementById('feedback-details');
    detailsDiv.innerHTML = ''; // Clear previous

    // Show what was found
    const explanationP = document.createElement('p');
    explanationP.innerHTML = `Your message <strong>"${originalMessage}"</strong> was blocked because:`;
    detailsDiv.appendChild(explanationP);

    // List reasons
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

    validationFeedback.classList.remove('hidden');

    // Shake animation effect for the input box
    messageInput.classList.add('error-border');

    // Optional: Hide after really long time or let user close it? 
    // For educational purposes, keeping it visible is better until they type again.
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
