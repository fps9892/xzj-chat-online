const canvas = document.getElementById('techCanvas');
if (!canvas) return;

const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true }); 

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const particles = [];
const particleConfig = {
    count: 25, 
    maxDistance: 140, 
    colors: ['rgba(255, 107, 157, ', 'rgba(255, 160, 122, ']
};

class Particle {
    constructor() {
        this.resetPosition();
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.radius = Math.random() * 1.2 + 0.5;
        const colorBase = Math.random() > 0.5 ? particleConfig.colors[0] : particleConfig.colors[1];
        const opacity = Math.random() * 0.4 + 0.2;
        this.color = colorBase + opacity + ')';
    }

    resetPosition() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around (si sale por un lado, entra por el opuesto)
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }

    draw(context) {
        context.fillStyle = this.color;
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        context.fill();
    }
}

function createParticles() {
    particles.length = 0;
    for (let i = 0; i < particleConfig.count; i++) {
        particles.push(new Particle());
    }
}

function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distSquared = dx * dx + dy * dy;
            const maxDistSquared = particleConfig.maxDistance * particleConfig.maxDistance;

            if (distSquared < maxDistSquared) {
                const distance = Math.sqrt(distSquared);
                const alpha = 0.2 * (1 - distance / particleConfig.maxDistance); 
                ctx.strokeStyle = `rgba(255, 107, 157, ${alpha})`;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
}

let animationId;
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw(ctx);
    }

    drawConnections();
    animationId = requestAnimationFrame(animate);
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particles.forEach(p => p.resetPosition()); 
    }, 300);
}, { passive: true });

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (animationId) cancelAnimationFrame(animationId);
    } else {
        animate();
    }
});

createParticles();
animate();