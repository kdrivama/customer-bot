// DOM Elements
const scenarioSelection = document.getElementById('scenario-selection');
const chatInterface = document.getElementById('chat-interface');
const resultsScreen = document.getElementById('results-screen');
const customerName = document.getElementById('customer-name');
const scenarioDesc = document.getElementById('scenario-description');
const greetingTimer = document.getElementById('greeting-timer').querySelector('.countdown');
const inactivityTimer = document.getElementById('inactivity-timer').querySelector('.countdown');
const currentScore = document.getElementById('current-score');
const starRating = document.getElementById('star-rating');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const endChatBtn = document.getElementById('end-chat-btn');
const violationWarnings = document.getElementById('violation-warnings');
const finalStars = document.getElementById('final-stars');
const finalScore = document.getElementById('final-score');
const violationsList = document.getElementById('violations-list');
const restartBtn = document.getElementById('restart-btn');
const feedbackTips = document.getElementById('feedback-tips');
const apiStatus = document.getElementById('api-status');

// Escalation/fallback modal helpers
function showEscalationModal() {
    return new Promise((resolve) => {
        const modal = document.getElementById('escalation-modal');
        if (!modal) return resolve();
        modal.classList.remove('hidden');
        // Reset steps
        document.getElementById('escalation-step-1').classList.remove('hidden');
        document.getElementById('escalation-step-2').classList.add('hidden');
        document.getElementById('escalation-feedback').classList.add('hidden');
        // Remove previous listeners
        const yesBtn = document.getElementById('escalation-yes');
        const noBtn = document.getElementById('escalation-no');
        const submitBtn = document.getElementById('escalation-submit');
        yesBtn.onclick = null;
        noBtn.onclick = null;
        submitBtn.onclick = null;
        // Logic for scenario
        yesBtn.onclick = () => {
            if (currentScenario === 'sarah') {
                // Wrong for Sarah
                sendEscalationResult({ escalate: true }).then(() => {
                    modal.classList.add('hidden');
                    resolve();
                });
            } else {
                // Michael: show step 2
                document.getElementById('escalation-step-1').classList.add('hidden');
                document.getElementById('escalation-step-2').classList.remove('hidden');
                submitBtn.onclick = () => {
                    const phone = document.getElementById('escalation-phone').value.trim();
                    const email = document.getElementById('escalation-email').value.trim();
                    const team = document.getElementById('escalation-team').value;
                    sendEscalationResult({ escalate: true, phone, email, team }).then(() => {
                        modal.classList.add('hidden');
                        resolve();
                    });
                };
            }
        };
        noBtn.onclick = () => {
            if (currentScenario === 'michael') {
                // Wrong for Michael
                sendEscalationResult({ escalate: false }).then(() => {
                    modal.classList.add('hidden');
                    resolve();
                });
            } else {
                // Sarah: correct
                sendEscalationResult({ escalate: false }).then(() => {
                    modal.classList.add('hidden');
                    resolve();
                });
            }
        };
    });
}
async function sendEscalationResult(payload) {
    let result = null;
    try {
        const response = await fetch('/api/escalation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, scenario: currentScenario, ...payload })
        });
        result = await response.json();
    } catch (e) {}

    // Show the verdict on the escalation call before the results screen, so the
    // trainee connects the feedback to the decision they just made.
    const feedbackEl = document.getElementById('escalation-feedback');
    if (!feedbackEl || !result || !result.feedback) return;

    document.getElementById('escalation-step-1').classList.add('hidden');
    document.getElementById('escalation-step-2').classList.add('hidden');

    feedbackEl.classList.remove('hidden', 'correct', 'incorrect');
    feedbackEl.classList.add(result.correct ? 'correct' : 'incorrect');
    feedbackEl.innerHTML = `
        <h2>${result.correct ? 'Correct call' : 'Escalation miss'}</h2>
        <p class="modal-lead">${result.feedback}</p>
        <div class="modal-actions">
            <button id="escalation-continue" class="modal-btn primary">See my results</button>
        </div>
    `;

    await new Promise(resolve => {
        document.getElementById('escalation-continue').onclick = resolve;
    });
}

// State variables
let sessionId = null;
let currentScenario = null;
let greetingInterval = null;
let inactivityInterval = null;
let greetingSeconds = 15;
let inactivitySeconds = 120;
let score = 0;
let violations = [];
let sessionEnded = false;
let fallbackMode = false;
let fallbackNotified = false;
let waitingPeriod = null;

