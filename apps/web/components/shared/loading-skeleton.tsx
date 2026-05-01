// components/shared/loading-skeleton.tsx
'use client';

function ShimmerBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded ${className}`}
      style={{
        background: 'linear-gradient(90deg, #1A2235 0%, #1E3A5F 50%, #1A2235 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.6s infinite',
      }}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded p-4 space-y-3"
            style={{ backgroundColor: '#111827', border: '1px solid #1E2D45' }}
          >
            <ShimmerBlock className="h-3 w-24" />
            <ShimmerBlock className="h-7 w-16" />
            <ShimmerBlock className="h-2 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div
          className="col-span-2 rounded p-4"
          style={{ backgroundColor: '#111827', border: '1px solid #1E2D45', height: 200 }}
        >
          <ShimmerBlock className="h-3 w-32 mb-4" />
          <ShimmerBlock className="h-40 w-full" />
        </div>
        <div
          className="rounded p-4"
          style={{ backgroundColor: '#111827', border: '1px solid #1E2D45', height: 200 }}
        >
          <ShimmerBlock className="h-3 w-24 mb-4" />
          <ShimmerBlock className="h-40 w-full" />
        </div>
      </div>
      <div
        className="rounded p-4 space-y-3"
        style={{ backgroundColor: '#111827', border: '1px solid #1E2D45' }}
      >
        <ShimmerBlock className="h-3 w-28 mb-2" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <ShimmerBlock className="h-8 w-8 flex-shrink-0" />
            <ShimmerBlock className="h-3 flex-1" />
            <ShimmerBlock className="h-3 w-20" />
            <ShimmerBlock className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded p-3"
          style={{ backgroundColor: '#111827', border: '1px solid #1E2D45' }}
        >
          <ShimmerBlock className="h-8 w-8 flex-shrink-0" />
          <ShimmerBlock className="h-3 flex-1" />
          <ShimmerBlock className="h-3 w-24" />
          <ShimmerBlock className="h-5 w-16" />
          <ShimmerBlock className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid gap-4 grid-cols-${count}`}>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="rounded p-4 space-y-3"
          style={{ backgroundColor: '#111827', border: '1px solid #1E2D45', minHeight: 120 }}
        >
          <ShimmerBlock className="h-3 w-2/3" />
          <ShimmerBlock className="h-6 w-1/2" />
          <ShimmerBlock className="h-2 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-12 w-12 mb-4 rounded" style={{ backgroundColor: '#1E2D45' }} />
      <h3 className="text-sm font-semibold mb-1" style={{ color: '#F0F4FF' }}>{title}</h3>
      <p className="text-xs" style={{ color: '#8899BB' }}>{description}</p>
    </div>
  );
}

