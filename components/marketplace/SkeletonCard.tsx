export function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="h-40 w-full rounded-2xl bg-gradient-to-r 
        from-gray-800 via-gray-700 to-gray-800 
        animate-shimmer bg-[length:1000px_100%]" />

      <div className="h-4 bg-gray-700 rounded mt-3 w-3/4" />
      <div className="h-3 bg-gray-700 rounded mt-2 w-1/2" />
    </div>
  );
}
