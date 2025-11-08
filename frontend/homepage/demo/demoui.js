const API_URL  = 'https://mic-drop-ai-production.up.railway.app';
let isRecording = false;
let interviewStartTime = null;
let transcriptInterval = null;
let metricsInterval = null;
let mediaRecorder = null;
let audioChunks = [];
let recordingInterval = null;

const sampleQuestions = [
    "Tell me about your project or organization.",
    "What are your primary goals for this grant?",
    "How will you measure success?",
    "What makes your project unique?",
    "What is your estimated budget?"
];

const feedbackTypes = [
    { category: "Body Language", score: "85/100", text: "Excellent eye contact maintained. Consider sitting slightly more upright to project confidence." },
    { category: "Speech Pattern", score: "78/100", text: "Clear articulation. Try to reduce filler words like 'um' and 'uh' for more professional delivery." },
    { category: "Content Quality", score: "92/100", text: "Strong narrative structure. Your passion for the project comes through clearly." },
    { category: "Engagement", score: "88/100", text: "Good use of examples. Consider adding more specific metrics and data points." }
];

const sampleGrants = [
    {
        title: "Tech Innovation Fund 2024",
        amount: "$50,000",
        match: "94% MATCH",
        description: "Supporting innovative technology solutions that address social challenges. Focuses on scalable projects with measurable community impact.",
        tags: ["Technology", "Innovation", "Social Impact", "Education"]
    },
    {
        title: "Community Development Grant",
        amount: "$35,000",
        match: "87% MATCH",
        description: "Funding for programs that strengthen local communities through education and skill development initiatives.",
        tags: ["Community", "Education", "Youth", "Development"]
    },
    {
        title: "Digital Equity Initiative",
        amount: "$75,000",
        match: "91% MATCH",
        description: "Large-scale funding for projects reducing the digital divide and promoting technology access in underserved areas.",
        tags: ["Digital Access", "Equity", "Technology", "Rural"]
    }
];

async function startInterview() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                channelCount: 1,
                sampleRate: 16000
            },
            video: true 
        });
        
        const videoElement = document.getElementById('videoFeed');
        videoElement.srcObject = stream;
        videoElement.play();
        
        isRecording = true;
        interviewStartTime = Date.now();
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        document.getElementById('recordingIndicator').style.display = 'block';
        document.getElementById('status').textContent = 'RECORDING • ANALYZING IN REAL-TIME';
        
        document.getElementById('videoPlaceholder').style.display = 'none';
        document.getElementById('videoFeed').style.display = 'block';
        document.getElementById('faceBox').classList.add('active');
        document.getElementById('faceBox').style.top = '20%';
        document.getElementById('faceBox').style.left = '30%';
        document.getElementById('faceBox').style.width = '40%';
        document.getElementById('faceBox').style.height = '50%';

        setupAudioRecording(stream);
        
        startQuestions();
        
        startMetrics();

        setTimeout(showFeedback, 5000);

        setTimeout(showGrants, 10000);
    } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Could not access microphone or camera. Please grant permissions and try again.');
    }
}

function setupAudioRecording(stream) {
    const audioStream = new MediaStream(stream.getAudioTracks());
    mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm'
    });
    
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
        }
    };
    
    mediaRecorder.onstop = async () => {
        if (audioChunks.length > 0) {
            await sendAudioForTranscription();
        }
    };
    
    mediaRecorder.start();
    recordingInterval = setInterval(() => {
        if (isRecording && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            setTimeout(() => {
                if (isRecording) {
                    audioChunks = [];
                    mediaRecorder.start();
                }
            }, 100);
        }
    }, 5000);
}

async function sendAudioForTranscription() {
    try {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');
        
        const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.transcription && data.transcription.trim()) {
                addTranscriptionToUI(data.transcription);
            }
        } else {
            console.error('Transcription request failed:', response.statusText);
        }
    } catch (error) {
        console.error('Error sending audio for transcription:', error);
    }
}

