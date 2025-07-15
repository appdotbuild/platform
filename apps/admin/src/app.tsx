import { Admin, ListGuesser } from '@/components/admin';
import { dataProvider } from '@/lib/api/data-provider';
import { Resource } from 'ra-core';

export function App() {
  return (
    <Admin dataProvider={dataProvider}>
      <Resource name="apps" list={ListGuesser} />
    </Admin>
  );
}
