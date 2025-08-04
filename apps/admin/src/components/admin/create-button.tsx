import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@appdotbuild/design';
import { useCreatePath, useResourceContext, Translate } from 'ra-core';

export const CreateButton = () => {
  const resource = useResourceContext();
  const createPath = useCreatePath();
  const link = createPath({
    resource,
    type: 'create',
  });
  return (
    <Link
      className={buttonVariants({ variant: 'outline' })}
      to={link}
      onClick={stopPropagation}
    >
      <Plus />
      <Translate i18nKey="ra.action.create">Create</Translate>
    </Link>
  );
};

// useful to prevent click bubbling in a datagrid with rowClick

const stopPropagation = (e: any) => e.stopPropagation();
