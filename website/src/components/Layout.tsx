import { Outlet } from 'react-router-dom';
import { Seo } from '../seo/Seo';
import { Footer } from './Footer';
import { Header } from './Header';

export function Layout() {
  return (
    <>
      <Seo />
      <div className="flex min-h-screen min-h-[100dvh] flex-col overflow-x-hidden bg-[#0b1220]">
        <Header />
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </>
  );
}
