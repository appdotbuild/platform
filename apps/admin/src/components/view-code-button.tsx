import { Button } from '@appdotbuild/design/shadcn/button';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { getAppReadUrl } from '../lib/api/apps';

interface ViewCodeButtonProps {
  appId: string;
}

export default function ViewCodeButton({ appId }: ViewCodeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleViewCode = async () => {
    setIsLoading(true);
    try {
      const { readUrl } = await getAppReadUrl(appId);
      window.open(readUrl, '_blank');
    } catch (error) {
      console.error('Failed to get read URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleViewCode} disabled={isLoading}>
      <Download className="h-4 w-4 mr-2" />
      {isLoading ? 'Loading...' : 'Download'}
    </Button>
  );
}
