import React from 'react';
import { useStore } from '../store';
import { TreeState } from '../types';

export const Overlay: React.FC = () => {
  const { treeState, toggleState } = useStore();
  const isTree = treeState === TreeState.TREE_SHAPE;

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-8 md:p-12 z-10">
      
      {/* Header */}
      <div className="flex flex-col items-center md:items-start text-center md:text-left">
        <h1 className="font-serif text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-b from-[#D4AF37] to-[#8a6e18] tracking-widest drop-shadow-sm font-bold">
          ARIX
        </h1>
        <h2 className="font-sans text-xs md:text-sm text-[#D4AF37] tracking-[0.3em] mt-2 uppercase opacity-80">
          Signature Collection
        </h2>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center w-full pointer-events-auto">
        <button
          onClick={toggleState}
          className={`
            group relative px-8 py-4 bg-transparent border border-[#D4AF37]/30 
            hover:border-[#D4AF37] transition-all duration-700 ease-out overflow-hidden
            backdrop-blur-sm rounded-sm
          `}
        >
          {/* Fill Effect */}
          <div className={`absolute inset-0 bg-[#D4AF37] transition-transform duration-500 ease-out origin-left ${isTree ? 'scale-x-100' : 'scale-x-0'}`} />
          
          <span className={`relative font-serif italic text-lg tracking-widest transition-colors duration-300 ${isTree ? 'text-[#020403]' : 'text-[#D4AF37]'}`}>
            {isTree ? 'Release Magic' : 'Assemble Form'}
          </span>
        </button>
        
        <p className="mt-4 font-sans text-[10px] text-[#D4AF37]/40 uppercase tracking-widest">
          Interactive Experience 2024
        </p>
      </div>

      {/* Footer/Decoration */}
      <div className="hidden md:flex justify-between items-end text-[#D4AF37]/20 font-serif text-xs">
         <span>No. 001/999</span>
         <span>Limited Edition</span>
      </div>
    </div>
  );
};