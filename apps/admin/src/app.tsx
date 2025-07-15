import { Admin } from '@/components/admin';
import { AppList } from '@/components/apps-list';
import { dataProvider } from '@/lib/api/data-provider';
import { Resource } from 'ra-core';

export function App() {
  return (
    <Admin dataProvider={dataProvider}>
      <Resource name="apps" list={AppList} />
    </Admin>
  );
}
