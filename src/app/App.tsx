import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { routerFuture, routes } from './routes';

const router = createBrowserRouter(routes, { future: routerFuture });

export function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}
