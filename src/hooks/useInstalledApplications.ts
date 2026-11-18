import { useState, useCallback, useRef } from 'react';
import type { InstalledApplication } from '../appSettings';

export interface UseInstalledApplicationsResult {
  installedApplications: InstalledApplication[];
  installedApplicationsLoading: boolean;
  installedApplicationsError: string;
  loadInstalledApplications: () => Promise<void>;
  setInstalledApplications: React.Dispatch<React.SetStateAction<InstalledApplication[]>>;
  setInstalledApplicationsError: React.Dispatch<React.SetStateAction<string>>;
}

export function useInstalledApplications(): UseInstalledApplicationsResult {
  const [installedApplications, setInstalledApplications] = useState<InstalledApplication[]>([]);
  const [installedApplicationsLoading, setInstalledApplicationsLoading] = useState(false);
  const [installedApplicationsError, setInstalledApplicationsError] = useState('');
  const requestRef = useRef(0);

  const loadInstalledApplications = useCallback(async () => {
    const requestId = ++requestRef.current;
    const getApplications = window.electronAPI?.getInstalledApplications;
    if (!getApplications) {
      setInstalledApplications([]);
      setInstalledApplicationsError('Installed app search is available in the Windows desktop app.');
      setInstalledApplicationsLoading(false);
      return;
    }
    if (window.electronAPI?.platform && window.electronAPI.platform !== 'win32') {
      setInstalledApplications([]);
      setInstalledApplicationsError('Installed app search is currently available on Windows.');
      setInstalledApplicationsLoading(false);
      return;
    }

    setInstalledApplicationsLoading(true);
    setInstalledApplicationsError('');
    try {
      const result = await getApplications();
      if (requestId !== requestRef.current) return;
      if (!result?.ok || !Array.isArray(result.apps)) {
        setInstalledApplications([]);
        setInstalledApplicationsError(result?.error || 'Could not load installed applications.');
        return;
      }
      setInstalledApplications(result.apps.filter((application) =>
        typeof application?.name === 'string' && application.name.trim() &&
        typeof application.shortcutPath === 'string' && application.shortcutPath.trim()
      ));
    } catch (error) {
      if (requestId !== requestRef.current) return;
      setInstalledApplications([]);
      setInstalledApplicationsError(
        error instanceof Error ? error.message : 'Could not load installed applications.'
      );
    } finally {
      if (requestId === requestRef.current) {
        setInstalledApplicationsLoading(false);
      }
    }
  }, []);

  return {
    installedApplications,
    installedApplicationsLoading,
    installedApplicationsError,
    loadInstalledApplications,
    setInstalledApplications,
    setInstalledApplicationsError,
  };
}
