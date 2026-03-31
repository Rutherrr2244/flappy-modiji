const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const finalScore = document.getElementById('final-score');
const highestScoreDisplay = document.getElementById('highest-score');

// Buttons
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Audio
const bgMusic = document.getElementById('bgMusic');
const gameOverAudio = document.getElementById('gameOverAudio');

// Robust audio play function
function playSound(audioElem) {
    if (audioElem) {
        audioElem.currentTime = 0;
        let playPromise = audioElem.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => console.log('Audio playback failed:', error));
        }
    }
}

function playMusic(audioElem) {
    if (audioElem && audioElem.paused) {
        let playPromise = audioElem.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => console.log('Music playback failed:', error));
        }
    }
}

let audioUnlocked = false;
function unlockAudio() {
    if (!audioUnlocked) {
        if (bgMusic) {
            bgMusic.play().then(() => { bgMusic.pause(); bgMusic.currentTime = 0; }).catch(() => { });
        }
        if (gameOverAudio) {
            gameOverAudio.play().then(() => { gameOverAudio.pause(); gameOverAudio.currentTime = 0; }).catch(() => { });
        }
        audioUnlocked = true;
    }
}

// Images
const images = {
    avatar: new Image(),
    obstacle: new Image(),
    lotus: new Image()
};
images.avatar.src = 'assets/avatar.png';
images.obstacle.src = 'assets/obstacle.png';
images.lotus.src = 'assets/lotus.png';

let isImageValid = (img) => img.complete && img.naturalHeight !== 0 && img.naturalHeight !== undefined;

// Game Config
let frames = 0;
let gameState = 'start'; // start, playing, gameover
let score = 0; // Deshbhakti points
let highScore = localStorage.getItem('masterstrokeHighScore') || 0;

highestScoreDisplay.innerText = highScore;