// Scenario data for evidence display
const scenarios = {
    sarah: {
        name: "Sarah Johnson",
        description: "Wrong Item Received",
        evidence: {
            barcode: "https://drive.google.com/file/d/1JWu_ht4350vqCv3ERzcuSvjv9Iqv3qOy",
            packagingSlip: "https://drive.google.com/file/d/1YKcXdFbmT_McIikTpy1lORkmZMtKZ8KR",
            shippingLabel: "https://drive.google.com/file/d/1iEL7Qjic6Fw9UdWjxhpa3kv3HFm7iG8R"
        },
        initialMessage: "I ordered an iPhone 15 Pro but got an iPhone 14! This is unacceptable! I need a replacement now with compensation!"
    },
    michael: {
        name: "Michael Chen",
        description: "Return Rejected",
        evidence: {
            // Must match the URL server.js declares for this scenario. The previous
            // i.ibb.co image 404s, which showed the trainee a broken evidence link.
            damageImage: "https://drive.google.com/file/d/1zP60wW7ryl9XsCCTxxaMEddQl4vgMaDp"
        },
        initialMessage: "What the f*ck! I returned those headphones because the product is damaged when i received, and now you're telling me I don't get a refund? I want to speak to someone who can actually help, or I'm going to report this to the police!"
    }
};

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Inject escalation and fallback modals
    fetch('escalationModal.html').then(res => res.text()).then(html => {
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = html;
        document.body.appendChild(modalDiv);
    });
    // Inject escalation modal CSS
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'escalationModal.css';
    document.head.appendChild(css);
    document.querySelectorAll('.scenario-card').forEach(card => {
        card.addEventListener('click', () => startScenario(card.dataset.scenario));
    });

    sendBtn.addEventListener('click', sendMessage);
    endChatBtn.addEventListener('click', endSession);
    userInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    restartBtn.addEventListener('click', () => {
        resultsScreen.classList.add('hidden');
        scenarioSelection.classList.remove('hidden');
        sessionEnded = false;
        fallbackMode = false;
    });
});

// Start scenario
async function startScenario(scenario) {
    currentScenario = scenario;
    
    // Update UI
    customerName.textContent = scenarios[scenario].name;
    scenarioDesc.textContent = scenarios[scenario].description;
    scenarioSelection.classList.add('hidden');
    chatInterface.classList.remove('hidden');
    
    // Reset state
    score = 0;
    violations = [];
    greetingSeconds = 15;
    inactivitySeconds = 180;
    currentScore.textContent = `${score}/100`;
    starRating.textContent = '⭐⭐⭐⭐⭐';
    chatMessages.innerHTML = '';
    violationWarnings.textContent = '';
    userInput.disabled = false;
    sendBtn.disabled = false;
    endChatBtn.disabled = false;
    fallbackMode = false;
    waitingPeriod = null;
    
    try {
        // Start session with backend
        const response = await fetch('/api/session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario })
        });
        
        const data = await response.json();
        sessionId = data.sessionId;

        // Use the server's opening line — it is rephrased in character like every
        // other customer line, so the AI is visible from the first screen.
        addMessage(data.initialMessage || scenarios[scenario].initialMessage, 'bot');
        updateAiStatus(data.aiActive);
        
        // Start timers
        startTimers();
        
        // Send initial request to get first set of options
        setTimeout(() => {
            sendMessage("start");
        }, 1000);
        
    } catch (error) {
        console.error('Error starting session:', error);
        alert('Failed to start session. Please try again.');
    }
}

// Start timers
function startTimers() {
    // ... keep existing code (timer functionality)
    if (greetingInterval) clearInterval(greetingInterval);
    if (inactivityInterval) clearInterval(inactivityInterval);
    
    greetingInterval = setInterval(() => {
        greetingSeconds--;
        greetingTimer.textContent = `${greetingSeconds}s`;
        
        if (greetingSeconds <= 0) {
            clearInterval(greetingInterval);
            if (!document.querySelector('.user-message')) {
                violations.push({
                    category: 'greeting',
                    points: 10,
                    reason: 'Failed to greet customer within 15 seconds'
                });
                updateScore(-10);
                violationWarnings.textContent = 'Violation: Greeting not sent within 15 seconds!';
            }
        }
    }, 1000);
    
    inactivityInterval = setInterval(() => {
        inactivitySeconds--;
        inactivityTimer.textContent = `${inactivitySeconds}s`;
        
        if (inactivitySeconds <= 0) {
            clearInterval(inactivityInterval);
            addMessage("What's taking so long? What solution are you proposing?", 'bot');
            violations.push({
                category: 'efficiency',
                points: 10,
                reason: 'Took too long to respond (3+ minutes)'
            });
            updateScore(-10);
            inactivitySeconds = 180;
        }
    }, 1000);
}

