import { create } from 'zustand';
import { TreeState } from './types';

interface AppState {
  treeState: TreeState;
  toggleState: () => void;
}

export const useStore = create<AppState>((set) => ({
  treeState: TreeState.SCATTERED,
  toggleState: () => set((state) => ({
    treeState: state.treeState === TreeState.TREE_SHAPE 
      ? TreeState.SCATTERED 
      : TreeState.TREE_SHAPE
  })),
}));