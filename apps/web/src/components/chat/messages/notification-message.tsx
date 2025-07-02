interface NotificationMessageProps {
  message: string;
  type?: 'success' | 'info' | 'error' | 'warning';
}

export function NotificationMessage(props: NotificationMessageProps) {
  const styles = {
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-700',
      icon: 'text-green-500',
      symbol: '✓',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-black',
      icon: 'text-blue-500',
      symbol: 'ℹ',
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-700',
      icon: 'text-red-500',
      symbol: '✕',
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-700',
      icon: 'text-yellow-500',
      symbol: '⚠',
    },
  };

  const style = styles[props.type || 'info'];

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border ${style.bg} mb-2`}
    >
      <span className={`text-lg ${style.icon}`}>{style.symbol}</span>
      <p className={`text-sm ${style.text}`}>{props.message}</p>
    </div>
  );
}
