
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const PopupDialog = ({
  open,
  onClose,
  title,
  titleIcon: TitleIcon,
  titleColor = "text-purple-400",
  children,
  actions = [],
  loading = false,
  maxWidth = "max-w-md"
}) => {
  return (
    <Dialog open={open} onOpenChange={(openState) => !openState && !loading && onClose()}>
      <DialogContent className={`bg-gray-900 border-purple-500/50 text-white ${maxWidth}`}>
        <DialogHeader>
          <DialogTitle className={`text-center text-xl flex items-center justify-center gap-3 ${titleColor}`}>
            {TitleIcon && <TitleIcon className="w-6 h-6" />}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {children}

          {/* Action Buttons */}
          {actions.length > 0 && (
            <div className="flex gap-3">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.onClick}
                  disabled={action.disabled || loading}
                  variant={action.variant || "default"}
                  className={`flex-1 ${action.className || ''}`}
                >
                  {action.loading ? (
                    <>
                      {action.loadingIcon && <action.loadingIcon className="w-4 h-4 mr-2 animate-spin" />}
                      {action.loadingText}
                    </>
                  ) : (
                    <>
                      {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                      {action.text}
                    </>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Reusable content section components
export const PopupSection = ({ 
  title, 
  titleIcon: TitleIcon, 
  titleColor = "text-purple-300", 
  bgColor = "bg-purple-500/10", 
  borderColor = "border-purple-500/50",
  children 
}) => (
  <div className={`${bgColor} border ${borderColor} rounded-lg p-4`}>
    {title && (
      <h4 className={`font-semibold ${titleColor} mb-3 flex items-center gap-2`}>
        {TitleIcon && <TitleIcon className="w-4 h-4" />}
        {title}
      </h4>
    )}
    {children}
  </div>
);

export const PopupPreview = ({ children }) => (
  <div className="text-center">
    {children}
  </div>
);

export const PopupGrid = ({ columns = 2, gap = "gap-3", children }) => (
  <div className={`grid grid-cols-${columns} ${gap}`}>
    {children}
  </div>
);

export const PopupPreviewItem = ({ image, title, subtitle, stats, className = "" }) => (
  <div className={`bg-gray-800/50 rounded-lg p-3 border border-gray-600 ${className}`}>
    {image && (
      <img 
        src={image} 
        alt={title}
        className="w-16 h-16 rounded-lg mx-auto mb-2 object-cover"
      />
    )}
    {title && <h4 className="text-sm font-semibold text-white truncate">{title}</h4>}
    {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    {stats && (
      <div className="grid grid-cols-2 gap-1 text-xs mt-2">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center gap-1">
            {stat.icon}
            <span>{stat.value}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

export const PopupCostBreakdown = ({ items, totalLabel = "Total", totalValue, totalColor = "text-green-300" }) => (
  <div className="space-y-2 text-sm">
    {items.map((item, index) => (
      <div key={index} className="flex justify-between">
        <span className="text-gray-400">{item.label}:</span>
        <span className={`font-bold ${item.color || 'text-purple-300'}`}>
          {item.value}
        </span>
      </div>
    ))}
    <div className="border-t border-gray-600 pt-2 flex justify-between font-semibold">
      <span className="text-white">{totalLabel}:</span>
      <span className={`font-bold ${totalColor}`}>
        {totalValue}
      </span>
    </div>
  </div>
);

export const PopupWarning = ({ message, type = "warning" }) => {
  const colors = {
    warning: "bg-red-500/10 border-red-500/50 text-red-300",
    info: "bg-blue-500/10 border-blue-500/50 text-blue-300",
    success: "bg-green-500/10 border-green-500/50 text-green-300"
  };

  return (
    <div className={`${colors[type]} border rounded-lg p-4`}>
      <p className="text-center font-semibold">
        {type === "warning" && "⚠️ "}{message}{type === "warning" && " ⚠️"}
      </p>
    </div>
  );
};

export default PopupDialog;
