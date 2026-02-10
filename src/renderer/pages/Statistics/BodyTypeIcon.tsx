/** Renders a small icon for a body type (star, ELW, water world, etc.). */
interface BodyTypeIconProps {
  type: string;
}

export function BodyTypeIcon({ type }: BodyTypeIconProps) {
  const lowerType = type.toLowerCase();

  if (
    lowerType.includes('star') ||
    lowerType.includes('dwarf') ||
    lowerType.includes('neutron') ||
    lowerType.includes('black hole') ||
    lowerType.includes('wolf-rayet') ||
    lowerType.includes('carbon') ||
    lowerType.includes('white dwarf') ||
    lowerType.match(/class [obafgkm]/i)
  ) {
    return (
      <div className="w-5 h-5 rounded-full bg-yellow-400 dark:bg-yellow-500 flex-shrink-0" />
    );
  }

  if (lowerType.includes('earth') || lowerType.includes('earthlike')) {
    return (
      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-green-500 flex-shrink-0" />
    );
  }

  if (lowerType.includes('water')) {
    return (
      <div className="w-5 h-5 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0" />
    );
  }

  if (lowerType.includes('ammonia')) {
    return (
      <div className="w-5 h-5 rounded-full bg-amber-600 dark:bg-amber-500 flex-shrink-0" />
    );
  }

  if (lowerType.includes('gas giant')) {
    return (
      <div className="w-5 h-5 rounded-full bg-orange-400 dark:bg-orange-500 flex-shrink-0" />
    );
  }

  if (lowerType.includes('metal')) {
    return (
      <div className="w-5 h-5 rounded-full bg-slate-400 dark:bg-slate-500 flex-shrink-0" />
    );
  }

  if (lowerType.includes('rocky')) {
    return (
      <div className="w-5 h-5 rounded-full bg-stone-500 dark:bg-stone-400 flex-shrink-0" />
    );
  }

  if (lowerType.includes('icy') || lowerType.includes('ice')) {
    return (
      <div className="w-5 h-5 rounded-full bg-cyan-200 dark:bg-cyan-300 flex-shrink-0" />
    );
  }

  return (
    <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
  );
}
