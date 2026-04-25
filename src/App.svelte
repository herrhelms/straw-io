<script>
import {
  onMount
} from 'svelte';

let canvas;
let showModal = false;
let name = '';
let email = '';
let submitting = false;
let success = false;
let error = '';

async function handleSubmit() {
    if (!email || !name) return;
    submitting = true;
    error = '';
    try {
        const res = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email
            }),
        });
        const data = await res.json();
        if (data.ok) {
            success = true;
        } else {
            error = data.error || 'Something went wrong';
        }
    } catch {
        error = 'Network error. Please try again.';
    } finally {
        submitting = false;
    }
}

onMount(() => {
    const ctx = canvas.getContext('2d');
    let mouseX = 0,
        mouseY = 0,
        prevMouseX = 0,
        prevMouseY = 0;
    let mouseSpeed = 0;
    let mode = 1; // Math.random() < 0.5 ? 1 : 2;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Randomly switch mode every 8-15 seconds
    function scheduleSwitch() {
        const delay = (Math.random() * 7 + 8) * 1000;
        setTimeout(() => {
            mode = mode === 1 ? 2 : 1;
            scheduleSwitch();
        }, delay);
    }
    // scheduleSwitch();

    window.addEventListener('mousemove', (e) => {
        prevMouseX = mouseX;
        prevMouseY = mouseY;
        mouseX = e.clientX;
        mouseY = e.clientY;
        const dx = mouseX - prevMouseX,
            dy = mouseY - prevMouseY;
        mouseSpeed = Math.sqrt(dx * dx + dy * dy);

        if (mode === 1) swirlSpawn(mouseX, mouseY);
        if (mode === 2) cometSpawn(mouseX, mouseY, dx, dy);
    });

    // Particle Swirl
    const SWIRL_COLORS = [{
            r: 0,
            g: 200,
            b: 255
        }, {
            r: 160,
            g: 255,
            b: 96
        },
        {
            r: 255,
            g: 107,
            b: 53
        }, {
            r: 200,
            g: 232,
            b: 255
        }
    ];
    const swirlParticles = [];
    const MAX_SWIRL = 80;

    function swirlSpawn(x, y) {
        for (let i = 0; i < 2 && swirlParticles.length < MAX_SWIRL; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 1.2 + 0.3;
            swirlParticles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: Math.random() * 0.015 + 0.008,
                size: Math.random() * 2.5 + 0.8,
                color: SWIRL_COLORS[Math.floor(Math.random() * SWIRL_COLORS.length)],
                angle,
                angularVel: (Math.random() - 0.5) * 0.08,
                orbitRadius: Math.random() * 12 + 4,
                originX: x,
                originY: y,
            });
        }
    }

    function swirlUpdate() {
        for (let i = swirlParticles.length - 1; i >= 0; i--) {
            const p = swirlParticles[i];
            p.life -= p.decay;
            if (p.life <= 0) {
                swirlParticles.splice(i, 1);
                continue;
            }
            p.angle += p.angularVel;
            p.orbitRadius += 0.15;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.x = p.originX + Math.cos(p.angle) * p.orbitRadius + p.vx;
            p.y = p.originY + Math.sin(p.angle) * p.orbitRadius + p.vy;
            p.originX += (mouseX - p.originX) * 0.01;
            p.originY += (mouseY - p.originY) * 0.01;
        }
    }

    function swirlDraw() {
        for (const p of swirlParticles) {
            const a = p.life * 0.7;
            const {
                r,
                g,
                b
            } = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},${a * 0.15})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
            ctx.fill();
        }
        ctx.lineWidth = 0.5;
        for (let i = 0; i < swirlParticles.length; i++) {
            for (let j = i + 1; j < swirlParticles.length; j++) {
                const a = swirlParticles[i],
                    b = swirlParticles[j];
                const dx = a.x - b.x,
                    dy = a.y - b.y,
                    dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 50) {
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = `rgba(0,200,255,${(1 - dist / 50) * Math.min(a.life, b.life) * 0.2})`;
                    ctx.stroke();
                }
            }
        }
    }

    // Comet Trail
    const cometTrail = [];
    const MAX_COMET = 60;

    function cometSpawn(x, y, dx, dy) {
        const speed = Math.sqrt(dx * dx + dy * dy);
        if (speed < 1.5) return;
        const count = Math.min(3, Math.floor(speed / 4) + 1);
        for (let i = 0; i < count && cometTrail.length < MAX_COMET; i++) {
            const angle = Math.atan2(dy, dx);
            const spread = (Math.random() - 0.5) * 0.4;
            const spd = speed * (0.2 + Math.random() * 0.3);
            cometTrail.push({
                x: x + (Math.random() - 0.5) * 4,
                y: y + (Math.random() - 0.5) * 4,
                vx: -Math.cos(angle + spread) * spd * 0.15,
                vy: -Math.sin(angle + spread) * spd * 0.15,
                life: 1.0,
                decay: 0.012 + Math.random() * 0.018,
                speed,
                size: Math.random() * 1.2 + 0.5,
            });
        }
    }

    function cometUpdate() {
        for (let i = cometTrail.length - 1; i >= 0; i--) {
            const p = cometTrail[i];
            p.life -= p.decay;
            if (p.life <= 0) {
                cometTrail.splice(i, 1);
                continue;
            }
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96;
            p.vy *= 0.96;
        }
    }

    function cometDraw() {
        if (mouseSpeed > 2) {
            const headAlpha = Math.min(0.8, mouseSpeed / 30);
            const headGrad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 20);
            headGrad.addColorStop(0, `rgba(200,230,255,${headAlpha * 0.4})`);
            headGrad.addColorStop(1, 'rgba(200,230,255,0)');
            ctx.beginPath();
            ctx.arc(mouseX, mouseY, 20, 0, Math.PI * 2);
            ctx.fillStyle = headGrad;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(mouseX, mouseY, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220,240,255,${headAlpha})`;
            ctx.fill();
        }

        for (const p of cometTrail) {
            const alpha = Math.min(1, p.life / 0.3) * 0.7;
            const tailLen = 8 + p.speed * 0.8;
            const angle = Math.atan2(p.vy, p.vx);
            const tailX = p.x + Math.cos(angle) * tailLen;
            const tailY = p.y + Math.sin(angle) * tailLen;

            const grad = ctx.createLinearGradient(p.x, p.y, tailX, tailY);
            grad.addColorStop(0, `rgba(200,230,255,${alpha})`);
            grad.addColorStop(1, 'rgba(100,180,255,0)');
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(tailX, tailY);
            ctx.strokeStyle = grad;
            ctx.lineWidth = p.size;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220,240,255,${alpha})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100,180,255,${alpha * 0.08})`;
            ctx.fill();
        }
    }

    // Main loop
    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (mode === 1 || swirlParticles.length) { swirlUpdate(); swirlDraw(); }
        if (mode === 2 || cometTrail.length) { cometUpdate(); cometDraw(); }
        requestAnimationFrame(loop);
    }
    loop();

    const modalTimer = setTimeout(() => {
        showModal = true;
    }, 20000);

    return () => {
        window.removeEventListener('resize', resize);
        clearTimeout(modalTimer);
    };
});
</script>

