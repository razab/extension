export const settings = {
  popup: {
    visibilityDuration: 3000
  },
  extensionName: 'Upwork Cleaner',
  checkedJobColor: '#eee',
  maxJobsInMemory: 3000,
  debounceInterval: 700,
  storage: {
    checkedJobs: '_UpworkCleaner_checkedJobs',
    countries: 'countries_filter',
    titles: 'titles_filter'
  },
  selectors: {
    feed: {
      jobTitle: '.job-tile-title',
      clientLocation: '[data-test=location]'
    }
  }
  // POPUP_VISIBILITY_DURATION = 3000,
  // EXTENSION_NAME = 'Upwork Cleaner',
  // CHECKED_JOB_COLOR = '#eee',
  // NUMBER_OF_JOBS_IN_MEMORY = 3000,
  // DEBOUNCE_INTERVAL = 700,
  // STORAGE_PROP_NAME_FOR_CHECKED_JOBS = '_UpworkCleaner_checkedJobs',
  // STORAGE_PROP_COUNTRIES = 'countries_filter',
  // STORAGE_PROP_TITLES = 'titles_filter',
  // TITLE_SELECTOR = '.job-title-link',
  // CLIENT_LOCATION_SELECTOR = '.client-location';
  // TITLE_SELECTOR = '.job-tile-title',
  // CLIENT_LOCATION_SELECTOR = '[data-test=location]';
}