const avatar = {
    x: 50,
    y: 150,
    w: 48,
    h: 48,
    radius: 24,
    gravity: 0.20,
    jump: 5.0,
    velocity: 0,
    draw: function () {
        if (isImageValid(images.avatar)) {
            ctx.drawImage(images.avatar, Math.floor(this.x), Math.floor(this.y), this.w, this.h);
        } else {
            // Fallback avatar (Orange Circle with white border)
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.arc(this.x + this.radius, this.y + this.radius, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Just a little decoration
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.x + this.radius + 5, this.y + this.radius - 5, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    update: function () {
        this.velocity += this.gravity;
        this.y += this.velocity;

        // Floor collision
        if (this.y + this.h >= canvas.height - 20) {
            this.y = canvas.height - 20 - this.h;
            gameOver();
        }
        // Ceiling collision
        if (this.y <= 0) {
            this.y = 0;
            this.velocity = 0;
        }
    },
    flap: function () {
        this.velocity = -this.jump;
    }
};

const obstacles = {
    position: [],
    width: 60, // Widened from 52 for better hand collision physics
    gap: 160,
    dx: 2.0,

    draw: function () {
        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            let topY = Math.floor(p.y);
            let bottomY = Math.floor(p.y + this.gap);
            let pX = Math.floor(p.x);

            let hasValidImg = isImageValid(images.obstacle);

            // Shared styling for the "pillar" or "arm"
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 2;

            // --- Top Obstacle ---
            // Pillar
            ctx.fillRect(pX, 0, this.width, topY);
            ctx.strokeRect(pX, 0, this.width, topY);

            ctx.save();
            ctx.translate(pX + this.width / 2, topY);
            // Flip vertically for the top hand
            ctx.scale(1, -1);
            if (hasValidImg) {
                // Draw image anchored at bottom (but scaled to be top tip)
                // Height will maintain 1:1 aspect ratio with this.width
                ctx.drawImage(images.obstacle, -this.width / 2, 0, this.width, this.width);
            } else {
                ctx.translate(0, -15);
                ctx.font = '48px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('✋🏻', 0, 0);
            }
            ctx.restore();

            // --- Bottom Obstacle ---
            let bottomHeight = Math.floor(canvas.height - bottomY - 20);

            // Pillar
            ctx.fillRect(pX, bottomY, this.width, bottomHeight);
            ctx.strokeRect(pX, bottomY, this.width, bottomHeight);

            ctx.save();
            ctx.translate(pX + this.width / 2, bottomY);
            if (hasValidImg) {
                ctx.drawImage(images.obstacle, -this.width / 2, 0, this.width, this.width);
            } else {
                ctx.translate(0, 15);
                ctx.font = '48px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('✋🏻', 0, 0);
            }
            ctx.restore();
        }
    },

    update: function () {
        // Add new obstacles every 140 frames (slower rate for easier game)
        if (frames % 140 == 0) {
            this.position.push({
                x: canvas.width,
                y: Math.random() * (canvas.height - this.gap - 100) + 50,
                passed: false
            });
        }

        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            p.x -= this.dx;

            // Collision detection
            let bottomY = p.y + this.gap;

            if (
                avatar.x + avatar.w > p.x &&
                avatar.x < p.x + this.width &&
                (avatar.y < p.y || avatar.y + avatar.h > bottomY)
            ) {
                gameOver();
            }

            // Score update
            if (p.x + this.width < avatar.x && !p.passed) {
                score += 1; // Deshbhakti points
                scoreDisplay.innerText = score;
                p.passed = true;
            }

            // Remove obstacles that go off screen
            if (p.x + this.width <= 0) {
                this.position.shift();
            }
        }
    },

    reset: function () {
        this.position = [];
    }
};

const background = {
    x: 0,
    dx: 1,
    draw: function () {
        if (isImageValid(images.lotus)) {
            // Tiled background
            let pattern = ctx.createPattern(images.lotus, 'repeat');
            ctx.save();
            ctx.translate(Math.floor(-this.x), 0);
            ctx.fillStyle = pattern;
            ctx.fillRect(Math.floor(this.x), 0, canvas.width + Math.floor(this.x), canvas.height); // Draw extended
            ctx.restore();
        } else {
            // Fallback decorative lotuses (simple pink-orange geometry)
            ctx.fillStyle = '#ffb366';
            for (let i = 0; i < 10; i++) {
                let lx = ((i * 120) - this.x) % (canvas.width + 120);
                if (lx < -60) lx += canvas.width + 120;
                let ly = (Math.sin(i * 45) * 200) + 300;

                // Draw a simple lotus shape
                ctx.beginPath();
                ctx.arc(lx, ly, 15, 0, Math.PI, true);
                ctx.arc(lx - 10, ly + 5, 10, 0, Math.PI, true);
                ctx.arc(lx + 10, ly + 5, 10, 0, Math.PI, true);
                ctx.fill();
            }
        }
    },
    update: function () {
        this.x = (this.x + this.dx) % 120; // reset to avoid precision issues
    }
};

const ground = {
    x: 0,
    y: canvas.height - 20,
    h: 20,
    dx: 2.0, // Match obstacle speed
    draw: function () {
        ctx.fillStyle = '#cc5200';
        ctx.fillRect(Math.floor(-this.x), this.y, canvas.width * 2, this.h);

        // Stripes for movement perception
        ctx.fillStyle = '#ff8000';
        for (let i = 0; i < 30; i++) {
            ctx.fillRect(Math.floor(-this.x + i * 30), this.y, 15, this.h);
        }
    },
    update: function () {
        this.x = (this.x + this.dx) % 30;
    }
};

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw elements
    background.draw();
    obstacles.draw();
    ground.draw();
    avatar.draw();
}

function update() {
    if (gameState === 'playing') {
        background.update();
        ground.update();
        avatar.update();
        obstacles.update();
        frames++;
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Controls
function flap(e) {
    if (e.type === 'keydown' && e.code !== 'Space') return;

    unlockAudio();

    if (gameState === 'start') {
        gameState = 'playing';
        startScreen.classList.add('hidden');
        playMusic(bgMusic);
        avatar.flap();
    } else if (gameState === 'playing') {
        avatar.flap();
    }
}

window.addEventListener('keydown', flap);
window.addEventListener('mousedown', flap);
window.addEventListener('touchstart', flap);

function gameOver() {
    gameState = 'gameover';

    if (bgMusic) bgMusic.pause();
    playSound(gameOverAudio);

    gameOverScreen.classList.remove('hidden');
    finalScore.innerText = score;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('masterstrokeHighScore', highScore);
        highestScoreDisplay.innerText = highScore;
    }
}

function restart() {
    gameState = 'playing';
    score = 0;
    scoreDisplay.innerText = score;
    frames = 0;
    avatar.y = 150;
    avatar.velocity = 0;
    obstacles.reset();
    gameOverScreen.classList.add('hidden');
    playMusic(bgMusic);
}

startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    unlockAudio();
    gameState = 'playing';
    startScreen.classList.add('hidden');
    playMusic(bgMusic);
    avatar.flap();
});
restartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    unlockAudio();
    restart();
});

// Initialize
loop();
