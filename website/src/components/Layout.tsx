import { Outlet, useLocation } from 'react-router-dom';
import { Seo } from '../seo/Seo';
import { Footer } from './Footer';
import { Header } from './Header';

const AUTH_PATHS = new Set(['/login', '/register']);

export function Layout() {
  const { pathname } = useLocation();
  const isAuthPage = AUTH_PATHS.has(pathname);

  return (
    <>
      <Seo />
      <div className="flex min-h-screen min-h-[100dvh] flex-col overflow-x-hidden bg-[#0b1220]">
        <Header />
        <main className={`min-w-0 flex-1 ${isAuthPage ? 'auth-main' : ''}`}>
          <Outlet />
        </main>
        {isAuthPage ? null : <Footer />}
      </div>
    </>
  );
}
