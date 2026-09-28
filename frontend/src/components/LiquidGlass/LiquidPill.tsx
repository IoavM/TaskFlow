import React from 'react';
import LiquidGlass from 'liquid-glass-react';

interface LiquidPillProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  cornerRadius?: number;
  displacementScale?: number;
  blurAmount?: number;
  elasticity?: number;
}

export const LiquidPill: React.FC<LiquidPillProps> = ({
  children,
  onClick,
  className = '',
  cornerRadius = 14,
  displacementScale = 12,
  blurAmount = 8,
  elasticity = 0.25,
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <LiquidGlass
        cornerRadius={cornerRadius}
        displacementScale={displacementScale}
        blurAmount={blurAmount}
        elasticity={elasticity}
        saturation={1.8}
        aberrationIntensity={0.6}
        mode="prominent"
        onClick={onClick}
        padding="0px"
        style={{
          position: 'relative',
          top: '0',
          left: '0',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        {children}
      </LiquidGlass>
    </div>
  );
};
