import * as THREE from 'three';

// --- Configuration ---
const CONFIG = {
    particleCount: 2000,
    minParticleCount: 500,
    lerpFactor: 0.05,
    positionLerpFactor: 0.1, // Faster response for movement
    expansion: {
        normal: 1.0,
        open: 2.5,
        closed: 0.2
    },
    rotation: {
        maxSpeed: 0.05, // reduced for control
        deadZone: 0.05,
        sensitivity: 2.0
    },
    heartbeat: {
        speed: 0.005, // ~1.2s period
        amplitude: 0.03 // Gentle 3% pulse
    },
    colors: {
        primary: 0x00ffff
    }
};

// --- State ---
const state = {
    particleCount: CONFIG.particleCount,
    currentPattern: 'sphere',
    targetExpansion: CONFIG.expansion.normal,
    currentExpansion: CONFIG.expansion.normal,
    targetRotationSpeed: 0,
    currentRotationSpeed: 0,
    isGestureActive: false,
    fps: 60,
    lastTime: performance.now()
};

// --- Three.js Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 30;

const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true }); // optimize
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for optimization
container.appendChild(renderer.domElement);

// --- Particle System ---
let geometry, material, particles;
let basePositions = new Float32Array(CONFIG.particleCount * 3);

function initParticles() {
    if (particles) {
        scene.remove(particles);
        geometry.dispose();
        material.dispose();
    }

    geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(state.particleCount * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Use a simple shader material or PointsMaterial. PointsMaterial is strict "no complex shaders" but simple.
    // Using a custom texture can be nicer, but let's stick to simple mathematical patterns.
    // Actually, a circular texture generated on canvas makes it look premium.
    const sprite = generateSprite();

    material = new THREE.PointsMaterial({
        color: CONFIG.colors.primary,
        size: 0.5,
        map: sprite,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Initialize base positions buffers
    if (basePositions.length !== state.particleCount * 3) {
        basePositions = new Float32Array(state.particleCount * 3);
    }

    generatePattern(state.currentPattern);
}

function generateSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// --- Pattern Generators ---
function generatePattern(type) {
    state.currentPattern = type;
    const count = state.particleCount;

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        let x, y, z;

        if (type === 'sphere') {
            const phi = Math.acos(-1 + (2 * i) / count);
            const theta = Math.sqrt(count * Math.PI) * phi;
            const r = 10;
            x = r * Math.cos(theta) * Math.sin(phi);
            y = r * Math.sin(theta) * Math.sin(phi);
            z = r * Math.cos(phi);
        } else if (type === 'spiral') {
            const angle = 0.1 * i;
            const r = 0.1 * i; // expanding spiral
            // Limit size
            const maxR = 15;
            // Simple helix with loop
            x = (i * 0.05) * Math.cos(i * 0.1);
            z = (i * 0.05) * Math.sin(i * 0.1);
            y = (i * 0.02) - 10;
        } else if (type === 'heart') {
            // Parametric Heart
            // t goes from 0 to 2PI
            // We use 'i' to traverse t, but maybe adding multiple layers or randomizing t gives better volume
            const t = (i / count) * Math.PI * 2;

            // Standard Heart Formula
            // x = 16 sin^3(t)
            // y = 13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t)

            const scale = 0.5; // Scale to fit view

            x = scale * (16 * Math.pow(Math.sin(t), 3));
            y = scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));

            // Add subtle Z depth for 3D volume
            // Let's make it a thick shell or random within a range
            z = (Math.random() - 0.5) * 5;

            // Center adjustment
            // RangeY approx +5 to -17. Midpoint ~ -6.
            // We need to shift UP by ~6 to center at 0.
            y += 5.0;
        }

        basePositions[i3] = x;
        basePositions[i3 + 1] = y;
        basePositions[i3 + 2] = z;
    }
}