// Add message to chat
function addMessage(text, sender, evidenceKey = null) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    
    const messageText = document.createElement('div');
    messageText.classList.add('message-text');
    
    if (evidenceKey) {
        const evidence = scenarios[currentScenario].evidence[evidenceKey];
        let evidenceHTML = `<div class="evidence-container"><p><strong>Evidence provided:</strong></p>`;
        if (currentScenario === 'michael') {
            evidenceHTML += `<a href="${evidence}" target="_blank">${evidence}</a>`;
        } else if (evidence.includes('drive.google.com')) {
            evidenceHTML += `<a href="${evidence}" target="_blank">${evidence}</a>`;
        } else {
            evidenceHTML += `<img src="${evidence}" alt="Evidence" class="evidence-image" />`;
        }
        evidenceHTML += `</div>`;
        messageText.innerHTML = evidenceHTML;
    } else {
        messageText.textContent = text;
    }
    
    const messageTime = document.createElement('div');
    messageTime.classList.add('message-time');
    messageTime.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageDiv.appendChild(messageText);
    messageDiv.appendChild(messageTime);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // ... keep existing code (image enlargement and termination check)
    if (evidenceKey) {
        const images = messageDiv.querySelectorAll('.evidence-image');
        images.forEach(img => {
            img.addEventListener('click', () => {
                img.classList.toggle('enlarged');
            });
        });
    }
    
    if (text.includes("THIS CONVERSATION IS TERMINATED")) {
        messageDiv.classList.add('termination-message');
        userInput.disabled = true;
        sendBtn.disabled = true;
        endChatBtn.disabled = true;
        sessionEnded = true;
        
        setTimeout(() => {
            endSession();
        }, 5000);
    }
}

// Display multiple choice options
function displayOptions(options) {
    if (!options || options.length === 0) return;
    
    // Hide text input and show options
    userInput.style.display = 'none';
    sendBtn.style.display = 'none';
    
    const optionsContainer = document.createElement('div');
    optionsContainer.classList.add('options-container');
    
    options.forEach(option => {
        const optionBtn = document.createElement('button');
        optionBtn.classList.add('option-button');
        optionBtn.textContent = option.text;
        optionBtn.onclick = () => selectOption(option.id, option.text);
        optionsContainer.appendChild(optionBtn);
    });
    
    chatMessages.appendChild(optionsContainer);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle option selection
async function selectOption(optionId, optionText) {
    // Add user's selected option to chat
    addMessage(optionText, 'user');
    
    // Remove options container
    const optionsContainer = document.querySelector('.options-container');
    if (optionsContainer) {
        optionsContainer.remove();
    }
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, message: optionText, optionId })
        });
        
        const data = await response.json();
        
        // Set fallback mode based on response
        fallbackMode = data.fallbackMode;
        
        // Always show the bot's response first so the chat never looks frozen
        if (data.botResponse) {
            if (optionId === 'hold' && data.botResponse === 'Timer extended. Take your time.') {
                const infoMsg = document.createElement('div');
                infoMsg.className = 'system-message';
                infoMsg.textContent = data.botResponse;
                chatMessages.appendChild(infoMsg);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            } else {
                addMessage(data.botResponse, 'bot');
            }
        }

        updateAiStatus(data.aiActive);

        // Apply the score before any early return below, otherwise the turn that
        // opens the guided-mode modal leaves the header showing a stale 0/100.
        if (data.state) {
            if (data.state.points !== undefined) {
                score = data.state.points;
                currentScore.textContent = `${score}/100`;
                updateStarRating();
            }

            if (data.state.violations) {
                violations = data.state.violations;
                if (data.state.violations.length > 0) {
                    violationWarnings.textContent = data.state.violations[0].reason;
                }
            }
        }

        // Show fallback modal only ONCE, right after the initial bot message in fallback mode.
        // The modal markup is injected asynchronously, so fall through to the normal
        // flow if it has not landed yet rather than throwing on a null element.
        const fallbackModal = document.getElementById('fallback-modal');
        if (fallbackMode && !fallbackNotified && fallbackModal && chatMessages.children.length <= 3) {
            fallbackNotified = true;
            fallbackModal.classList.remove('hidden');
            document.getElementById('fallback-ok').onclick = () => {
                fallbackModal.classList.add('hidden');
                // After notification, show options if available
                if (data.options) displayOptions(data.options);
            };
            return;
        }
        
        // Show evidence if requested
        if (data.showEvidence && data.evidenceType) {
            setTimeout(() => {
                showEvidence(data.evidenceType);
            }, 1000);
        }
        
        // Handle waiting period
        if (data.waitingPeriod) {
            handleWaitingPeriod(data.waitingPeriod);
        }
        
        // Show new options if available
        if (data.options) {
            setTimeout(() => {
                displayOptions(data.options);
            }, 2000);
        } else {
            // Restore text input if no options
            userInput.style.display = 'inline-block';
            sendBtn.style.display = 'inline-block';
        }
        
        // Reset inactivity timer
        if (optionId === 'hold') {
            inactivitySeconds = 120;
            inactivityTimer.textContent = `${inactivitySeconds}s`;
        } else {
            inactivitySeconds = 120;
            inactivityTimer.textContent = `${inactivitySeconds}s`;
        }
        
    } catch (error) {
        console.error('Error selecting option:', error);
        // Restore text input on error
        userInput.style.display = 'inline-block';
        sendBtn.style.display = 'inline-block';
    }
}

