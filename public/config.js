// ============================================================================
// Mediateka — Korea & Japonia 2026 · konfiguracja runtime
// ----------------------------------------------------------------------------
// Google OAuth NIE jest już wykonywany w przeglądarce użytkownika.
// Użytkownik loguje się wyłącznie nazwą + hasłem Mediateki.
// Backend (np. Google Cloud Run) posiada bezpieczne połączenie z Google Drive.
//
// Po wdrożeniu backendu wpisz jego URL poniżej, np.:
//   apiBaseUrl: 'https://mediateka-api-123456789.europe-west1.run.app'
// ============================================================================
window.MEDIATEKA_CONFIG = {
  apiBaseUrl: 'https://mediateka-api-782690034922.europe-west1.run.app',
  driveFolderName: 'Korea_Japonia_2026',
  demoMode: false,
  maxUploadBytes: 20 * 1024 * 1024 * 1024,
};
