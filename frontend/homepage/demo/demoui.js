// demoui.js

// -----------------------------------------------------------------------------
// !! IMPORTANT !!
// UPDATE THIS URL WITH YOUR NGROK FORWARDING ADDRESS
// -----------------------------------------------------------------------------
const API_BASE_URL = 'https://interdorsal-roxy-emotional.ngrok-free.dev';
// -----------------------------------------------------------------------------


// --- DOM Elements ---
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('status');
const recordingIndicator = document.getElementById('recordingIndicator');

const videoFeed = document.getElementById('videoFeed');
const videoPlaceholder = document.getElementById('videoPlaceholder');

// Analysis Metrics
const confidenceVal = document.getElementById('confidence');
const confidenceBar = document.getElementById('confidenceBar');
const eyeContactVal = document.getElementById('eyeContact');
const eyeContactBar = document.getElementById('eyeContactBar');
const clarityVal = document.getElementById('clarity');
const clarityBar = document.getElementById('clarityBar');
const postureVal = document.getElementById('posture');
const postureBar = document.getElementById('postureBar');

// Transcript
const transcriptEl = document.getElementById('transcript');
const transcriptPlaceholder = document.getElementById('transcriptPlaceholder');

// --- NEW Results Tabs Elements ---
const tabLinks = document.querySelectorAll('.tab-link');
const tabContents = document.querySelectorAll('.tab-content');

// Tab 1: AI Feedback
const feedbackEl = document.getElementById('feedbackContainer');
const feedbackPlaceholder = document.getElementById('feedbackPlaceholder');

// Tab 2: Room Scan
const roomScanEl = document.getElementById('roomScanContainer');
const roomScanPlaceholder = document.getElementById('roomScanPlaceholder');

// Tab 3: Pro Image
const genImgBtn = document.getElementById('genImgBtn');
const genImgInput = document.getElementById('genImgInput');
const genImgContainer = document.getElementById('genImgContainer');
const genImgPlaceholder = document.getElementById('genImgPlaceholder');
const generatedImage = document.getElementById('generatedImage');

// --- State ---
let mediaRecorder;
let audioChunks = [];
let poseInterval;
let isInterviewRunning = false;

// --- Event Listeners ---
startBtn.addEventListener('click', startInterview);
stopBtn.addEventListener('click', stopInterview);
genImgBtn.addEventListener('click', generateProfessionalImage);

// Tabbed interface logic
tabLinks.forEach(link => {
    link.addEventListener('click', () => {
        // Deactivate all
        tabLinks.forEach(l => l.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // Activate clicked
        link.classList.add('active');
        document.getElementById(link.dataset.tab).classList.add('active');
    });
});


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
    roomScanEl.innerHTML = '';
    roomScanEl.appendChild(roomScanPlaceholder);

    // --- Start Video Stream ---
    videoFeed.src = `${API_BASE_URL}/api/videostream`;
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
        if (transcription) {
            transcriptPlaceholder.style.display = 'none';
            transcriptEl.innerHTML = `<p>${transcription}</p>`;
            // Mock clarity score
            const clarity = Math.min(Math.round(transcription.length / 2), 100);
            updateAnalysisBar(clarityVal, clarityBar, clarity);
        } else {
             transcriptEl.innerHTML = '<div class="placeholder-text" id="transcriptPlaceholder">No speech detected.</div>';
        }

        setStatus('TRANSCRIPTION COMPLETE. FETCHING AI FEEDBACK...');
        return transcription;

    } catch (err) {
        console.error('Error during transcription:', err);
        setStatus(`Transcription Error: ${err.message}`, true);
        transcriptEl.innerHTML = '<div class="placeholder-text" id="transcriptPlaceholder">Audio transcription failed.</div>';
        return null;
    }
}

/**
 * 2. Sends transcription to the /llm/advice endpoint
 */
async function getAIFeedback(transcription) {
    // Don't bother if transcription is empty
    if (!transcription || transcription.trim() === '') {
        setStatus('Interview complete. No speech to analyze.', true);
        feedbackPlaceholder.style.display = 'block';
        feedbackEl.innerHTML = '<div class="placeholder-text" id="feedbackPlaceholder">No speech was recorded to provide feedback.</div>';
        return;
    }
    
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
        const randomAngle = 90 + Math.floor(Math.random() * 40 - 20); // 70-110
        await controlServo(randomAngle);

    } catch (err) {
        console.warn('Pose data polling failed.');
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
    } catch (err) {
        console.error('Error controlling servo:', err);
    }
}

/**
 * 5. Calls the /analyze-image endpoint
 * This uses the hardcoded 'testimg.jpg' on your server.
 */
async function scanRoomBackground() {
    setStatus('Scanning room background...');
    roomScanPlaceholder.textContent = 'Scanning...';
    try {
        const response = await fetch(`${API_BASE_URL}/api/scanroom/analyze-image`, {
            method: 'POST',
        });
        if (!response.ok) throw new Error('Failed to analyze room');
        
        const data = await response.json();
        console.log('Room scan result:', data.result);
        
        roomScanPlaceholder.style.display = 'none';
        // The 'result' is a string, which might be JSON. Let's try to format it.
        let formattedResult = data.result;
        try {
            const jsonResult = JSON.parse(data.result);
            formattedResult = '<strong>Objects Detected:</strong><ul>' +
                jsonResult.map(item => `<li>${item.label} (at ${item.point})</li>`).join('') +
                '</ul>';
        } catch (e) {
            // It's not JSON, just display as text
            formattedResult = `<p>${data.result.replace(/\n/g, '<br>')}</p>`;
        }
        roomScanEl.innerHTML = formattedResult;

        if (isInterviewRunning) setStatus('INTERVIEW IN PROGRESS... Room scan complete.');

    } catch (err) {
        console.error('Error scanning room:', err);
        roomScanEl.innerHTML = '<div class="placeholder-text" id="roomScanPlaceholder">Failed to scan room.</div>';
        if (isInterviewRunning) setStatus('INTERVIEW IN PROGRESS... Room scan failed.', true);
    }
}

/**
 * 6. Calls the /genimg endpoint
 */
async function generateProfessionalImage() {
    const prompt = genImgInput.value;
    if (!prompt) {
        alert('Please enter a prompt to generate an image.');
        return;
    }

    console.log('Generating image with prompt:', prompt);
    genImgPlaceholder.style.display = 'block';
    genImgPlaceholder.textContent = 'Generating... This may take a moment.';
    generatedImage.style.display = 'none';
    genImgBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/genimg/genimg`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt }),
        });

        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

        const data = await response.json();
        
        if (data.image) {
            genImgPlaceholder.style.display = 'none';
            generatedImage.src = `data:image/jpeg;base64,${data.image}`;
            generatedImage.style.display = 'block';
        } else {
            throw new Error('No image data received.');
        }

    } catch (err) {
        console.error('Error generating image:', err);
        genImgPlaceholder.textContent = `Error: ${err.message}`;
    } finally {
        genImgBtn.disabled = false;
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