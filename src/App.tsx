import { NavLink, Route, Routes } from 'react-router-dom';
import { signOutUser, useAuth } from './lib/auth';
import { AdminPage } from './pages/AdminPage';
import { EditItemPage } from './pages/EditItemPage';
import { CatalogPage } from './pages/CatalogPage';
import { LoginPage } from './pages/LoginPage';
import { SubmitPage } from './pages/SubmitPage';
import { VaultPage } from './pages/VaultPage';

export function App() {
  const { user, admin } = useAuth();
  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="The Loot Box Vault home">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span>The Loot Box Vault</span>
        </NavLink>
        <nav aria-label="Main">
          <NavLink to="/" end>
            Catalog
          </NavLink>
          <NavLink to="/vault">My Vault</NavLink>
          <NavLink to="/submit">Submit</NavLink>
          {admin && <NavLink to="/admin">Admin</NavLink>}
          {user ? (
            <button className="link-btn" onClick={signOutUser}>
              Sign out
            </button>
          ) : (
            <NavLink to="/login">Sign in</NavLink>
          )}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/vault" element={<VaultPage />} />
          <Route path="/vault/:uid" element={<VaultPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/item/:id" element={<EditItemPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<p className="empty">404: this floor collapsed.</p>} />
        </Routes>
      </main>
      <footer className="footer">
        Unofficial fan project. Not affiliated with Dungeon Crawler Carl, its author or publishers. All trademarks belong to their owners.
      </footer>
    </div>
  );
}
