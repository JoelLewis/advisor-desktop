/* eslint-disable react-refresh/only-export-components -- route table module */
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { RootLayout } from './RootLayout'
import { RouteError } from './RouteError'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