<canvas bind:this={canvas}></canvas>

<main>
    <div class="emoji stagger" style="--delay: 0s">🔭</div>
    <h1 class="stagger" style="--delay: 0.15s">STRAW I/O</h1>
    <h2 class="stagger" style="--delay: 0.3s">Better future, yes please!</h2>
    <div class="copy stagger" style="--delay: 0.5s">
        <p class="lead">At Straw I/O, we believe digital transformation is about building systems that think, adapt, and grow with you!</p>
        <p class="body">
            That’s why we design future-facing digital services at the intersection of automation and AI integration — turning complexity into clarity and ambition into execution.
        </p>
        <div class="divider"></div>
        <p class="lead">Let’s build together.</p>
        <p class="body">If you’re ready to move beyond ideas and into action, <a href="#contact" on:click|preventDefault={() => showModal = true}>we’re ready to talk.</a></p>
    </div>
</main>

<section class="products stagger" style="--delay: 0.7s">
    <h3>How we get you there</h3>
    <div class="product-grid">
        <div class="product-card">
            <span class="product-emoji">🤖</span>
            <h4>AI Plugins</h4>
            <span class="badge">Extend your workflows</span>
            <p>Custom plugins that connect AI directly to your internal tools, automating tasks and accelerating everyday operations.</p>
        </div>
        <div class="product-card">
            <span class="product-emoji">⚡</span>
            <h4>Process Automation</h4>
            <span class="badge">Move faster</span>
            <p>Production-grade pipelines that connect your systems and deliver the data you need—without delays or manual steps.</p>
        </div>
        <div class="product-card">
            <span class="product-emoji">🔌</span>
            <h4>Agentic Servers</h4>
            <span class="badge">Connect everything</span>
            <p>Intelligent server endpoints that link AI models to your APIs, tools, datasets, and external services.</p>
        </div>
        <div class="product-card coming-soon">
            <span class="product-emoji">🕵️‍♀️</span>
            <h4>InspectorDB</h4>
            <span class="badge orange">Coming soon</span>
            <p>A database engine designed for the AI era—fast, flexible, and optimized for how agents access and use data.</p>
        </div>
    </div>
</section>

<footer>Built with ♥️ © 2026</footer>

