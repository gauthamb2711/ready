import * as React from "react";
import { cn } from "@/lib/utils";

interface RadioGroupContextValue {
  name?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, name, value, defaultValue, onValueChange, disabled, children, ...props }, ref) => {
    const [innerValue, setInnerValue] = React.useState<string>(defaultValue || "");
    const currentValue = value !== undefined ? value : innerValue;

    const handleValueChange = React.useCallback(
      (newVal: string) => {
        if (value === undefined) {
          setInnerValue(newVal);
        }
        onValueChange?.(newVal);
      },
      [value, onValueChange]
    );

    return (
      <RadioGroupContext.Provider
        value={{
          name,
          value: currentValue,
          onValueChange: handleValueChange,
          disabled,
        }}
      >
        <div
          ref={ref}
          role="radiogroup"
          className={cn("grid gap-2", className)}
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  value: string;
}

export const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, id, disabled, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext);
    const checked = context?.value === value;
    const isDisabled = disabled || context?.disabled;

    return (
      <div className="relative flex items-center justify-center">
        <input
          ref={ref}
          type="radio"
          id={id}
          name={context?.name}
          value={value}
          checked={checked}
          disabled={isDisabled}
          onChange={() => context?.onValueChange?.(value)}
          className={cn(
            "peer h-4 w-4 shrink-0 appearance-none rounded-full border border-slate-700 bg-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 checked:border-indigo-500 checked:bg-indigo-600 transition-colors",
            className
          )}
          {...props}
        />
        <div className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity" />
      </div>
    );
  }
);
RadioGroupItem.displayName = "RadioGroupItem";
