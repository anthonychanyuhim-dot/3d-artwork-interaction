# CLAUDE.md - 3D Virtual Art Gallery Specification

## 1. Tech Stack Requirements
- **Build Tool / Framework:** Vite + React (v18+) + TypeScript
- **3D Engine Layer:** Three.js + React Three Fiber (R3F) + @react-three/drei
- **Animation Engine:** GSAP (GreenSock Animation Platform)
- **State Management:** React Context API + useReducer (No heavy external state like Redux)

## 2. Architecture & File Structure
All code must be clean, modular, and strongly typed. Maintain strict separation between 3D scene rendering and 2D HTML UI.
- `src/data/` - Static registries and configurations.
- `src/state/` - Global state machine, reducers, and context providers.
- `src/scene/` - All 3D meshes, lights, cameras, and R3F components.
- `src/ui/` - Standard HTML/DOM overlay components (Next/Prev/Back buttons).

## 3. Core State Machine Rules
The application MUST strictly operate within one of these 4 states at any given time:
- `explore`: Free-roaming mode. `OrbitControls` are enabled. Users can pan/tilt/zoom around the gallery.
- `focusing`: Transitional state. A specific artwork has been clicked. `OrbitControls` are DISABLED. `transitionLock` is set to `true`. Camera is actively tweening towards the artwork.
- `focused`: Static inspection mode. Camera has arrived at the artwork's focus anchor. DOM UI Overlay is visible.
- `returning`: Transitional state. User clicked "Back". `OrbitControls` remain disabled. Camera is actively tweening back to the saved pre-focus pose.

## 4. Coding & Style Guidelines
- **No Floating 3D Text for UI:** All structural text, titles, descriptions, and HUD buttons MUST live in the regular HTML DOM, absolutely positioned over the canvas.
- **Render Control:** During `focusing` and `returning` states, any camera modification (FOV or position) via GSAP must trigger `camera.updateProjectionMatrix()` on update.
- **Pointer Hygiene:** Every 3D pointer event (like `onClick` on a painting) must call `event.stopPropagation()` to prevent raycast leakage to objects behind it.
- **Performance Clamping:** Keep canvas `devicePixelRatio` clamped to a maximum of 2 to protect mobile GPU performance.

## 5. Routine Terminal Commands
- Install Dependencies: `npm install`
- Start Development Server: `npm run dev`
- Build Production Bundle: `npm run build`
