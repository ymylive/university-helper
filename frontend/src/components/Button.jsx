import { clsx } from 'clsx'

export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  className,
  ...props
}) {
  const variants = {
    primary: 'clay-button-primary',
    secondary: 'clay-button-secondary',
    cta: 'clay-button-cta'
  }

  return (
    <button
      type={type}
      className={clsx(variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  )
}
