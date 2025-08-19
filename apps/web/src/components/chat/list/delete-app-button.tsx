import { Trash } from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@appdotbuild/design';
import { useAppDelete } from '~/hooks/useApp';
import { toast } from 'sonner';

interface DeleteAppButtonProps {
  appId: string;
  appName?: string;
}

export function DeleteAppButton({ appId, appName }: DeleteAppButtonProps) {
  const { mutateAsync: deleteApp, isPending } = useAppDelete();
  const [modalOpen, setModalOpen] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalOpen(true);
  };

  const handleConfirmDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    deleteApp(appId)
      .then(() => {
        setModalOpen(false);
        toast.success('App deleted successfully');
      })
      .catch(() => {
        toast.error('Failed to delete app');
      });
  };

  const handleCancel = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setModalOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setModalOpen(open);
  };

  return (
    <>
      <Button
        onClick={handleDeleteClick}
        title="Delete app"
        variant="ghost"
        size="fit-icon"
        className="hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
      >
        <Trash />
      </Button>

      <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          onClick={(e) => {
            e.stopPropagation();
          }}
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>Delete App</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <b>{appName || 'this app'}</b>?
              Once deleted, the app will no longer be available and this action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isPending}
            >
              {isPending ? 'Deleting...' : 'Delete App'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
