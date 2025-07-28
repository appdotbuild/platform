import { createElement, useCallback } from 'react';
import {
  useCreatePath,
  useGetResourceLabel,
  useHasDashboard,
  useResourceDefinitions,
  useTranslate,
  useStoreContext,
} from 'ra-core';
import { Link, useMatch, useNavigate } from 'react-router';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@appdotbuild/design';
import { List, House } from 'lucide-react';

export function AppSidebar() {
  const hasDashboard = useHasDashboard();
  const resources = useResourceDefinitions();
  const { openMobile, setOpenMobile } = useSidebar();
  const handleClick = () => {
    if (openMobile) {
      setOpenMobile(false);
    }
  };
  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link to="/">
                <img src="/app-icon.svg" alt="app.build" className="!size-5" />
                <span className="text-base font-semibold">app.build Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {hasDashboard ? (
                <DashboardMenuItem onClick={handleClick} />
              ) : null}
              {Object.keys(resources)
                .filter((name) => resources[name]?.hasList)
                .map((name) => (
                  <ResourceMenuItem
                    key={name}
                    name={name}
                    onClick={handleClick}
                  />
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}

export const DashboardMenuItem = ({ onClick }: { onClick?: () => void }) => {
  const translate = useTranslate();
  const label = translate('ra.page.dashboard', {
    _: 'Dashboard',
  });
  const match = useMatch({ path: '/', end: true });
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={!!match}>
        <Link to="/" onClick={onClick}>
          <House />
          {label}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export const ResourceMenuItem = ({
  name,
  onClick,
}: {
  name: string;
  onClick?: () => void;
}) => {
  const resources = useResourceDefinitions();
  const getResourceLabel = useGetResourceLabel();
  const createPath = useCreatePath();
  const navigate = useNavigate();
  // Try to get list context, but it may not be available in all contexts
  const storeContext = useStoreContext();

  const to = createPath({
    resource: name,
    type: 'list',
  });
  const match = useMatch({ path: to, end: false });

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      // Clear filters if we're in a list context
      if (storeContext?.reset) {
        console.log('clearing filters');
        storeContext.reset();
      }

      // Navigate after clearing filters
      navigate(to, { state: { _scrollToTop: true } });

      // Call the original onClick handler for mobile sidebar
      if (onClick) {
        onClick();
      }
    },
    [storeContext, navigate, to, onClick],
  );

  if (!resources || !resources[name]) return null;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={!!match}>
        <Link onClick={handleClick} to={to} state={{ _scrollToTop: true }}>
          {resources[name].icon ? (
            createElement(resources[name].icon)
          ) : (
            <List />
          )}
          {getResourceLabel(name, 2)}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};
