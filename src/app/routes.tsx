import type { RouteObject } from 'react-router-dom';
import { EventPage } from '@/pages/EventPage';
import { GlossaryPage } from '@/pages/GlossaryPage';
import { HomePage } from '@/pages/HomePage';
import { LessonPage } from '@/pages/LessonPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PortfolioPage } from '@/pages/PortfolioPage';
import { ScamShieldPage } from '@/pages/ScamShieldPage';
import { ToolPage } from '@/pages/ToolPage';
import { Layout } from './Layout';

/** Opt in to React Router v7 behaviour now, so upgrading later changes nothing. */
export const routerFuture = {
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true,
} as const;

/** Route table. Owners per docs/WORKFLOW.md §3 (each placeholder says who replaces it). */
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/lesson/:id', element: <LessonPage /> },
      { path: '/portfolio', element: <PortfolioPage /> },
      { path: '/event/:id', element: <EventPage /> },
      { path: '/tool/:id', element: <ToolPage /> },
      { path: '/scam-shield', element: <ScamShieldPage /> },
      { path: '/glossary', element: <GlossaryPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
