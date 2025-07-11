import { Alert } from '~/components/shared/alert';

interface NotificationMessageProps {
  message: string;
  type?: 'success' | 'info' | 'error' | 'warning';
}

export function NotificationMessage({
  message,
  type = 'info',
}: NotificationMessageProps) {
  return (
    <Alert variant={type} className="mb-2">
      {message}
    </Alert>
  );
}
