import './qmkViaBridge';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { hasSavedIconOutsideStartupCatalog, loadFullMacroIconLibrary } from './iconLibrary';
import { PROFILE_FILE_STORAGE_KEY } from './profileFiles';
import './index.css';

async function startApp() {
  let savedProfileState: string | null = null;
  try {
    savedProfileState = window.localStorage.getItem(PROFILE_FILE_STORAGE_KEY);
  } catch {
    // Continue with the default profile when browser storage is unavailable.
  }

  if (hasSavedIconOutsideStartupCatalog(savedProfileState)) {
    try {
      await loadFullMacroIconLibrary();
    } catch {
      // Keep the app available if the optional full icon library cannot load.
    }
  }

  createRoot(document.getElementById('root')!).render(<App />);
}

void startApp();
