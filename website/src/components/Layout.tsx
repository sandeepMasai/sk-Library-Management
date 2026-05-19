import { Outlet } from 'react-router-dom';
import { Seo } from '../seo/Seo';
import { Header } from './Header';
import { Footer } from './Footer';

export function Layout() {
  return (
    <>
      <Seo />
      <div className="flex min-h-screen min-h-[100dvh] flex-col overflow-x-hidden">
        <Header />
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </>
  );
}