// --- Gesture Logic ---
function updateGesture(landmarks) {
    if (!landmarks) {
        // If hand lost, slowly return to normal state
        state.targetExpansion = CONFIG.expansion.normal;
        state.targetRotationSpeed = 0; // Stop active rotation
        state.isGestureActive = false;
        document.getElementById('status-text').innerText = "Status: No Hand Detected";
        return;
    }

    // 1. Calculate Hand Openness (Expansion)
    const wrist = landmarks[0];
    const tips = [8, 12, 16, 20];
    let avgDist = 0;
    for (let idx of tips) {
        const dx = landmarks[idx].x - wrist.x;
        const dy = landmarks[idx].y - wrist.y;
        avgDist += Math.sqrt(dx * dx + dy * dy);
    }
    avgDist /= 4;

    if (avgDist > 0.35) {
        state.targetExpansion = CONFIG.expansion.open;
        document.getElementById('status-text').innerText = "Gesture: Open Hand (Expand)";
        state.isGestureActive = true;
    } else if (avgDist < 0.2) {
        state.targetExpansion = CONFIG.expansion.closed;
        document.getElementById('status-text').innerText = "Gesture: Closed Hand (Contract)";
        state.isGestureActive = true;
    } else {
        state.targetExpansion = CONFIG.expansion.normal;
        document.getElementById('status-text').innerText = "Gesture: Neutral";
        state.isGestureActive = true;
    }

    // 2. Calculate Hand Horizontal Position (Rotation Control)
    // MediaPipe x is 0 (left) to 1 (right).
    let rawX = landmarks[0].x;

    // Center is 0.5. Calculate offset.
    let offset = rawX - 0.5;

    // Apply DeadZone
    if (Math.abs(offset) < CONFIG.rotation.deadZone) {
        offset = 0;
    } else {
        // Smooth out the step from deadzone
        offset = Math.sign(offset) * (Math.abs(offset) - CONFIG.rotation.deadZone);
    }

    // Map to Rotation Speed
    // Hand Right (Positive offset) -> Positive Rotation Speed
    state.targetRotationSpeed = offset * CONFIG.rotation.sensitivity * CONFIG.rotation.maxSpeed;

    // Clamp speed
    state.targetRotationSpeed = Math.max(Math.min(state.targetRotationSpeed, CONFIG.rotation.maxSpeed), -CONFIG.rotation.maxSpeed);
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = now - state.lastTime;
    state.lastTime = now;
    // FPS calculation for optimization
    if (delta > 0) {
        const fps = 1000 / delta;
        state.fps = state.fps * 0.9 + fps * 0.1; // Smooth FPS
    }

    // Optimization: Reduce particles if FPS is bad consistently
    if (state.fps < 25 && state.particleCount > CONFIG.minParticleCount && now % 2000 < 20) {
        // Reduce by 500 every 2 seconds if lagging
        state.particleCount -= 500;
        initParticles();
        console.log("Performance adjustment: Reduced particles to " + state.particleCount);
        document.getElementById('particle-count').innerText = state.particleCount;
    }

    // Smooth expansion transition
    state.currentExpansion += (state.targetExpansion - state.currentExpansion) * CONFIG.lerpFactor;

    // Smooth rotation speed transition
    state.currentRotationSpeed += (state.targetRotationSpeed - state.currentRotationSpeed) * CONFIG.lerpFactor;

    // Apply Rotation
    particles.rotation.y += state.currentRotationSpeed;

    // Tiny idle Z rotation for life (keep subtle)
    particles.rotation.z += 0.0005;

    // Update Particles
    const positions = particles.geometry.attributes.position.array;
    const count = state.particleCount;

    // Heartbeat Logic
    let pulseScale = 1.0;
    if (state.currentPattern === 'heart') {
        // Smooth sine wave pulse: Center at 1.0, range +/- amplitude
        // Use Math.abs(sin) for a "bump" or just cos for breathing?
        // Prompt says "gentle expand -> relax". Sine is fine.
        pulseScale = 1.0 + Math.sin(now * CONFIG.heartbeat.speed) * CONFIG.heartbeat.amplitude;
    }

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Lerp towards modified base position
        const bx = basePositions[i3];
        const by = basePositions[i3 + 1];
        const bz = basePositions[i3 + 2];

        // Apply expansion AND Heartbeat Pulse
        const finalScale = state.currentExpansion * pulseScale;

        const tx = bx * finalScale;
        const ty = by * finalScale;
        const tz = bz * finalScale;

        // Dynamic noise/wiggle for "alive" feel
        const time = now * 0.001;
        const noise = Math.sin(time + bx * 0.5) * 0.2; // Optimized fake noise

        // Simple smooth update - we can just set directly as we interpolated expansion
        positions[i3] = tx + noise;
        positions[i3 + 1] = ty + noise;
        positions[i3 + 2] = tz + noise;
    }

    particles.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
}

