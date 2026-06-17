import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import gsap from 'gsap';
import { artworksRegistry } from '../data/artworks';
import { useGallery } from '../state/GalleryContext';

const TRANSITION_DURATION = 1.4;
const TRANSITION_EASE = 'power2.inOut';
// Canonical inspection FOV - matches the Canvas default in GalleryScene.
const BASE_FOV = 45;
// Canonical "home" gallery pose - hardcoded for perfect absolute symmetry: on the
// central axis (X=0), level (matching Y), looking straight down the chapel length.
export const HOME_POSITION: [number, number, number] = [0, 4.5, 15];
export const HOME_TARGET: [number, number, number] = [0, 4.5, 0];
// Softened native wheel-dolly sensitivity (1 = OrbitControls default).
const ZOOM_SPEED = 0.5;
// THREE.MOUSE has no NONE member; OrbitControls treats any unmapped button value
// as "no action", so -1 fully disables single-finger left-drag (Mac zoom mode).
const MOUSE_NONE = -1 as THREE.MOUSE;

// Zoom latch is driven STRICTLY by explicit wheel input (never the continuous
// `change` event, which panning fires and would leak). Any forward notch locks
// it instantly; it only releases on a backward notch once the camera's wall
// depth has physically returned to within this hard-stop of base.
const ZOOM_RELEASE = 0.05;
// Horizontal swipe -> NAV thresholds (only when NOT zoomed in).
const SWIPE_MIN_DISTANCE = 150; // px of horizontal travel required
const SWIPE_MAX_OFF_AXIS = 0.6; // |dy| must stay under this fraction of |dx|
const SWIPE_MAX_DURATION = 700; // ms flick window - the velocity gate

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
  // Base focus distance of the active artwork - the distance the camera flies to
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
  // Live mirror of transitionLock so event handlers can short-circuit ANY input
  // the instant a GSAP timeline is running - no queued / broken transitions.
  const transitionLockRef = useRef(state.transitionLock);
  transitionLockRef.current = state.transitionLock;

  // Single-fire hard reset on mount. A hard browser reload can preserve stale
  // OrbitControls/camera state; force the canonical home pose for a clean frame.
  useEffect(() => {
    if (!controls || initializedRef.current) return;
    initializedRef.current = true;

    camera.position.set(...HOME_POSITION);
    camera.up.set(0, 1, 0);
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
      // Fresh arrival sits at base framing - not zoomed in yet.
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
        // Unknown id - bail safely rather than locking the machine forever.
        controls.enabled = true;
        dispatch({ type: 'SET_EXPLORE' });
        return;
      }

      // -- CLEAN WORLD CENTRE (stable baseline - no Box3, no offsets) ------
      // Read the painting mesh's absolute world position after forcing a fresh
      // matrix update up the whole ancestor chain (no stale / polluted pivots).
      const center = new THREE.Vector3();
      const forward = new THREE.Vector3(0, 0, 1);
      // Panel's own "up the slope" axis - used to roll the camera so tangent
      // ceiling-vault frescoes are framed upright (not rotated 90 degrees).
      const panelUp = new THREE.Vector3(0, 1, 0);
      const group = scene.getObjectByName(`artwork-${artwork.id}`);
      const mesh = group?.children.find(
        (child): child is THREE.Mesh => (child as THREE.Mesh).isMesh,
      );
      const source = mesh ?? group;
      if (source) {
        source.updateWorldMatrix(true, true);
        source.getWorldPosition(center);
        const quaternion = new THREE.Quaternion();
        source.getWorldQuaternion(quaternion);
        forward.applyQuaternion(quaternion);
        panelUp.applyQuaternion(quaternion);
      } else {
        center.set(...artwork.position);
        forward.applyEuler(new THREE.Euler(...artwork.rotation));
      }
      forward.normalize();
      panelUp.normalize();
      if (![center.x, center.y, center.z].every(Number.isFinite)) {
        center.set(...artwork.position);
      }

      // PURE ZERO ALIGNMENT: ceiling + altar live on the central axis -> lock X=0.
      const onAxis = artwork.zone === 'ceiling_center' || artwork.zone === 'altar_wall';
      if (onAxis) center.x = 0;

      // Camera roll: the ceiling-vault figures are tangent to the slope, so frame
      // them with the panel's own up axis (else the view is rolled 90 degrees and
      // the fresco lands sideways / off-centre). Other zones use the registry up.
      const targetUp =
        artwork.zone === 'ceiling_vault'
          ? panelUp.clone()
          : new THREE.Vector3(...(artwork.cameraUp ?? [0, 1, 0])).normalize();

      // FIXED, HARD-CLAMPED focus distance per zone (anti-overzoom; no dynamic
      // multipliers). The camera stops well back so the whole piece fits on screen.
      const distance =
        artwork.zone === 'altar_wall'
          ? 12 // the massive altar wall
          : artwork.zone === 'ceiling_center' || artwork.zone === 'ceiling_vault'
            ? 9.5 // ceiling panels / vault figures: stay below, look up, un-cropped
            : 8; // side-wall frescoes (width 6) - back up so neighbours trail off the sides

      baseDistanceRef.current = distance;
      staticCenterRef.current.copy(center);
      forwardNormalRef.current.copy(forward);

      // Un-offset look target = the exact centre; camera sits straight back along
      // the forward normal. On-axis zones lock both X to exactly 0.
      const lookAtTarget = center.clone();
      const focusPos = center.clone().add(forward.clone().multiplyScalar(distance));
      if (onAxis) {
        lookAtTarget.x = 0;
        focusPos.x = 0;
      }
      // Ceiling-vault figures near the springline (e.g. the lunettes at y~9) would
      // otherwise pull the camera below the floor. Keep the eye above floor level
      // while still looking up at the panel (lookAt target is unchanged).
      if (artwork.zone === 'ceiling_vault') {
        focusPos.y = Math.max(focusPos.y, 2);
      }

      // Smooth flight from the *live* (possibly zoomed/panned) coordinates to the
      // fresh canonical framing - gsap.to() reads the current live values as the
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
        { x: lookAtTarget.x, y: lookAtTarget.y, z: lookAtTarget.z, duration: TRANSITION_DURATION, ease: TRANSITION_EASE },
        0,
      );
      tl.to(
        camera,
        { fov: BASE_FOV, duration: TRANSITION_DURATION, ease: TRANSITION_EASE },
        0,
      );
      // Smoothly reorient the camera roll toward the chosen up vector so the
      // transition into (or out of) the ceiling view never snaps or flips.
      tl.to(
        camera.up,
        {
          x: targetUp.x,
          y: targetUp.y,
          z: targetUp.z,
          duration: TRANSITION_DURATION,
          ease: TRANSITION_EASE,
          onUpdate: () => camera.up.normalize(),
        },
        0,
      );

      timelineRef.current = tl;
    }

    if (state.mode === 'returning') {
      // Controls stay locked during the return tween (CLAUDE.md section 3).
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
      // Restore the canonical world up so the home pose is never left rolled
      // after inspecting a ceiling fresco.
      tl.to(
        camera.up,
        {
          x: 0,
          y: 1,
          z: 0,
          duration: TRANSITION_DURATION,
          ease: TRANSITION_EASE,
          onUpdate: () => camera.up.normalize(),
        },
        0,
      );

      timelineRef.current = tl;
    }

    return () => {
      timelineRef.current?.kill();
    };
  }, [state.mode, state.activeArtworkId, camera, scene, controls, dispatch]);

  // Zoom latch - driven STRICTLY by explicit wheel input, NOT the continuous
  // `change` event (which panning fires and would leak). Panning therefore has
  // no mathematical pathway to flip this latch. Listener sits on the canvas in
  // bubble phase so OrbitControls dollies the camera first; we then read the
  // settled position.
  useEffect(() => {
    if (state.mode !== 'focused' || !controls) return;
    const canvas = gl.domElement;

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        // Forward notch = zoom in -> lock immediately. KILL single-finger left-drag
        // (Mac style): with LEFT = NONE there's zero gesture collision, so the user
        // explores the painting corners with the native two-finger trackpad glide
        // (which OrbitControls maps to PAN). Pan stays enabled & screen-space.
        if (!hasZoomedInRef.current) {
          hasZoomedInRef.current = true;
          controls.enablePan = true;
          controls.screenSpacePanning = true;
          controls.mouseButtons.LEFT = MOUSE_NONE;
          controls.touches.ONE = THREE.TOUCH.PAN;
          dispatch({ type: 'SET_INSPECTING', payload: true });
        }
      } else if (event.deltaY > 0 && hasZoomedInRef.current) {
        // Backward notch = zoom out -> unlock ONLY once the camera's perpendicular
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

  // Keyboard navigation - live ONLY during the static `focused` phase, unlocked.
  useEffect(() => {
    if (state.mode !== 'focused' || state.transitionLock) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      // Hard guard: ignore all keys while a transition is mid-flight.
      if (transitionLockRef.current) return;
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          dispatch({ type: 'NAV_DIRECTION', payload: 'right' });
          break;
        case 'ArrowLeft':
          event.preventDefault();
          dispatch({ type: 'NAV_DIRECTION', payload: 'left' });
          break;
        case 'ArrowUp':
          event.preventDefault();
          dispatch({ type: 'NAV_DIRECTION', payload: 'up' });
          break;
        case 'ArrowDown':
          event.preventDefault();
          dispatch({ type: 'NAV_DIRECTION', payload: 'down' });
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

  // Pointer gestures - live ONLY while focused & unlocked. The gate reads the
  // wheel-driven `hasZoomedInRef` boolean ONLY (no distance math here):
  //  - latched (zoomed in): kill left-drag (LEFT = NONE) so it can't collide with
  //    the native two-finger trackpad pan, and never navigate;
  //  - not latched (base framing): reserve the drag for a horizontal swipe -> NAV.
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
      // A second finger is a pan/zoom gesture - leave it entirely to OrbitControls.
      if (activeCount > 1) {
        activePointer = null;
        return;
      }
      activePointer = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startTime = event.timeStamp;

      // Route this drag off the latched boolean only - no float math here.
      // Zoomed in (Mac style): LEFT = NONE so single-finger left-drag does nothing
      // and can never collide with panning; the user glides with two fingers.
      // Base framing: LEFT stays ROTATE so the drag is free to become a swipe -> NAV.
      const zoomed = hasZoomedInRef.current;
      controls.mouseButtons.LEFT = zoomed ? MOUSE_NONE : THREE.MOUSE.ROTATE;
      controls.touches.ONE = zoomed ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    };

    const onPointerUp = (event: PointerEvent) => {
      activeCount = Math.max(0, activeCount - 1);
      if (event.pointerId !== activePointer) return;
      activePointer = null;

      // Iron-clad gate: while zoomed in OR mid-transition, navigation is offline
      // so a flick can never queue a broken camera tween.
      if (hasZoomedInRef.current || transitionLockRef.current) return;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const dt = event.timeStamp - startTime;
      // A quick, mostly-horizontal flick of sufficient length navigates.
      if (dt > SWIPE_MAX_DURATION) return;
      if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return;
      if (Math.abs(dy) > Math.abs(dx) * SWIPE_MAX_OFF_AXIS) return;

      dispatch({ type: 'NAV_DIRECTION', payload: dx < 0 ? 'right' : 'left' });
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
