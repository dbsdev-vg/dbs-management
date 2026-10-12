import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartSimple } from '@fortawesome/free-solid-svg-icons'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

const sizeClasses = {
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-5xl'
}

export function Logo({ size = 'md', showText = false }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <FontAwesomeIcon 
        icon={faChartSimple} 
        className={`text-primary ${sizeClasses[size]}`} 
      />
      {showText && (
        <span className="font-bold text-foreground text-xl">DBS Management</span>
      )}
    </div>
  )
}