// Show evidence for scenarios
function showEvidence(evidenceType) {
    if (evidenceType === 'sarah') {
        addMessage("Here are the documents you requested:", 'bot');
        addMessage("", 'bot', 'barcode');
        addMessage("", 'bot', 'packagingSlip');
        addMessage("", 'bot', 'shippingLabel');
    } else if (evidenceType === 'michael') {
        addMessage("Here's the damage evidence:", 'bot');
        addMessage("", 'bot', 'damageImage');
    }
}

// Handle waiting periods
function handleWaitingPeriod(waitingData) {
    waitingPeriod = waitingData;
    
    // Show waiting message
    setTimeout(() => {
        if (waitingPeriod) {
            addMessage(waitingData.warningMessage, 'bot');
            
            // Second timeout for termination
            setTimeout(() => {
                if (waitingPeriod) {
                    addMessage(waitingData.terminationMessage, 'bot');
                    addMessage("THIS CONVERSATION IS TERMINATED due to excessive wait time.", 'bot');
                }
            }, waitingData.duration);
        }
    }, waitingData.duration);
}

// Enhanced sendMessage function
async function sendMessage(message = null) {
    const messageText = message || userInput.value.trim();
    if (!messageText || sessionEnded) return;
    
    // Add user message to UI if not from option selection
    if (!message) {
        addMessage(messageText, 'user');
        userInput.value = '';
    }
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, message: messageText })
        });
        
        const data = await response.json();
        
        // Set fallback mode
        fallbackMode = data.fallbackMode;
        updateAiStatus(data.aiActive);

        if (data.fallbackMode) {
            // Show options if available
            if (data.options) {
                displayOptions(data.options);
                return;
            }
        }
        
        // Add bot response
        if (data.botResponse) {
            addMessage(data.botResponse, 'bot');
        }
        
        // ... keep existing code (state updates and timer resets)
        if (data.state && data.state.points !== undefined) {
            score = data.state.points;
            currentScore.textContent = `${score}/100`;
            updateStarRating();
        }
        
        if (data.state && data.state.violations) {
            violations = data.state.violations;
            if (data.state.violations.length > 0) {
                violationWarnings.textContent = data.state.violations[0].reason;
            }
        }
        
        inactivitySeconds = 180;
        inactivityTimer.textContent = `${inactivitySeconds}s`;
        
    } catch (error) {
        console.error('Communication error:', error);
        addMessage("I'm experiencing technical difficulties, but I can still help you...", 'bot');
        fallbackMode = true;
    }
}

// Report whether the customer's last line was rewritten by the AI or came straight
// from the script. Every turn is "fallbackMode" because the script always drives the
// options, so that flag must not be used to answer this question.
function updateAiStatus(aiActive) {
    if (!apiStatus) return;
    // null means the turn produced no customer line, so it carries no verdict —
    // leave whatever the last real turn reported rather than overwriting it.
    if (aiActive === undefined || aiActive === null) return;

    if (aiActive) {
        apiStatus.textContent = '🟢 AI live — replies in character';
        apiStatus.style.color = '#2ecc71';
    } else {
        apiStatus.textContent = '⚪ Scripted reply';
        apiStatus.style.color = '#999';
    }
}

// Update star rating based on score
function updateStarRating() {
    let stars = 5;
    if (score >= 90) stars = 5;
    else if (score >= 75) stars = 4;
    else if (score >= 60) stars = 3;
    else if (score >= 45) stars = 2;
    else stars = 1;
    starRating.textContent = '⭐'.repeat(stars);
}

// Update score
function updateScore(points) {
    score += points;
    if (score > 100) score = 100;
    if (score < 0) score = 0;
    currentScore.textContent = `${score}/100`;
    updateStarRating();
}

