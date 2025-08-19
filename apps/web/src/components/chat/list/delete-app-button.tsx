import { AlertTriangle, Trash } from 'lucide-react';
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
  appName: string;
  techStack: string;
  createdDate: string;
}

export function DeleteAppButton({
  appId,
  appName,
  techStack,
  createdDate,
}: DeleteAppButtonProps) {
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
        toast.success('App deleted successfully');
      })
      .catch(() => {
        toast.error('Failed to delete app');
      })
      .finally(() => {
        setModalOpen(false);
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
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-6">
                    Delete App
                  </DialogTitle>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 pb-6">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <div className="w-4 h-4 bg-blue-600 dark:bg-blue-400 rounded-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {appName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Created {createdDate} • {techStack}
                    </p>
                  </div>
                </div>
              </div>

              <DialogDescription className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Are you sure you want to delete{' '}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {appName}
                </span>
                ? This will permanently remove the app and all its data from
                your account.
              </DialogDescription>
            </div>
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
