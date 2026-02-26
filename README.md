# Particle Flow: Gesture Controlled Particles

## Overview

Particle Flow is an interactive web experiment that connects computer vision to real-time 3D graphics in the browser. Using MediaPipe for hand tracking and Three.js for rendering, this project lets you control a swarm of particles using simple hand gestures via your webcam—no extra hardware required.

It features dynamic, physics-based particles that form complex shapes (Spheres, Spirals, and Hearts) and react organically to how open or closed your hand is. The movement of the hand also controls the rotation of the 3D particle formations, creating an interactive and surprisingly engaging experience.

## Features

- **Real-Time Hand Tracking:** Uses `@mediapipe/hands` to detect your hand movements directly in the browser.
- **Gesture Control System:**
  - **Open Hand:** Expands the particle formation.
  - **Closed Hand/Fist:** Contracts/shrinks the particle formation.
  - **Hand X-Position:** Rotating the group of particles.
- **3D Particle Rendering:** Smooth, high-performance rendering handled by `three.js`.
- **Dynamic Formations:** Choose between Sphere, Spiral, or Heart shapes. The particles continuously move and morph smoothly when forms are changed.
- **No-Camera Fallback:** If you don't have a webcam or deny permissions, the application seamlessly falls back to mouse tracking (Vertical movement controls expansion, Horizontal movement controls rotation).
- **Customizable Appearance:** Real-time color picking within the UI to match your aesthetic. 

## Instructions: How to Use

### Setup & Running the Project

To run this project locally, you simply need a basic web server to serve the assets properly (because of ES modules and potential CORS policies when loading media).

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Dashersd/Particle.git
   cd Particle
   ```

2. **Run a local test server:**
   If you have Node.js installed, you can use `npx`:
   ```bash
   npx serve .
   ```
   Or if you prefer python:
   ```bash
   python -m http.server 8000
   ```

3. **Open in Browser:**
   Navigate to `http://localhost:3000` (or `http://localhost:8000` for python) in your web browser.

Alternatively, if this project was built using Vite (based on the `package.json`), you can run:
```bash
npm install
npm run dev
```

### Controls

1. **Allow Camera Access:** Upon loading the page, your browser will ask for camera permissions. You must accept this for the MediaPipe gestures to work.
2. **Gesture Controls (Webcam required):**
   * Keep your hand in clear view of the camera.
   * **Open your hand wide (fingers spread)** to make the particle pattern expand outward.
   * **Make a fist (close fingers)** to pull the particles tightly together into the center.
   * **Move your hand side-to-side (left/right)** to rotate the particle formation. 
3. **Mouse Fallback:**
   * If the camera fails to load, simply move your mouse cursor over the window.
   * Up/Down controls expansion.
   * Left/Right controls rotation.
4. **UI Menu (Top Right):**
   * **Pattern:** Swap between Sphere, Spiral, or Heart formations dynamically.
   * **Color:** Use the color picker to instantly change the glowing color of the particles.
   * **Toggle Fullscreen:** Immerse yourself fully by making the app go fullscreen.

## Technology Stack

* **Vite** (Build Tool)
* **Three.js** (3D WebGL Graphics)
* **MediaPipe Hands** (Machine Learning powered hand tracking by Google)
* **HTML5 Canvas & Vanilla JavaScript** 

## License
MIT License
