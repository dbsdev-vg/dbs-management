import { cn } from "@/lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, id, className = "", ...props }: InputProps) {
  // Generate a unique id if none provided and label is missing
  const generatedId =
    id ||
    (label
      ? label.toLowerCase().replace(/\s/g, "-")
      : `input-${Math.random().toString(36).substr(2, 9)}`)

  return (
    <div className="mb-4">
      {label && (
        <label
          htmlFor={generatedId}
          className="block text-foreground/80 mb-2 text-base font-medium"
        >
          {label}
        </label>
      )}
      <input
        id={generatedId}
        className={cn(
          "flex h-10 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors",
          "bg-muted text-foreground placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-destructive" : "border-input",
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
