export default function Loading({ fullScreen = false, message = 'Loading...' }) {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-teal-200" />
        <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-teal-600 border-t-transparent animate-spin" />
      </div>
      {message && <p className="text-sm text-gray-500 font-medium">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {spinner}
    </div>
  );
}

export function InlineSpinner({ size = 'sm', color = 'teal' }) {
  const sizeClass  = size === 'sm' ? 'w-4 h-4 border-2' : 'w-6 h-6 border-2';
  const colorClass = `border-${color}-600 border-t-transparent`;
  return (
    <div className={`${sizeClass} rounded-full ${colorClass} animate-spin inline-block`} />
  );
}
