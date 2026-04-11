import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, type RefObject } from 'react';

import { AppOptionsMenu } from '@/components/AppOptionsMenu';
import { AppChromeDrawer, AppChromeProvider, useAppChrome } from '@/components/AppChromeProvider';
import { useAppMastheadMotion } from '@/components/AppMastheadMotionProvider';
import { NavLink } from '@/components/NavLink';
import type { AppPageAnimationOwnerId } from '@/features/navigation/appRoutes';
import {
  APP_NAV_ITEMS,
  getAppMainClassName,
  getPageAnimationOwnerId,
  shouldAdvancePageAnimationToken,
} from '@/features/navigation/appRoutes';

function AppLayoutWorkspace({
  mainClassName,
  mastheadRef,
  onOpenFinanceData,
  pageAnimationOwnerId,
  pageAnimationToken,
}: {
  mainClassName: string;
  mastheadRef: RefObject<HTMLElement | null>;
  onOpenFinanceData: () => void;
  pageAnimationOwnerId: AppPageAnimationOwnerId | null;
  pageAnimationToken: number;
}) {
  const { activeMotionId } = useAppMastheadMotion();
  const { drawerState } = useAppChrome();
  const location = useLocation();

  return (
    <>
      <nav
        ref={mastheadRef}
        className="app-masthead"
        data-drawer-open={drawerState.isOpen ? 'true' : 'false'}
        data-app-masthead-motion={activeMotionId}
      >
        <div className="app-masthead-primary">
          <div className="app-masthead-inner">
            <div className="app-brand">
              <span className="app-brand-mark">
                <svg className="app-brand-glyph" viewBox="0 0 64 64" aria-hidden="true">
                  <path className="app-brand-glyph-y" d="M18 18 L32 34 L46 18 M32 34 V48" />
                  <path className="app-brand-glyph-base" d="M24 50 H40" />
                  <circle className="app-brand-glyph-dot" cx="32" cy="13.5" r="1.8" />
                </svg>
              </span>
              <span className="app-brand-name">Ycaro</span>
            </div>

            <div className="app-page-rail">
              <div className="app-page-tabs">
                {APP_NAV_ITEMS.map((page) => (
                  <NavLink
                    key={page.id}
                    to={page.to}
                    end={page.end}
                    className="app-page-tab"
                    activeClassName="is-active"
                  >
                    <span className="app-page-tab-label">{page.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="app-masthead-actions">
              <AppOptionsMenu onOpenFinanceData={onOpenFinanceData} />
            </div>
          </div>
        </div>

        <div className="app-masthead-secondary">
          <AppChromeDrawer
            pageAnimationOwnerId={pageAnimationOwnerId}
            pageAnimationToken={pageAnimationToken}
          />
        </div>
      </nav>

      <div key={location.pathname} className="animate-page-shift-in pt-4">
        <main className={mainClassName}>
          <Outlet />
        </main>
      </div>
    </>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const mastheadRef = useRef<HTMLElement | null>(null);
  const [pageAnimationToken, setPageAnimationToken] = useState(0);
  const previousPageAnimationOwnerIdRef = useRef<AppPageAnimationOwnerId | null>(getPageAnimationOwnerId(location.pathname));
  const mainClassName = getAppMainClassName(location.pathname);
  const pageAnimationOwnerId = getPageAnimationOwnerId(location.pathname);

  useEffect(() => {
    const masthead = mastheadRef.current;
    if (!masthead || typeof document === 'undefined') return;

    const rootStyle = document.documentElement.style;

    const updateMastheadOffset = () => {
      const nextHeight = Math.ceil(masthead.getBoundingClientRect().height);
      rootStyle.setProperty('--app-masthead-offset', `${nextHeight}px`);
    };

    updateMastheadOffset();

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => updateMastheadOffset())
      : null;

    resizeObserver?.observe(masthead);
    window.addEventListener('resize', updateMastheadOffset);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateMastheadOffset);
    };
  }, []);

  useEffect(() => {
    const previousOwnerId = previousPageAnimationOwnerIdRef.current;

    if (shouldAdvancePageAnimationToken(previousOwnerId, pageAnimationOwnerId)) {
      setPageAnimationToken((current) => current + 1);
    }

    previousPageAnimationOwnerIdRef.current = pageAnimationOwnerId;
  }, [pageAnimationOwnerId]);

  return (
    <div className="themed-app min-h-screen bg-background">
      <AppChromeProvider>
        <AppLayoutWorkspace
          mainClassName={mainClassName}
          mastheadRef={mastheadRef}
          onOpenFinanceData={() => navigate('/finance/donnees')}
          pageAnimationOwnerId={pageAnimationOwnerId}
          pageAnimationToken={pageAnimationToken}
        />
      </AppChromeProvider>
    </div>
  );
}
