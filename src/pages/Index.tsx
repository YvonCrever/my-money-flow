import { useEffect, useRef, useState, type RefObject } from 'react';
import { AppOptionsMenu } from '@/components/AppOptionsMenu';
import { AppChromeDrawer, AppChromeProvider, useAppChrome } from '@/components/AppChromeProvider';
import { useAppMastheadMotion } from '@/components/AppMastheadMotionProvider';
import useFinanceData from '@/hooks/useFinanceData';
import HomePage from '@/pages/app/HomePage';
import CalendarPage from '@/pages/app/CalendarPage';
import FinancePage from '@/pages/app/FinancePage';
import LecturePage from '@/pages/app/LecturePage';
import JournalPage from '@/pages/app/JournalPage';

type AppPage = 'home' | 'calendar' | 'finance' | 'lecture' | 'journal';
type FinancePageTab = 'dashboard' | 'revenus' | 'depenses' | 'clients' | 'donnees';

const APP_PAGES: { id: AppPage; label: string }[] = [
  { id: 'home', label: 'Accueil' },
  { id: 'calendar', label: 'Calendrier' },
  { id: 'finance', label: 'Finances' },
  { id: 'lecture', label: 'Lecture' },
  { id: 'journal', label: 'Journal' },
];

function resolveInitialState() {
  if (typeof window === 'undefined') {
    return { initialPage: 'home' as AppPage, initialFinanceTab: 'dashboard' as FinancePageTab };
  }

  const params = new URLSearchParams(window.location.search);
  const requestedPage = params.get('page');
  const requestedFinanceTab = params.get('financeTab');
  const availablePages = new Set<AppPage>(APP_PAGES.map((page) => page.id));
  const availableFinanceTabs = new Set<FinancePageTab>(['dashboard', 'revenus', 'depenses', 'clients', 'donnees']);

  return {
    initialPage: requestedPage && availablePages.has(requestedPage as AppPage)
      ? requestedPage as AppPage
      : 'home',
    initialFinanceTab: requestedFinanceTab && availableFinanceTabs.has(requestedFinanceTab as FinancePageTab)
      ? requestedFinanceTab as FinancePageTab
      : 'dashboard',
  };
}

function IndexWorkspace({
  activePage,
  financeData,
  financeTab,
  mainClassName,
  mastheadRef,
  onOpenFinanceData,
  onPageTabClick,
  setFinanceTab,
  pageAnimationOwnerId,
  pageAnimationToken,
}: {
  activePage: AppPage;
  financeData: ReturnType<typeof useFinanceData>;
  financeTab: FinancePageTab;
  mainClassName: string;
  mastheadRef: RefObject<HTMLElement | null>;
  onOpenFinanceData: () => void;
  onPageTabClick: (page: AppPage) => void;
  setFinanceTab: (tab: FinancePageTab) => void;
  pageAnimationOwnerId: 'finance' | 'lecture' | 'journal' | null;
  pageAnimationToken: number;
}) {
  const { activeMotionId } = useAppMastheadMotion();
  const { drawerState } = useAppChrome();

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
                {APP_PAGES.map((page) => {
                  const isActive = activePage === page.id;
                  return (
                    <button
                      key={page.id}
                      type="button"
                      className={`app-page-tab ${isActive ? 'is-active' : ''}`}
                      onClick={() => onPageTabClick(page.id)}
                    >
                      <span className="app-page-tab-label">{page.label}</span>
                    </button>
                  );
                })}
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

      <div key={activePage} className="animate-page-shift-in pt-4">
        <main className={mainClassName}>
          {activePage === 'home' ? (
            <HomePage
              monthlySummary={financeData.monthlySummary}
              selectedYear={financeData.selectedYear}
              totalRevenue={financeData.totalRevenue}
            />
          ) : null}

          {activePage === 'calendar' ? (
            <CalendarPage />
          ) : null}

          {activePage === 'finance' ? (
            <FinancePage
              data={financeData}
              activeTab={financeTab}
              onTabChange={setFinanceTab}
            />
          ) : null}

          {activePage === 'lecture' ? (
            <LecturePage />
          ) : null}

          {activePage === 'journal' ? (
            <JournalPage />
          ) : null}
        </main>
      </div>
    </>
  );
}

const Index = () => {
  const [{ initialPage, initialFinanceTab }] = useState(resolveInitialState);
  const [activePage, setActivePage] = useState<AppPage>(initialPage);
  const [financeTab, setFinanceTab] = useState<FinancePageTab>(initialFinanceTab);
  const [pageAnimationToken, setPageAnimationToken] = useState(0);
  const financeData = useFinanceData();
  const mastheadRef = useRef<HTMLElement | null>(null);
  const previousPageRef = useRef<AppPage>(initialPage);
  const isCalendarPage = activePage === 'calendar';
  const mainClassName = isCalendarPage ? 'app-main app-main--calendar' : 'app-main app-main--standard';
  const pageAnimationOwnerId = activePage === 'finance' || activePage === 'lecture' || activePage === 'journal'
    ? activePage
    : null;

  const handlePageTabClick = (page: AppPage) => {
    if (page === activePage) return;
    setActivePage(page);
  };

  const handleFinanceTabChange = (tab: FinancePageTab) => {
    if (tab === financeTab) return;
    setFinanceTab(tab);
    if (activePage === 'finance') {
      setPageAnimationToken((current) => current + 1);
    }
  };

  const handleOpenFinanceData = () => {
    if (activePage === 'finance' && financeTab !== 'donnees') {
      setPageAnimationToken((current) => current + 1);
    }

    setFinanceTab('donnees');
    setActivePage('finance');
  };

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
    if (previousPageRef.current === activePage) return;
    previousPageRef.current = activePage;

    if (activePage === 'finance' || activePage === 'lecture' || activePage === 'journal') {
      setPageAnimationToken((current) => current + 1);
    }
  }, [activePage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    params.set('page', activePage);
    params.set('financeTab', financeTab);

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [activePage, financeTab]);

  return (
    <div className="themed-app min-h-screen bg-background">
      <AppChromeProvider>
        <IndexWorkspace
          activePage={activePage}
          financeData={financeData}
          financeTab={financeTab}
          mainClassName={mainClassName}
          mastheadRef={mastheadRef}
          onOpenFinanceData={handleOpenFinanceData}
          onPageTabClick={handlePageTabClick}
          setFinanceTab={handleFinanceTabChange}
          pageAnimationOwnerId={pageAnimationOwnerId}
          pageAnimationToken={pageAnimationToken}
        />
      </AppChromeProvider>
    </div>
  );
};

export default Index;
