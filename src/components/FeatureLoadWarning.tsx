import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface FeatureLoadWarningProps {
  title: string;
  description: string;
  className?: string;
}

export function FeatureLoadWarning({ title, description, className }: FeatureLoadWarningProps) {
  return (
    <Alert
      variant="destructive"
      className={cn(
        'border-destructive/30 bg-destructive/8 text-foreground [&>svg]:text-destructive',
        className,
      )}
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
