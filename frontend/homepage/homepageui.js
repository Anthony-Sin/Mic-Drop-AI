// Use addEventListener instead of inline onclick to avoid CSP issues
document.getElementById('startBtn').addEventListener('click', function() {
    // Navigate to demo page
    window.location.href = '/demo/demo.html';
});

document.getElementById('playBtn').addEventListener('click', function() {
    alert('▶ LOADING DEMO\n\n• Interview process walkthrough\n• Real-time feedback display\n• Grant matching algorithm\n• Results presentation');
});
//fixed
// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});