import { clsx } from 'clsx'

export default function Input({
  label,
  id,
  className,
  ...props
}) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium mb-2">
          {label}
        </label>
      )}
      <input
        id={id}
        className={clsx('clay-input', className)}
        {...props}
      />
    </div>
  )
}