function addTranscriptionToUI(transcription) {
    const transcriptEl = document.getElementById('transcript');
    const time = new Date(Date.now() - interviewStartTime).toISOString().substr(14, 5);
    
    const responseEntry = document.createElement('div');
    responseEntry.className = 'transcript-entry';
    responseEntry.style.borderLeftColor = '#fff';
    responseEntry.innerHTML = `
        <div class="transcript-time" style="color: #fff;">[${time}] YOU:</div>
        <div class="transcript-text">${transcription}</div>
    `;
    transcriptEl.appendChild(responseEntry);
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function startQuestions() {
    const transcriptEl = document.getElementById('transcript');
    transcriptEl.innerHTML = '';
    let questionIndex = 0;

    askQuestion(questionIndex);
    questionIndex++;

    transcriptInterval = setInterval(() => {
        if (!isRecording) return;
        askQuestion(questionIndex);
        questionIndex++;
    }, 15000);
}

function askQuestion(index) {
    const transcriptEl = document.getElementById('transcript');
    const time = new Date(Date.now() - interviewStartTime).toISOString().substr(14, 5);
    
    const questionEntry = document.createElement('div');
    questionEntry.className = 'transcript-entry';
    questionEntry.innerHTML = `
        <div class="transcript-time">[${time}] AI INTERVIEWER:</div>
        <div class="transcript-text">${sampleQuestions[index % sampleQuestions.length]}</div>
    `;
    transcriptEl.appendChild(questionEntry);
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function stopInterview() {
    isRecording = false;
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('recordingIndicator').style.display = 'none';
    document.getElementById('status').textContent = 'INTERVIEW COMPLETED • GENERATING FINAL REPORT';
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    
    clearInterval(transcriptInterval);
    clearInterval(metricsInterval);
    clearInterval(recordingInterval);
    
    const videoElement = document.getElementById('videoFeed');
    if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
    }

    setTimeout(() => {
        document.getElementById('status').textContent = 'ANALYSIS COMPLETE • REVIEW YOUR RESULTS';
    }, 2000);
}

function startMetrics() {
    metricsInterval = setInterval(() => {
        if (!isRecording) return;

        updateMetric('confidence', 70 + Math.random() * 25);
        updateMetric('eyeContact', 75 + Math.random() * 20);
        updateMetric('clarity', 80 + Math.random() * 15);
        updateMetric('posture', 65 + Math.random() * 30);
    }, 1500);
}

function updateMetric(name, value) {
    const rounded = Math.round(value);
    document.getElementById(name).textContent = rounded + '%';
    document.getElementById(name + 'Bar').style.width = rounded + '%';
}

function showFeedback() {
    const container = document.getElementById('feedbackContainer');
    container.innerHTML = '';

    feedbackTypes.forEach((feedback, index) => {
        setTimeout(() => {
            const item = document.createElement('div');
            item.className = 'feedback-item';
            item.innerHTML = `
                <div class="feedback-header">
                    <span class="feedback-category">${feedback.category}</span>
                    <span class="feedback-score">${feedback.score}</span>
                </div>
                <div class="feedback-text">${feedback.text}</div>
            `;
            container.appendChild(item);
        }, index * 1000);
    });
}

function showGrants() {
    const container = document.getElementById('grantsContainer');
    container.innerHTML = '';

    sampleGrants.forEach((grant, index) => {
        setTimeout(() => {
            const card = document.createElement('div');
            card.className = 'grant-card';
            card.innerHTML = `
                <div class="grant-header">
                    <div>
                        <div class="grant-title">${grant.title}</div>
                        <div class="grant-match">${grant.match}</div>
                    </div>
                    <div class="grant-amount">${grant.amount}</div>
                </div>
                <div class="grant-description">${grant.description}</div>
                <div class="grant-tags">
                    ${grant.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            `;
            container.appendChild(card);
        }, index * 800);
    });
}

setInterval(() => {
    if (isRecording) {
        const faceBox = document.getElementById('faceBox');
        const currentTop = parseFloat(faceBox.style.top);
        const currentLeft = parseFloat(faceBox.style.left);
        
        faceBox.style.top = (currentTop + (Math.random() - 0.5) * 2) + '%';
        faceBox.style.left = (currentLeft + (Math.random() - 0.5) * 2) + '%';
    }
}, 100);