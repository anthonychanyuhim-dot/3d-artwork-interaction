import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import gsap from 'gsap';
import { artworksRegistry } from '../data/artworks';
import { useGallery } from '../state/GalleryContext';

const TRANSITION_DURATION = 1.4;
const TRANSITION_EASE = 'power2.inOut';
// Breathing room around a painting when the fit distance wins over focusOffset.
const FIT_MARGIN = 1.1;
// Canonical inspection FOV — matches the Canvas default in GalleryScene.
const BASE_FOV = 45;
// Canonical "home" gallery pose. The mount reset and every return tween snap
// back to exactly these values, guaranteeing a centred, level first frame.
const HOME_POSITION: [number, number, number] = [0, 4, 6.5];
const HOME_TARGET: [number, number, number] = [0, 4, 0];
// Softened native wheel-dolly sensitivity (1 = OrbitControls default).
const ZOOM_SPEED = 0.5;

// Zoom latch is driven STRICTLY by explicit wheel input (never the continuous
// `change` event, which panning fires and would leak). Any forward notch locks
// it instantly; it only releases on a backward notch once the camera's wall
// depth has physically returned to within this hard-stop of base.
const ZOOM_RELEASE = 0.05;
// Horizontal swipe → NAV thresholds (only when NOT zoomed in).
const SWIPE_MIN_DISTANCE = 150; // px of horizontal travel required
const SWIPE_MAX_OFF_AXIS = 0.6; // |dy| must stay under this fraction of |dx|
const SWIPE_MAX_DURATION = 700; // ms flick window — the velocity gate

/**
 * Headless controller (renders nothing). Drives the camera with GSAP during the
 * transitional `focusing` / `returning` phases, then hands 100% control to
 * OrbitControls in the static `focused` phase (zoom-to-cursor + pan). A
 * wheel-driven boolean latch gates navigation and the overlay fade.
 */