// --- MediaPipe Initialization ---
function initMediaPipe() {
    const videoElement = document.getElementsByClassName('input_video')[0];

    if (!window.Hands) {
        setTimeout(initMediaPipe, 100);
        return;
    }

    // Access the global Hands object loaded via script tag
    // Note: Depending on CDN version, it might be window.Hands or just Hands class in global scope.
    // The CDN links provided expose `Hands`.

    const hands = new window.Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0, // Lite model for performance
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults((results) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            updateGesture(results.multiHandLandmarks[0]);
        } else {
            // No hands
            updateGesture(null);
        }
    });

    // Camera setup
    const cameraUtils = new window.Camera(videoElement, {
        onFrame: async () => {
            await hands.send({ image: videoElement });
        },
        width: 640,
        height: 480
    });

    cameraUtils.start()
        .then(() => {
            document.getElementById('status-text').innerText = "Camera Active. Show Hand.";
        })
        .catch(err => {
            console.error(err);
            let msg = "Camera Error";
            if (err.name === 'NotReadableError' || err.message.includes('Device in use')) {
                msg = "Camera busy! Close other tabs.";
            } else if (err.name === 'NotAllowedError') {
                msg = "Camera permission denied.";
            }
            document.getElementById('status-text').innerText = msg;
            activateMouseFallback(msg);
        });
}

function activateMouseFallback(reason) {
    const status = document.getElementById('status-text');
    status.innerHTML = `<span style="color: #ff4444">${reason}</span> <br/> Fallback: Mouse Y Control (Move Up/Down).`;

    window.addEventListener('mousemove', (e) => {
        // Fallback: Mouse Control
        // Y -> Expansion
        const nY = 1.0 - (e.clientY / window.innerHeight);

        if (Math.abs(nY - 0.5) < 0.1) {
            state.targetExpansion = CONFIG.expansion.normal;
        } else if (nY > 0.6) {
            state.targetExpansion = CONFIG.expansion.open;
        } else {
            state.targetExpansion = CONFIG.expansion.closed;
        }

        // X -> Rotation Control
        const nX = (e.clientX / window.innerWidth) - 0.5;
        // Apply deadzone for mouse
        if (Math.abs(nX) < CONFIG.rotation.deadZone) {
            state.targetRotationSpeed = 0;
        } else {
            // Map offset to speed
            const offset = Math.sign(nX) * (Math.abs(nX) - CONFIG.rotation.deadZone);
            state.targetRotationSpeed = offset * CONFIG.rotation.sensitivity * CONFIG.rotation.maxSpeed;
        }
    });
}

// --- Event Listeners ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.querySelectorAll('.pattern-buttons button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.pattern-buttons button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        generatePattern(e.target.dataset.pattern);
    });
});

document.getElementById('color-picker').addEventListener('input', (e) => {
    material.color.set(e.target.value);
});

document.getElementById('fullscreen-btn').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});

// --- Start ---
initParticles();
animate();
// Defer MediaPipe init slightly to ensure scripts load or handle via window load
window.addEventListener('load', initMediaPipe);
