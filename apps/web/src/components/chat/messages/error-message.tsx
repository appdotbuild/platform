import { Card, CardContent, CardHeader } from '~/components/shared/card';

export function ErrorMessage() {
  return (
    <Card variant="error">
      <CardHeader icon="❌" title="Error occurred" variant="error" />
      <CardContent>
        <div className="text-sm text-red-700">
          Something went wrong. Please try again later.
        </div>
      </CardContent>
    </Card>
  );
}
