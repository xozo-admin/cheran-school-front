export const SIDEBAR_COUNTS_REFRESH_EVENT = 'admin:sidebar-counts-refresh';

export const requestSidebarCountsRefresh = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(SIDEBAR_COUNTS_REFRESH_EVENT));
};
