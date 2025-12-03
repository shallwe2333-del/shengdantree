export enum TreeState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE'
}

export interface DualPosition {
  scatter: [number, number, number];
  tree: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}