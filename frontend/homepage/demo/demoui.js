// demoui.js

// -----------------------------------------------------------------------------
// !! IMPORTANT !!
// UPDATE THIS URL WITH YOUR NGROK FORWARDING ADDRESS
// -----------------------------------------------------------------------------
const API_BASE_URL = 'https://YOUR-NGROK-URL.ngrok-free.app'; 
// -----------------------------------------------------------------------------


// --- DOM Elements ---
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('status');
const recordingIndicator = document.getElementById('recordingIndicator');

const videoFeed = document.getElementById('videoFeed');
const videoPlaceholder = document.getElementById('videoPlaceholder');

const confidenceVal = document.getElementById('confidence');
const confidenceBar = document.getElementById('confidenceBar');
const eyeContactVal = document.getElementById('eyeContact');
const eyeContactBar = document.getElementById('eyeContactBar');
const clarityVal = document.getElementById('clarity');
const clarityBar = document.getElementById('clarityBar');
const postureVal = document.getElementById('posture');
const postureBar = document.getElementById('postureBar');

const transcriptEl = document.getElementById('transcript');
const transcriptPlaceholder = document.getElementById('transcriptPlaceholder');
const feedbackEl = document.getElementById('feedbackContainer');
const feedbackPlaceholder = document.getElementById('feedbackPlaceholder');
const grantsEl = document.getElementById('grantsContainer');
const grantsPlaceholder = document.getElementById('grantsPlaceholder');

// --- State ---
let mediaRecorder;
let audioChunks = [];
let poseInterval;
let isInterviewRunning = false;

// --- Event Listeners ---
startBtn.addEventListener('click', startInterview);
stopBtn.addEventListener('click', stopInterview);

// --- Core Functions ---

async function startInterview() {
    console.log('Starting interview...');
    isInterviewRunning = true;

    // --- UI Updates ---
    startBtn.disabled = true;
    stopBtn.disabled = false;
    recordingIndicator.style.display = 'block';
    setStatus('INTERVIEW IN PROGRESS... AUDIO RECORDING ACTIVE.');
    
    // Clear previous results
    transcriptEl.innerHTML = '';
    transcriptEl.appendChild(transcriptPlaceholder);
    feedbackEl.innerHTML = '';
    feedbackEl.appendChild(feedbackPlaceholder);
    grantsEl.innerHTML = '';
    grantsEl.appendChild(grantsPlaceholder);

    // --- Start Video Stream ---
    // We use an <img> tag and set the src to the video stream endpoint.
    // The backend serves it as 'multipart/x-mixed-replace; boundary=frame'
    // which browsers can render directly in an <img> tag.
    videoFeed.src = `${API_BASE_URL}/api/videostream`; // API path from videostream.js
    videoFeed.style.display = 'block';
    videoFeed.classList.add('video-active');
    videoPlaceholder.style.display = 'none';

    // --- Start Audio Recording ---
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = []; // Clear old chunks

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = handleAudioStop;
        mediaRecorder.start();
        
    } catch (err) {
        console.error('Error getting audio stream:', err);
        setStatus('ERROR: Could not access microphone.', true);
        stopInterview(); // Abort
        return;
    }

    // --- Start Pose/Analysis Polling ---
    // In a real app, this would be a WebSocket. For a hackathon, polling is fine.
    poseInterval = setInterval(fetchPoseData, 1000); // Poll every second

    // --- Run Background Scan (Once) ---
    scanRoomBackground();
}

function stopInterview() {
    console.log('Stopping interview...');
    if (!isInterviewRunning) return;
    isInterviewRunning = false;

    // --- UI Updates ---
    startBtn.disabled = false;
    stopBtn.disabled = true;
    recordingIndicator.style.display = 'none';
    setStatus('SYSTEM READY • AWAITING INPUT');

    // --- Stop Video Stream ---
    videoFeed.src = ''; // Stop the stream
    videoFeed.style.display = 'none';
    videoFeed.classList.remove('video-active');
    videoPlaceholder.style.display = 'flex';

    // --- Stop Audio Recording ---
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop(); // This will trigger the 'onstop' event
    }

    // --- Stop Pose Polling ---
    clearInterval(poseInterval);
    resetAnalysisMetrics();
}

/**
 * This function is called automatically when mediaRecorder.stop() is executed.
 */
async function handleAudioStop() {
    console.log('Audio recording stopped. Processing...');
    setStatus('PROCESSING AUDIO... PLEASE WAIT.');

    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });

    // 1. Transcribe Audio
    const transcription = await transcribeAudio(audioBlob);
    
    if (transcription) {
        // 2. Get AI Feedback
        await getAIFeedback(transcription);
    } else {
        setStatus('Audio processing failed. No transcription available.', true);
    }
}

// --- API Call Functions ---

/**
 * 1. Sends audio to the /transcribe endpoint
 */
async function transcribeAudio(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'interview-audio.wav');

    try {
        const response = await fetch(`${API_BASE_URL}/api/transcribe/transcribe`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

        const data = await response.json();
        const transcription = data.transcription;

        console.log('Transcription received:', transcription);
        transcriptPlaceholder.style.display = 'none';
        transcriptEl.innerHTML = `<p>${transcription}</p>`;
        setStatus('TRANSCRIPTION COMPLETE. FETCHING AI FEEDBACK...');
        
        // Mock clarity score based on transcription length (hackathon demo logic)
        const clarity = Math.min(Math.round(transcription.length / 2), 100);
        updateAnalysisBar(clarityVal, clarityBar, clarity);

        return transcription;

    } catch (err) {
        console.error('Error during transcription:', err);
        setStatus(`Transcription Error: ${err.message}`, true);
        transcriptPlaceholder.style.display = 'block';
        transcriptEl.innerHTML = '<div class="placeholder-text" id="transcriptPlaceholder">Audio transcription failed.</div>';
        return null;
    }
}

