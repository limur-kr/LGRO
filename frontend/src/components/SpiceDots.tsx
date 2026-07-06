interface SpiceDotsProps {
  level: number
  size?: string
}

export function SpiceDots({ level, size = "w-3 h-3" }: SpiceDotsProps) {
  const current = Math.max(0, Math.min(5, Number(level || 0)))
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={`${size} border border-on-background ${index < current ? "bg-primary" : "bg-surface-variant"}`}
        />
      ))}
    </div>
  )
}
