import ceilingData from '../data/ceilingVault.panels.json';

/**
 * Append-only navigation adapter (see deep-research-report). It pipes the 33-panel
 * ceiling atlas into a navigation manager's existing waypoint + transition API
 * WITHOUT editing any side-wall navigation code. The cross-surface seams are pure
 * data: the manager keeps resolving "shortest next move" exactly as it already
 * does, so "cross-wall 90-degree navigation" extends to the ceiling by data, not
 * by an architectural change.
 *
 * NOTE: this codebase's live navigation is the reducer's resolveDirection, which
 * is a different shape from the generic manager interface below. This adapter is
 * therefore provided as the report-specified registration surface; a manager that
 * implements `NavigationManager` can adopt the ceiling atlas by calling this once.
 */

export type NavigationManager = {
  registerWaypoint: (
    id: string,
    data: {
      surface: 'ceiling';
      preferredNode: string;
      fovDeg: number;
      targetUv: { u: number; v: number };
    },
  ) => void;
  registerTransition: (from: string, to: string, kind: 'snap' | 'cross-surface') => void;
};

export function registerCeilingVault(nav: NavigationManager) {
  for (const panel of ceilingData.panels) {
    nav.registerWaypoint(panel.id, {
      surface: 'ceiling',
      preferredNode: panel.viewport.preferredNode,
      fovDeg: panel.viewport.fovDeg,
      targetUv: { u: panel.viewport.u, v: panel.viewport.v },
    });
  }

  // Side-wall / end-wall seam entry points - additive cross-surface links only.
  // Each top edge bridges to its closest ceiling band entry point.
  nav.registerTransition('northWall.topEdge.entry', 'VIG-02', 'cross-surface');
  nav.registerTransition('northWall.topEdge.mid', 'GEN-05', 'cross-surface');
  nav.registerTransition('northWall.topEdge.end', 'VIG-06', 'cross-surface');

  nav.registerTransition('southWall.topEdge.entry', 'VIG-12', 'cross-surface');
  nav.registerTransition('southWall.topEdge.mid', 'GEN-05', 'cross-surface');
  nav.registerTransition('southWall.topEdge.end', 'VIG-08', 'cross-surface');

  nav.registerTransition('entranceWall.topEdge.center', 'VIG-01', 'cross-surface');
  nav.registerTransition('altarWall.topEdge.center', 'VIG-07', 'cross-surface');
}