/**
 * 2. Sends transcription to the /llm/advice endpoint
 */
async function getAIFeedback(transcription) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/llm/advice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: transcription }), // Match backend's expected format
        });

        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
        
        const feedbackText = await response.json(); // Backend sends text directly

        console.log('AI feedback received:', feedbackText);
        feedbackPlaceholder.style.display = 'none';
        feedbackEl.innerHTML = `<p>${feedbackText.replace(/\n/g, '<br>')}</p>`;
        setStatus('AI FEEDBACK LOADED. INTERVIEW COMPLETE.');

        // --- HACKATHON DEMO LOGIC ---
        // After getting feedback, we simulate "Grant Matching"
        // In a real app, the feedback/transcription would be used to query a grant DB.
        // Here, we just show some dummy data.
        grantsPlaceholder.style.display = 'none';
        grantsEl.innerHTML = `
            <p><strong>MATCH: The Innovator's Seed Fund</strong><br>Based on your focus on "scalable technology" and "market disruption".</p>
            <p><strong>MATCH: Social Impact Grant</strong><br>Your emphasis on "community" and "accessibility" aligns with this grant.</p>
            <p><strong>MATCH: AI for Good Foundation</strong><br>Your project's AI component is a strong fit.</p>
        `;

    } catch (err) {
        console.error('Error getting AI feedback:', err);
        setStatus(`AI Feedback Error: ${err.message}`, true);
        feedbackPlaceholder.style.display = 'block';
        feedbackEl.innerHTML = '<div class="placeholder-text" id="feedbackPlaceholder">Failed to get AI feedback.</div>';
    }
}

/**
 * 3. Polls the /jetson-pose endpoint (and fakes analysis)
 */
async function fetchPoseData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/jetson/jetson-pose`);
        if (!response.ok) throw new Error('Jetson not responding');
        
        const poseData = await response.json();
        // console.log('Pose data:', poseData); 
        
        // --- HACKATHON DEMO LOGIC ---
        // Your /jetson-pose endpoint's content is unknown.
        // For the demo, we'll just generate FAKE analysis data.
        // In a real app, your Jetson would analyze poseData and return these metrics.
        const fakeConfidence = 70 + Math.floor(Math.random() * 20); // 70-90%
        const fakeEyeContact = 60 + Math.floor(Math.random() * 30); // 60-90%
        const fakePosture = 80 + Math.floor(Math.random() * 15);     // 80-95%

        updateAnalysisBar(confidenceVal, confidenceBar, fakeConfidence);
        updateAnalysisBar(eyeContactVal, eyeContactBar, fakeEyeContact);
        updateAnalysisBar(postureVal, postureBar, fakePosture);

        // --- Demo Servo Control ---
        // We can also randomly move the servo to simulate "tracking"
        const randomAngle = 90 + Math.floor(Math.random() * 40 - 20); // 70-110
        await controlServo(randomAngle);

    } catch (err) {
        console.error('Error fetching pose data:', err);
        // Don't flood status, just log it
        console.warn('Pose data polling failed.');
        
        // If polling fails, reset bars to 0
        resetAnalysisMetrics();
    }
}

/**
 * 4. Calls the /jetson-servo endpoint
 */
async function controlServo(angle) {
    try {
        await fetch(`${API_BASE_URL}/api/jetson/jetson-servo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ angle: Math.round(angle) }),
        });
        // console.log(`Servo moved to ${angle}`);
    } catch (err) {
        console.error('Error controlling servo:', err);
    }
}

/**
 * 5. Calls the /analyze-image endpoint
 */
async function scanRoomBackground() {
    try {
        setStatus('Scanning room background...');
        const response = await fetch(`${API_BASE_URL}/api/scanroom/analyze-image`, {
            method: 'POST',
        });
        if (!response.ok) throw new Error('Failed to analyze room');
        
        const data = await response.json();
        console.log('Room scan result:', data.result);
        
        // Add this to the feedback panel
        const existingFeedback = feedbackEl.innerHTML;
        feedbackPlaceholder.style.display = 'none';
        feedbackEl.innerHTML = `<p><strong>Background Analysis:</strong><br>${data.result}</p>` + existingFeedback;

    } catch (err) {
        console.error('Error scanning room:', err);
        // Don't overwrite main status, just add to feedback
        const existingFeedback = feedbackEl.innerHTML;
        feedbackPlaceholder.style.display = 'none';
        feedbackEl.innerHTML = `<p><strong>Background Analysis:</strong><br>Could not analyze room.</p>` + existingFeedback;
    }
}


// --- Utility Functions ---

function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#ff4d4d' : 'var(--text-muted)';
}

function updateAnalysisBar(valueEl, barEl, percentage) {
    valueEl.textContent = `${percentage}%`;
    barEl.style.width = `${percentage}%`;
}

function resetAnalysisMetrics() {
    updateAnalysisBar(confidenceVal, confidenceBar, 0);
    updateAnalysisBar(eyeContactVal, eyeContactBar, 0);
    updateAnalysisBar(clarityVal, clarityBar, 0);
    updateAnalysisBar(postureVal, postureBar, 0);
}