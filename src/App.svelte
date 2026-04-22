<script>
  import {onMount} from 'svelte';

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
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email }),
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
    let mouseX = 0, mouseY = 0, prevMouseX = 0, prevMouseY = 0;
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
      prevMouseX = mouseX; prevMouseY = mouseY;
      mouseX = e.clientX; mouseY = e.clientY;
      const dx = mouseX - prevMouseX, dy = mouseY - prevMouseY;
      mouseSpeed = Math.sqrt(dx * dx + dy * dy);

      if (mode === 1) swirlSpawn(mouseX, mouseY);
      if (mode === 2) cometSpawn(mouseX, mouseY, dx, dy);
    });

    // Particle Swirl
    const SWIRL_COLORS = [
      { r: 0, g: 200, b: 255 }, { r: 160, g: 255, b: 96 },
      { r: 255, g: 107, b: 53 }, { r: 200, g: 232, b: 255 }
    ];
    const swirlParticles = [];
    const MAX_SWIRL = 80;

    function swirlSpawn(x, y) {
      for (let i = 0; i < 2 && swirlParticles.length < MAX_SWIRL; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1.2 + 0.3;
        swirlParticles.push({
          x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 1.0, decay: Math.random() * 0.015 + 0.008,
          size: Math.random() * 2.5 + 0.8,
          color: SWIRL_COLORS[Math.floor(Math.random() * SWIRL_COLORS.length)],
          angle, angularVel: (Math.random() - 0.5) * 0.08,
          orbitRadius: Math.random() * 12 + 4, originX: x, originY: y,
        });
      }
    }

    function swirlUpdate() {
      for (let i = swirlParticles.length - 1; i >= 0; i--) {
        const p = swirlParticles[i];
        p.life -= p.decay;
        if (p.life <= 0) { swirlParticles.splice(i, 1); continue; }
        p.angle += p.angularVel;
        p.orbitRadius += 0.15;
        p.vx *= 0.98; p.vy *= 0.98;
        p.x = p.originX + Math.cos(p.angle) * p.orbitRadius + p.vx;
        p.y = p.originY + Math.sin(p.angle) * p.orbitRadius + p.vy;
        p.originX += (mouseX - p.originX) * 0.01;
        p.originY += (mouseY - p.originY) * 0.01;
      }
    }

    function swirlDraw() {
      for (const p of swirlParticles) {
        const a = p.life * 0.7;
        const { r, g, b } = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${a * 0.15})`; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`; ctx.fill();
      }
      ctx.lineWidth = 0.5;
      for (let i = 0; i < swirlParticles.length; i++) {
        for (let j = i + 1; j < swirlParticles.length; j++) {
          const a = swirlParticles[i], b = swirlParticles[j];
          const dx = a.x - b.x, dy = a.y - b.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 50) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
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
          life: 1.0, decay: 0.012 + Math.random() * 0.018,
          speed, size: Math.random() * 1.2 + 0.5,
        });
      }
    }

    function cometUpdate() {
      for (let i = cometTrail.length - 1; i >= 0; i--) {
        const p = cometTrail[i];
        p.life -= p.decay;
        if (p.life <= 0) { cometTrail.splice(i, 1); continue; }
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.96; p.vy *= 0.96;
      }
    }

    function cometDraw() {
      if (mouseSpeed > 2) {
        const headAlpha = Math.min(0.8, mouseSpeed / 30);
        const headGrad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 20);
        headGrad.addColorStop(0, `rgba(200,230,255,${headAlpha * 0.4})`);
        headGrad.addColorStop(1, 'rgba(200,230,255,0)');
        ctx.beginPath(); ctx.arc(mouseX, mouseY, 20, 0, Math.PI * 2);
        ctx.fillStyle = headGrad; ctx.fill();
        ctx.beginPath(); ctx.arc(mouseX, mouseY, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,240,255,${headAlpha})`; ctx.fill();
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
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = grad; ctx.lineWidth = p.size; ctx.stroke();

        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,240,255,${alpha})`; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,180,255,${alpha * 0.08})`; ctx.fill();
      }
    }

    // Main loop — always update/draw both so particles fade out after mode switch
    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      swirlUpdate(); swirlDraw();
      cometUpdate(); cometDraw();
      requestAnimationFrame(loop);
    }
    loop();

    const modalTimer = setTimeout(() => { showModal = true; }, 2500);

    return () => {
      window.removeEventListener('resize', resize);
      clearTimeout(modalTimer);
    };
  });
</script>

<canvas bind:this={canvas}></canvas>

<main>
  <div class="emoji">🔭</div>
  <h1>Landing Soon</h1>
  <small>Straw I/O offeres digital services and AI consultung</small>
</main>

{#if showModal}
  <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
  <div class="overlay" on:click={() => { if (!success) showModal = false; }}>
    <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
    <div class="modal" on:click|stopPropagation>
      {#if success}
        <div class="success">
          <div class="checkmark">✓</div>
          <h1>🙌 Thank you!</h1>
          <p>Soon you'll be hearing from us.</p>
        </div>
      {:else}
        <button class="close" on:click={() => showModal = false}>✕</button>

      <div class="emoji">😎</div>
      <small>&nbsp;</small>
      <h1>Get in touch</h1>
      <small>&nbsp;</small>
              <form on:submit|preventDefault={handleSubmit}>
          <input type="text" placeholder="Name" bind:value={name} required />
          <input type="email" placeholder="Email" bind:value={email} required />
          {#if error}<p class="error">{error}</p>{/if}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Sending...' : 'Submit'}
          </button>
        </form>
      {/if}
    </div>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    background: #020408;
    background: radial-gradient(ellipse at 30% 40%, #040e1e, #010204);
    font-family: 'Lato', sans-serif;
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
  }

  .emoji {
    font-size: 6rem;
    line-height: 1;
  }

  small {
    color: #9aab97;
    margin-top: -0.2rem;
  }

  h1 {
    font-family: 'Lato', sans-serif;
    font-weight: 700;
    font-size: 1.5rem;
    color: #c8e8ff;
    margin-top: 0.4rem;
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

  .modal {
    position: relative;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 1rem;
    padding: 2.5rem;
    width: 90%;
    max-width: 380px;
    text-align: center;
    animation: slideUp 0.3s ease;
  }

  .modal h1 {
    font-size: 1.5rem;
    margin: 0 0 1.5rem;
    color: #c8e8ff;
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
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    color: #c8e8ff;
    font-family: 'Lato', sans-serif;
    font-size: 1rem;
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
    color: #c8e8ff;
    font-family: 'Lato', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
  }

  button[type="submit"]:hover:not(:disabled) {
    background: rgba(0, 200, 255, 0.25);
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
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes scaleIn {
    from { transform: scale(0); }
    to { transform: scale(1); }
  }
</style>
