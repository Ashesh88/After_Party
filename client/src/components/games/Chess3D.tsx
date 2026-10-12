'use client';

import React from 'react';
import Chess2D from './Chess2D';

interface Chess3DProps {
  onBack: () => void;
}

export default function Chess3D({ onBack }: Chess3DProps) {
  return <Chess2D onBack={onBack} />;
}
