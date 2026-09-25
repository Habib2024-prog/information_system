import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export const scoreValidationMessage = "نمره باید بین ۰ تا ۳ و حداکثر دارای دو رقم اعشار باشد.";

export function isValidCompetencyScore(value: string): boolean {
  return /^(?:[0-2](?:\.\d{1,2})?|3(?:\.0{1,2})?)$/.test(value.trim());
}

interface ScoreInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode"> {
  error?: boolean;
}

export function ScoreInput({ className, error = false, ...props }: ScoreInputProps) {
  return (
    <div>
      <input
        {...props}
        type="text"
        inputMode="decimal"
        dir="ltr"
        aria-invalid={error || undefined}
        className={cn("input text-left tabular-nums", error && "border-rose-400 focus:border-rose-500 focus:ring-rose-100", className)}
      />
      {error ? <p className="mt-1 text-xs text-rose-700">{scoreValidationMessage}</p> : null}
    </div>
  );
}
