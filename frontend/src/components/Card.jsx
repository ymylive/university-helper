import { clsx } from 'clsx'

export default function Card({ children, className, ...props }) {
  return (
    <div className={clsx('clay-card p-8', className)} {...props}>
      {children}
    </div>
  )
}