export function CameraRig() {
  const { state, dispatch } = useGallery();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;

  // Holds the active timeline so we can kill it if state changes mid-flight.
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  // Guards the one-time mount reset (StrictMode-safe).
  const initializedRef = useRef(false);
  // Base focus distance of the active artwork — the distance the camera flies to
  // when fully zoomed out. The swipe gate compares the live distance against it.
  const baseDistanceRef = useRef(0);
  // STATIC framing of the active artwork, captured at focus time. These never
  // move while panning (unlike controls.target), so the zoom gate stays honest.
  const staticCenterRef = useRef(new THREE.Vector3());
  const forwardNormalRef = useRef(new THREE.Vector3(0, 0, 1));
  // Iron-clad zoom latch. Flipped true the instant the user wheels in past the
  // latch threshold; the swipe/return gate reads ONLY this boolean, so panning
  // can never leak it back open. Released only by wheeling out to the hard-stop.
  const hasZoomedInRef = useRef(false);

  // Single-fire hard reset on mount. A hard browser reload can preserve stale
  // OrbitControls/camera state; force the canonical home pose for a clean frame.
  useEffect(() => {
    if (!controls || initializedRef.current) return;
    initializedRef.current = true;

    camera.position.set(...HOME_POSITION);
    camera.fov = BASE_FOV;
    camera.updateProjectionMatrix();

    controls.target.set(...HOME_TARGET);
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enabled = true;
    controls.zoomToCursor = true;
    controls.zoomSpeed = ZOOM_SPEED;
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.update();
  }, [controls, camera]);

  // Main state-machine driver.
  useEffect(() => {
    if (!controls) return;

    // Cancel any in-flight timeline before starting a new phase.
    timelineRef.current?.kill();

    if (state.mode === 'focused') {
      // Fresh arrival sits at base framing — not zoomed in yet.
      hasZoomedInRef.current = false;

      // 100% OrbitControls control. Kill any residual GSAP camera animation so
      // the mouse wheel never fights a tween (the root cause of jerky zoom and
      // the snap-back-to-centre). Native dolly then gives smooth zoom-to-cursor.
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(controls.target);
      gsap.killTweensOf(camera);

      controls.enableRotate = false; // no flipping the chapel while reading
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      controls.enableZoom = true;
      controls.zoomToCursor = true;
      controls.enabled = true;
      // On arrival the camera sits at the base distance (not zoomed): reserve
      // left-drag / one-finger drag for swipe navigation rather than panning.
      controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      controls.touches.ONE = THREE.TOUCH.ROTATE;
    }

    if (state.mode === 'focusing') {
      controls.enabled = false;

      const artwork = artworksRegistry.find((a) => a.id === state.activeArtworkId);
      if (!artwork) {
        // Unknown id — bail safely rather than locking the machine forever.
        controls.enabled = true;
        dispatch({ type: 'SET_EXPLORE' });
        return;
      }

      // Fresh framing for this artwork: Box3 centre + world-space forward normal.
      const center = new THREE.Vector3();
      const forward = new THREE.Vector3(0, 0, 1);
      const object = scene.getObjectByName(`artwork-${artwork.id}`);
      if (object) {
        new THREE.Box3().setFromObject(object).getCenter(center);
        forward.applyQuaternion(object.getWorldQuaternion(new THREE.Quaternion()));
      } else {
        center.set(...artwork.position);
        forward.applyEuler(new THREE.Euler(...artwork.rotation));
      }
      forward.normalize();

      // Distance that fits the painting at the base FOV; remembered for the gate.
      const [width, height] = artwork.dimensions;
      const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2));
      const fitHeight = height / 2 / tanHalfFov;
      const fitWidth = width / 2 / (tanHalfFov * camera.aspect);
      const distance = Math.max(artwork.focusOffset, Math.max(fitHeight, fitWidth) * FIT_MARGIN);
      baseDistanceRef.current = distance;
      // Snapshot the immutable framing for the zoom gate (before `forward` is
      // scaled below). controls.target will drift during panning; these won't.
      staticCenterRef.current.copy(center);
      forwardNormalRef.current.copy(forward);
      const focusPos = center.clone().add(forward.multiplyScalar(distance));

      // Smooth flight from the *live* (possibly zoomed/panned) coordinates to the
      // fresh canonical framing — gsap.to() reads the current live values as the
      // tween start, so NAV/back always eases out from wherever the user left it.
      const tl = gsap.timeline({
        onUpdate: () => {
          camera.lookAt(controls.target);
          camera.updateProjectionMatrix();
          controls.update();
        },
        onComplete: () => {
          // Release the camera to OrbitControls: kill the just-finished tweens so
          // nothing lingers to fight the wheel, then enter the focused phase.
          gsap.killTweensOf(camera.position);
          gsap.killTweensOf(controls.target);
          gsap.killTweensOf(camera);
          dispatch({ type: 'SET_FOCUSED' });
        },
      });

      tl.to(
        camera.position,
        { x: focusPos.x, y: focusPos.y, z: focusPos.z, duration: TRANSITION_DURATION, ease: TRANSITION_EASE },
        0,
      );
      tl.to(
        controls.target,
        { x: center.x, y: center.y, z: center.z, duration: TRANSITION_DURATION, ease: TRANSITION_EASE },
        0,
      );
      tl.to(
        camera,
        { fov: BASE_FOV, duration: TRANSITION_DURATION, ease: TRANSITION_EASE },
        0,
      );

      timelineRef.current = tl;
    }

    if (state.mode === 'returning') {
      // Controls stay locked during the return tween (CLAUDE.md §3).
      controls.enabled = false;

      // Always ease from the live manipulated pose back to the canonical home.
      const tl = gsap.timeline({
        onUpdate: () => {
          camera.lookAt(controls.target);
          camera.updateProjectionMatrix();
          controls.update();
        },
        onComplete: () => {
          // Restore full free-roam controls for the explore phase.
          controls.enableRotate = true;
          controls.enablePan = true;
          controls.enableZoom = true;
          controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
          controls.touches.ONE = THREE.TOUCH.ROTATE;
          controls.enabled = true;
          dispatch({ type: 'SET_EXPLORE' });
        },
      });

      tl.to(
        camera.position,
        { x: HOME_POSITION[0], y: HOME_POSITION[1], z: HOME_POSITION[2], duration: TRANSITION_DURATION, ease: TRANSITION_EASE },
        0,
      );
      tl.to(
        controls.target,
        { x: HOME_TARGET[0], y: HOME_TARGET[1], z: HOME_TARGET[2], duration: TRANSITION_DURATION, ease: TRANSITION_EASE },
        0,
      );
      tl.to(
        camera,
        { fov: BASE_FOV, duration: TRANSITION_DURATION, ease: TRANSITION_EASE },
        0,
      );

      timelineRef.current = tl;
    }

    return () => {
      timelineRef.current?.kill();
    };
  }, [state.mode, state.activeArtworkId, camera, scene, controls, dispatch]);

  // Zoom latch — driven STRICTLY by explicit wheel input, NOT the continuous
  // `change` event (which panning fires and would leak). Panning therefore has
  // no mathematical pathway to flip this latch. Listener sits on the canvas in
  // bubble phase so OrbitControls dollies the camera first; we then read the
  // settled position.
  useEffect(() => {
    if (state.mode !== 'focused' || !controls) return;
    const canvas = gl.domElement;

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        // Forward notch = zoom in → lock immediately, force left-drag to PAN.
        if (!hasZoomedInRef.current) {
          hasZoomedInRef.current = true;
          controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
          controls.touches.ONE = THREE.TOUCH.PAN;
          dispatch({ type: 'SET_INSPECTING', payload: true });
        }
      } else if (event.deltaY > 0 && hasZoomedInRef.current) {
        // Backward notch = zoom out → unlock ONLY once the camera's perpendicular
        // wall depth has physically returned to baseline. Wall depth (not raw
        // centre distance) so a lateral pan can't fake a "zoomed-out" reading.
        const depth = camera.position
          .clone()
          .sub(staticCenterRef.current)
          .dot(forwardNormalRef.current);
        if (depth >= baseDistanceRef.current - ZOOM_RELEASE) {
          hasZoomedInRef.current = false;
          controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
          controls.touches.ONE = THREE.TOUCH.ROTATE;
          dispatch({ type: 'SET_INSPECTING', payload: false });
        }
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive: true });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [state.mode, controls, camera, gl, dispatch]);

  // Keyboard navigation — live ONLY during the static `focused` phase, unlocked.
  useEffect(() => {
    if (state.mode !== 'focused' || state.transitionLock) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          dispatch({ type: 'NAV_NEXT' });
          break;
        case 'ArrowLeft':
          event.preventDefault();
          dispatch({ type: 'NAV_PREV' });
          break;
        case 'Escape':
          event.preventDefault();
          dispatch({ type: 'TRIGGER_BACK' });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.mode, state.transitionLock, dispatch]);

  // Pointer gestures — live ONLY while focused & unlocked. The gate reads the
  // wheel-driven `hasZoomedInRef` boolean ONLY (no distance math here):
  //  • latched (zoomed in): force left-drag to OrbitControls PAN, never navigate;
  //  • not latched (base framing): reserve the drag for a horizontal swipe → NAV.
  // Listeners are capture-phase so the drag routing is set on the controls
  // BEFORE OrbitControls reads mouseButtons on its own pointerdown.
  useEffect(() => {
    if (state.mode !== 'focused' || state.transitionLock || !controls) return;

    let activePointer: number | null = null;
    let activeCount = 0;
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const onPointerDown = (event: PointerEvent) => {
      activeCount += 1;
      // A second finger is a pan/zoom gesture — leave it entirely to OrbitControls.
      if (activeCount > 1) {
        activePointer = null;
        return;
      }
      activePointer = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startTime = event.timeStamp;

      // Route this drag off the latched boolean only — no float math here.
      const zoomed = hasZoomedInRef.current;
      controls.mouseButtons.LEFT = zoomed ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
      controls.touches.ONE = zoomed ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    };

    const onPointerUp = (event: PointerEvent) => {
      activeCount = Math.max(0, activeCount - 1);
      if (event.pointerId !== activePointer) return;
      activePointer = null;

      // Iron-clad gate: while zoomed in, navigation is completely offline.
      if (hasZoomedInRef.current) return;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const dt = event.timeStamp - startTime;
      // A quick, mostly-horizontal flick of sufficient length navigates.
      if (dt > SWIPE_MAX_DURATION) return;
      if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return;
      if (Math.abs(dy) > Math.abs(dx) * SWIPE_MAX_OFF_AXIS) return;

      dispatch({ type: dx < 0 ? 'NAV_NEXT' : 'NAV_PREV' });
    };

    const onPointerCancel = () => {
      activeCount = Math.max(0, activeCount - 1);
      activePointer = null;
    };

    const opts = { capture: true } as const;
    window.addEventListener('pointerdown', onPointerDown, opts);
    window.addEventListener('pointerup', onPointerUp, opts);
    window.addEventListener('pointercancel', onPointerCancel, opts);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, opts);
      window.removeEventListener('pointerup', onPointerUp, opts);
      window.removeEventListener('pointercancel', onPointerCancel, opts);
    };
  }, [state.mode, state.transitionLock, controls, dispatch]);

  return null;
}
