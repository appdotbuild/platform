import { Card, CardContent, CardHeader } from '~/components/shared/card';

interface ErrorMessageProps {
  message?: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <Card variant="error">
      <CardHeader icon="❌" title="Error occurred" variant="error" />
      <CardContent>
        <div className="text-sm text-red-700">
          {message || 'Something went wrong. Please try again later.'}
        </div>
      </CardContent>
    </Card>
  );
}
