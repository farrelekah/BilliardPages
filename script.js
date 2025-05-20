const canvas = document.getElementById("billiardCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 400;

const FRICTION = 0.99;
const MIN_VELOCITY = 0.1;

const sounds = {
    wall: new Audio("sounds/wall.wav"),
    hit: new Audio("sounds/hit.wav"),
    collision: new Audio("sounds/collision.wav"),
    hole: new Audio("sounds/hole.wav")
};

function playSound(type) {
    if (sounds[type]) {
        sounds[type].currentTime = 0;
        sounds[type].play();
    }
}

class Ball {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 10;
        this.dx = 0;
        this.dy = 0;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();

        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowOffsetY = 2;
    }
    update() {
        this.x += this.dx;
        this.y += this.dy;

        if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
            this.dx *= -0.9;
            playSound("wall");
        }
        if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) {
            this.dy *= -0.9;
            playSound("wall");
        }

        this.dx *= FRICTION;
        this.dy *= FRICTION;
        if (Math.abs(this.dx) < MIN_VELOCITY) this.dx = 0;
        if (Math.abs(this.dy) < MIN_VELOCITY) this.dy = 0;
    }
}

function drawTable() {
    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "black";
    const holes = [
        [20, 20], [canvas.width / 2, 20], [canvas.width - 20, 20],
        [20, canvas.height - 20], [canvas.width / 2, canvas.height - 20], [canvas.width - 20, canvas.height - 20]
    ];
    for (const [x, y] of holes) {
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawStick(x, y, angle, power) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = "brown";
    ctx.fillRect(-50 - power, -5, 100 + power, 10);
    ctx.restore();
}

const balls = [new Ball(400, 200, "white")];
for (let i = 0; i < 5; i++) {
    balls.push(new Ball(200 + i * 30, 200, `hsl(${Math.random() * 360}, 100%, 50%)`));
}

let stickAngle = 0;
let isPulling = false;
let pullPower = 0;

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    stickAngle = Math.atan2(mouseY - balls[0].y, mouseX - balls[0].x);
});

canvas.addEventListener("mousedown", () => {
    isPulling = true;
    pullPower = 0;
});

canvas.addEventListener("mouseup", () => {
    balls[0].dx = Math.cos(stickAngle) * pullPower;
    balls[0].dy = Math.sin(stickAngle) * pullPower;
    playSound("hit");
    pullPower = 0;
    isPulling = false;
});

function detectCollision(ball1, ball2) {
    const dx = ball2.x - ball1.x;
    const dy = ball2.y - ball1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < ball1.radius + ball2.radius) {
        const nx = dx / distance;
        const ny = dy / distance;

        const dvx = ball1.dx - ball2.dx;
        const dvy = ball1.dy - ball2.dy;
        const p = 2 * (dvx * nx + dvy * ny) / 2;

        ball1.dx = ball1.dx - p * nx;
        ball1.dy = ball1.dy - p * ny;
        ball2.dx = ball2.dx + p * nx;
        ball2.dy = ball2.dy + p * ny;

        playSound("collision");
    }
}

function checkHole(ball) {
    const holes = [
        [20, 20], [canvas.width / 2, 20], [canvas.width - 20, 20],
        [20, canvas.height - 20], [canvas.width / 2, canvas.height - 20], [canvas.width - 20, canvas.height - 20]
    ];
    for (const [hx, hy] of holes) {
        const dx = ball.x - hx;
        const dy = ball.y - hy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 12 + ball.radius) {
            return true;
        }
    }
    return false;
}

function drawAimPoints(x, y, angle) {
    const aimDistance = 100;
    const aimX = x + Math.cos(angle) * aimDistance;
    const aimY = y + Math.sin(angle) * aimDistance;

    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const pointX = x + Math.cos(angle) * (aimDistance / 10 * i);
        const pointY = y + Math.sin(angle) * (aimDistance / 10 * i);
        ctx.arc(pointX, pointY, 2, 0, Math.PI * 2);
    }
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.closePath();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTable();

    let allBallsStopped = true;
    for (let i = balls.length - 1; i >= 0; i--) {
        balls[i].update();
        if (checkHole(balls[i])) {
            if (balls[i].color === "white") {
                balls[i].x = 400;
                balls[i].y = 200;
                balls[i].dx = 0;
                balls[i].dy = 0;
            } else {
                balls.splice(i, 1);
            }
            playSound("hole");
        } else {
            for (let j = i + 1; j < balls.length; j++) {
                detectCollision(balls[i], balls[j]);
            }
            balls[i].draw();
        }
        if (balls[i].dx !== 0 || balls[i].dy !== 0) {
            allBallsStopped = false;
        }
    }

    if (isPulling) {
        pullPower = Math.min(pullPower + 0.5, 30);
        drawStick(balls[0].x, balls[0].y, stickAngle, pullPower);
    } else if (allBallsStopped) {
        drawStick(balls[0].x, balls[0].y, stickAngle, 0);
        drawAimPoints(balls[0].x, balls[0].y, stickAngle); // Tambahkan titik-titik ancang-ancang
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();

//test