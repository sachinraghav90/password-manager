import React, { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input, InputProps } from "./Input"
import { cn } from "../../lib/utils"

interface PasswordInputProps extends InputProps {
  showStrength?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showStrength, value, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    // Extremely basic strength calculation for visual purposes
    const getStrength = (val: string) => {
      if (!val) return 0;
      let score = 0;
      if (val.length > 8) score += 1;
      if (val.length > 12) score += 1;
      if (/[A-Z]/.test(val)) score += 1;
      if (/[0-9]/.test(val)) score += 1;
      if (/[^A-Za-z0-9]/.test(val)) score += 1;
      return Math.min(score, 4);
    }

    const strength = getStrength((value as string) || "");

    return (
      <div className="w-full relative">
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            className={cn("pr-10 font-mono", className)}
            value={value}
            ref={ref}
            {...props}
          />
          <button
            type="button"
            className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground focus:outline-none"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        
        {showStrength && value && (
          <div className="mt-2 flex gap-1 h-1 w-full rounded-full overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "h-full flex-1 transition-colors duration-300",
                  i < strength 
                    ? strength === 1 ? "bg-red-500" 
                    : strength === 2 ? "bg-yellow-500" 
                    : strength === 3 ? "bg-blue-500" 
                    : "bg-green-500"
                    : "bg-slate-200 dark:bg-slate-800"
                )} 
              />
            ))}
          </div>
        )}
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"
