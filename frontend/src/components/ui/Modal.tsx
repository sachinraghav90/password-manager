import React from "react"
import { cn } from "../../lib/utils"
import { X } from "lucide-react"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: "sm" | "md" | "lg" | "xl"
}

export function Modal({ isOpen, onClose, title, description, children, footer, maxWidth = "md" }: ModalProps) {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-0 animate-fade-in">
      <div 
        className={cn(
          "bg-background w-full rounded-xl shadow-lg border overflow-hidden animate-slide-in-bottom sm:animate-fade-in flex flex-col",
          maxWidthClasses[maxWidth]
        )}
        role="dialog"
        aria-modal="true"
      >
        {(title || description) && (
          <div className="flex flex-col space-y-1.5 p-6 border-b">
            <div className="flex items-start justify-between">
              {title && <h2 className="text-lg font-semibold leading-none tracking-tight">{title}</h2>}
              <button 
                onClick={onClose}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        )}
        
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {children}
        </div>
        
        {footer && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 border-t bg-muted/20">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