{#if showModal}
<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
<div class="overlay" on:click={() => { if (!success) showModal = false; }}>
    <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
    <div class="modal" on:click|stopPropagation>
        {#if success}
        <div class="success">
            <div class="emoji">🙌</div>
            <h1>Thank you!</h1>
            <p>We're excited to get to know you. <br/>You will hear from us soon.</p>
        </div>
        {:else}
        <button class="close" on:click={() => showModal = false}>✕</button>

        <div class="emoji-xs">👋</div>
        <h1>Hi there!</h1>
        <small>Let us know how we can call you! We’ll reach out shortly<br/>to set up a time for an in-person meeting.<br/><br/><br/></small>
        <form on:submit|preventDefault={handleSubmit}>
            <input type="text" placeholder="Your name" bind:value={name} required />
            <input type="email" placeholder="Your email" bind:value={email} required />
            {#if error}<p class="error">{error}</p>{/if}
            <button type="submit" disabled={submitting}>
                {submitting ? 'Sending...' : 'Send'}
            </button>
                    <sub>By using "Send" you allow us to contact you at the given email address.<br/><br/><br/></sub>

        </form>
        {/if}
    </div>
</div>
{/if}

<style>
:global(html) {
    background: #020408;
}
:global(body) {
    margin: 0;
    min-height: 100vh;
    overflow-x: hidden;
    background: radial-gradient(ellipse at 30% 40%, #040e1e, #010204);
    font-family: 'Rajdhani', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

canvas {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1;
}

main {
    user-select: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    position: relative;
    z-index: 2;
}

.products {
    position: relative;
    z-index: 2;
    width: 90%;
    max-width: 640px;
    margin: 0 auto;
    padding: 0 1.5rem 6rem;
    text-align: center;
}

.products h3 {
    font-family: 'Orbitron', monospace;
    font-weight: 700;
    font-size: 1rem;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: rgba(200, 232, 255, 0.45);
    margin-bottom: 2rem;
}

.product-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border: 1px solid rgba(0, 200, 255, 0.15);
    border-radius: 1.25rem;
    overflow: hidden;
}

.product-card {
    padding: 2rem 1.5rem;
    position: relative;
}

/* Internal grid lines */
.product-card:nth-child(1) {
    border-right: 1px solid rgba(0, 200, 255, 0.15);
    border-bottom: 1px solid rgba(0, 200, 255, 0.15);
}
.product-card:nth-child(2) {
    border-bottom: 1px solid rgba(0, 200, 255, 0.15);
}
.product-card:nth-child(3) {
    border-right: 1px solid rgba(0, 200, 255, 0.15);
}

.product-emoji {
    font-size: 2.2rem;
    display: block;
    margin-bottom: 0.6rem;
}

.product-card h4 {
    font-family: 'Orbitron', monospace;
    font-weight: 700;
    font-size: 0.75rem;
    letter-spacing: 2px;
    color: #c8e8ff;
    margin: 0 0 0.5rem;
}

.product-card p {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.85rem;
    font-weight: 500;
    color: rgba(200, 232, 255, 0.6);
    line-height: 1.6;
    margin: 0;
}

.product-card.coming-soon {
    opacity: 0.6;
}

.badge {
    display: inline-block;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(0, 200, 255, 0.7);
    border: 1px solid rgba(0, 200, 255, 0.2);
    border-radius: 2rem;
    padding: 0.15rem 0.65rem;
    margin-bottom: 0.5rem;
    transition: all 0.3s ease;
}

.badge.orange {
    border: 1px solid rgba(207, 143, 46, 0.867);
    color: rgba(207, 143, 46, 0.767);
}

.product-card:hover .badge {
    color: rgba(0, 200, 255, 1);
    border-color: rgba(0, 200, 255, 0.5);
    box-shadow: 0 0 12px rgba(0, 200, 255, 0.3);
}

.product-card:hover .badge.orange {
    color: rgba(207, 143, 46, 1);
    border-color: rgba(207, 143, 46, 0.7);
    box-shadow: 0 0 12px rgba(207, 143, 46, 0.3);
}

@media (max-width: 520px) {
    .product-grid {
        grid-template-columns: 1fr;
    }
    .product-card:nth-child(1),
    .product-card:nth-child(2),
    .product-card:nth-child(3) {
        border-right: none;
        border-bottom: 1px solid rgba(0, 200, 255, 0.15);
    }
    .product-card:nth-child(4) {
        border-bottom: none;
    }
}

footer {
    position: relative;
    z-index: 2;
    text-align: center;
    padding: 3rem 0 2.5rem;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.8rem;
    font-weight: 400;
    letter-spacing: 1px;
    color: rgba(200, 232, 255, 0.25);
}

.emoji {
    font-size: 6rem;
    line-height: 1;
}
.emoji-xs {
    font-size: 4rem;
}

small {
    color: rgba(200, 232, 255, 0.42);
    margin-top: -0.2rem;
    font-family: 'Rajdhani', sans-serif;
}

h1,
h2 {
    font-family: 'Orbitron', monospace;
    font-weight: 700;
}

h1 {
    color: #c8e8ff;
    font-size: 1.6rem;
    letter-spacing: 6px;
    text-shadow: 0 0 40px rgba(0, 200, 255, 0.6), 0 0 80px rgba(0, 200, 255, 0.3);
}

h2 {
    color: rgba(200, 232, 255, 0.55);
    font-family: 'Rajdhani', sans-serif;
    font-size: 1.2rem;
    font-weight: 500;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-top: 0.3rem;
}

.overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    animation: fadeIn 0.3s ease;
}

.copy {
    padding: 2rem 2.5rem;
    width: 90%;
    max-width: 520px;
    text-align: left;
    line-height: 1.8;
}

.copy .lead {
    font-family: 'Rajdhani', sans-serif;
    font-weight: 600;
    font-size: 1.05rem;
    color: #c8e8ff;
    letter-spacing: 0.5px;
    margin: 0 0 0.4rem;
}

.copy .body {
    font-family: 'Rajdhani', sans-serif;
    font-weight: 400;
    font-size: 0.95rem;
    color: rgba(200, 232, 255, 0.5);
    letter-spacing: 0.3px;
    margin: 0 0 0.5rem;
}

.copy .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(0, 200, 255, 0.25), transparent);
    margin: 1.2rem 0;
}

.copy a {
    color: #00c8ff;
    text-decoration: none;
    border-bottom: 1px solid rgba(0, 200, 255, 0.3);
    transition: all 0.2s ease;
    cursor: pointer;
}
.copy a:hover {
    color: #fff;
    border-bottom-color: #fff;
    text-shadow: 0 0 12px rgba(0, 200, 255, 0.5);
}
sub {
      color: rgba(232, 232, 255, 0.85);
      font-family: 'Rajdhani', sans-serif;
      font-size: 0.70rem;
      letter-spacing: 0.5px;
}


.modal {
    position: relative;
    background: rgba(4, 10, 22, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(0, 200, 255, 0.25);
    border-radius: 1rem;
    padding: 1.5rem;
    margin: 1.5rem;
    width: calc(90% - 3rem);
    max-width: 380px;
    text-align: center;
    animation: slideUp 0.3s ease;
    box-shadow:
        0 0 15px rgba(0, 200, 255, 0.15),
        0 0 60px rgba(0, 200, 255, 0.1),
        0 0 120px rgba(0, 200, 255, 0.05),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.modal h1 {
    font-family: 'Orbitron', monospace;
    font-size: 1.1rem;
    letter-spacing: 3px;
    margin: 0.5rem 0 1.5rem;
    color: #c8e8ff;
}

.modal small {
    color: #FFF;
}

.close {
    position: absolute;
    top: 0.75rem;
    right: 1rem;
    background: none;
    border: none;
    color: rgba(200, 232, 255, 0.5);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.25rem;
}

.close:hover {
    color: #c8e8ff;
}

form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

input {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(0, 180, 255, 0.13);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    color: #c8e8ff;
    font-family: 'Rajdhani', sans-serif;
    font-size: 1rem;
    font-weight: 500;
    letter-spacing: 0.5px;
    outline: none;
    transition: border-color 0.2s;
}

input::placeholder {
    color: rgba(200, 232, 255, 0.35);
}

input:focus {
    border-color: rgba(0, 200, 255, 0.4);
}

button[type="submit"] {
    background: rgba(0, 200, 255, 0.15);
    border: 1px solid rgba(0, 200, 255, 0.3);
    border-radius: 0.5rem;
    padding: 0.75rem;
    color: #00c8ff;
    font-family: 'Rajdhani', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.25s ease;
}

button[type="submit"]:hover:not(:disabled) {
    background: rgba(0, 200, 255, 0.25);
    box-shadow: 0 0 18px rgba(0, 200, 255, 0.28);
    transform: translateY(-1px);
}

button[type="submit"]:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.error {
    color: #ff6b6b;
    font-size: 0.85rem;
    margin: 0;
}

.success {
    padding: 1rem 0;
}

.checkmark {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 50%;
    background: rgba(52, 211, 153, 0.15);
    border: 2px solid #34d399;
    color: #34d399;
    font-size: 1.8rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem;
    animation: scaleIn 0.3s ease;
}

.success h1 {
    margin-bottom: 0.5rem;
}

.success p {
    color: rgba(200, 232, 255, 0.6);
    margin: 0;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes scaleIn {
    from {
        transform: scale(0);
    }

    to {
        transform: scale(1);
    }
}

.stagger {
    opacity: 0;
    transform: translateY(24px);
    animation: staggerIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    animation-delay: var(--delay, 0s);
}

@keyframes staggerIn {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