// End session and show results
async function endSession() {
    // Show escalation modal before ending session
    if (document.getElementById('escalation-modal')) {
        await showEscalationModal();
    }
    // ... keep existing code (timer cleanup and results display)
    clearInterval(greetingInterval);
    clearInterval(inactivityInterval);
    
    try {
        const response = await fetch('/api/session/end', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
        
        const data = await response.json();
        console.log('Session end response:', data);
        
        let stars = 5;
        if (data.score.percentage >= 90) stars = 5;
        else if (data.score.percentage >= 75) stars = 4;
        else if (data.score.percentage >= 60) stars = 3;
        else if (data.score.percentage >= 45) stars = 2;
        else stars = 1;
        
        finalStars.textContent = '⭐'.repeat(stars);
        finalScore.textContent = data.score.percentage;
        
        violationsList.innerHTML = '';
        if (data.score.violations && data.score.violations.length > 0) {
            data.score.violations.forEach(violation => {
                const li = document.createElement('li');
                li.textContent = `${violation.reason} (-${violation.points} points)`;
                violationsList.appendChild(li);
            });
        }
        if (data.score.terminated) {
            const warning = document.createElement('li');
            warning.classList.add('termination-warning');
            warning.textContent = 'CRITICAL FAILURE: Conversation terminated due to company reputation damage';
            violationsList.prepend(warning);
            // Always show violation for early termination
            const li = document.createElement('li');
            li.textContent = 'Session ended early: Agent did not follow knowledge base or best practices.';
            violationsList.appendChild(li);
        } else if ((!data.score.violations || data.score.violations.length === 0) && data.score.percentage >= 70) {
            const li = document.createElement('li');
            li.textContent = 'No violations! Perfect session!';
            violationsList.appendChild(li);
        }
        
        generateFeedbackTips(data.score.violations, data.score.terminated, data.score.percentage);
        
        chatInterface.classList.add('hidden');
        resultsScreen.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error ending session:', error);
        alert('Failed to end session properly.');
    }
}

// Generate feedback tips based on violations
function generateFeedbackTips(violations = [], terminated = false, score = 100) {
    feedbackTips.innerHTML = '';
    // If terminated or score < 70, do not show 'Perfect Session!'
    if ((!violations || violations.length === 0) && !terminated && score >= 70) {
        feedbackTips.innerHTML = `
            <div class="feedback-item success">
                <h3>Perfect Session!</h3>
                <p>You followed all best practices correctly. Keep up the great work!</p>
            </div>
        `;
        return;
    }
    // If terminated or score < 70, show a reminder
    if (terminated || score < 70) {
        feedbackTips.innerHTML += `
            <div class="feedback-item">
                <h3>Score Improvement Needed</h3>
                <p>Your score is too low or the session was terminated. Please review the knowledge base and best practices to improve your performance.</p>
            </div>
        `;
    }
    
    const tipsMap = {
        'greeting': {
            title: 'Greeting Timing Issue',
            tip: 'Always greet the customer within the first 15 seconds of the conversation.'
        },
        'empathy': {
            title: 'Empathy Not Shown',
            tip: 'Express empathy early in the conversation to build rapport with the customer.'
        },
        'probing': {
            title: 'Incomplete Probing',
            tip: 'Always ask for the order ID and necessary evidence to verify the issue.'
        },
        'on_hold': {
            title: 'Hold Time Exceeded',
            tip: 'When putting a customer on hold, always inform them and respond within 2 minutes.'
        },
        'solution': {
            title: 'Solution Incomplete',
            tip: 'Always thank the customer and provide a clear solution to their problem.'
        },
        'reconfirm': {
            title: 'Reconfirmation Missing',
            tip: 'After providing a solution, ask if the customer has any other questions.'
        },
        'closing': {
            title: 'Improper Closing',
            tip: 'Always end the session with a proper closing statement.'
        },
        'escalation': {
            title: 'Escalation Not Initiated',
            tip: 'When a customer asks for a manager, escalate immediately.'
        },
        'wrong_response': {
            title: 'Inappropriate Response',
            tip: 'Select appropriate responses that show empathy and professionalism.'
        },
        'termination': {
            title: 'Session Terminated',
            tip: 'Avoid responses that can escalate the situation or damage company reputation.'
        }
    };
    
    violations.forEach(violation => {
        const category = violation.category;
        if (tipsMap[category]) {
            const tipItem = document.createElement('div');
            tipItem.classList.add('feedback-item');
            tipItem.innerHTML = `
                <h3>${tipsMap[category].title}</h3>
                <p>${tipsMap[category].tip}</p>
                <p><strong>Violation:</strong> ${violation.reason}</p>
            `;
            feedbackTips.appendChild(tipItem);
        }
    });
}
