/** Renders a colored circle icon for a body based on bodyType and subType (star colors by spectral class, planet colors by planet class). */
interface BodyIconProps {
  bodyType: string;
  subType: string;
  className?: string;
}

// Star and planet color mappings by type for the circle icon
const STAR_COLORS: Record<string, string> = {
  'O': '#9bb0ff',
  'B': '#aabfff',
  'A': '#cad7ff',
  'F': '#f8f7ff',
  'G': '#fff4ea',
  'K': '#ffd2a1',
  'M': '#ffcc6f',
  'L': '#ff8b53',
  'T': '#ff5a3c',
  'Y': '#a52a2a',
  'Neutron': '#e0e0ff',
  'Black Hole': '#1a1a2e',
  'White Dwarf': '#f0f0ff',
};

const PLANET_COLORS: Record<string, string> = {
  'Earth-Like World': '#4a9f4a',
  'Water World': '#4a7fbf',
  'Ammonia World': '#8b7355',
  'High Metal Content World': '#8b8b8b',
  'Metal Rich Body': '#cd853f',
  'Rocky Body': '#a0826d',
  'Rocky ice body': '#b8c8d8',
  'Icy Body': '#e0f0ff',
  'Rocky Ice World': '#b8c8d8',
  'Class I Gas Giant': '#f4e3c1',
  'Class II Gas Giant': '#e6c88a',
  'Class III Gas Giant': '#5a7fa0',
  'Class IV Gas Giant': '#4a5a6a',
  'Class V Gas Giant': '#3a4a5a',
  'Helium Rich Gas Giant': '#f0e68c',
  'Helium Gas Giant': '#f5f5dc',
  'Water Giant': '#6495ed',
  'Gas Giant with Water-Based Life': '#228b22',
  'Gas Giant with Ammonia-Based Life': '#8b4513',
};

function BodyIcon({ bodyType, subType, className = '' }: BodyIconProps) {
  const getColor = (): string => {
    if (bodyType === 'Star') {
      // Try to match star type
      for (const [type, color] of Object.entries(STAR_COLORS)) {
        if (subType.includes(type)) return color;
      }
      return '#fff4ea'; // Default star color
    }
    
    // Planet/Moon
    return PLANET_COLORS[subType] || '#808080';
  };

  const color = getColor();

  // Star icon
  if (bodyType === 'Star') {
    return (
      <svg viewBox="0 0 32 32" className={`w-full h-full ${className}`}>
        {/* Glow effect */}
        <defs>
          <radialGradient id={`star-glow-${subType.replace(/\s/g, '')}`}>
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="70%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="14" fill={`url(#star-glow-${subType.replace(/\s/g, '')})`} />
        <circle cx="16" cy="16" r="10" fill={color} />
        {subType.includes('Neutron') && (
          <>
            <ellipse cx="16" cy="16" rx="14" ry="2" fill={color} opacity="0.6" />
            <ellipse cx="16" cy="16" rx="2" ry="14" fill={color} opacity="0.6" />
          </>
        )}
      </svg>
    );
  }

  // Belt icon
  if (bodyType === 'Belt') {
    return (
      <svg viewBox="0 0 32 32" className={`w-full h-full ${className}`}>
        <ellipse cx="16" cy="16" rx="14" ry="4" fill="none" stroke="#888" strokeWidth="2" strokeDasharray="3 2" />
      </svg>
    );
  }

  // Planet/Moon icon
  const hasRings = subType.toLowerCase().includes('gas giant') || subType.toLowerCase().includes('giant');
  const isTerraformable = subType.includes('Terraformable');

  return (
    <svg viewBox="0 0 32 32" className={`w-full h-full ${className}`}>
      {/* Planet body */}
      <circle cx="16" cy="16" r="10" fill={color} />
      
      {/* Simple shading */}
      <ellipse cx="12" cy="12" rx="6" ry="6" fill="white" opacity="0.15" />
      
      {/* Rings for gas giants */}
      {hasRings && (
        <ellipse 
          cx="16" cy="16" rx="15" ry="4" 
          fill="none" 
          stroke={color} 
          strokeWidth="1.5" 
          opacity="0.5"
          transform="rotate(-15 16 16)"
        />
      )}
      
      {/* Terraformable indicator */}
      {isTerraformable && (
        <circle cx="24" cy="8" r="4" fill="#06b6d4" stroke="white" strokeWidth="1" />
      )}
    </svg>
  );
}

export default BodyIcon;
