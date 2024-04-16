// import {settings} from "../settings.js";

console.info('TESTEXT: contentScript is running');



(function(){

  const POPUP_VISIBILITY_DURATION = 3000,
    EXTENSION_NAME = 'Upwork Cleaner',
    CHECKED_JOB_COLOR = '#eee',
    NUMBER_OF_JOBS_IN_MEMORY = 3000,
    DEBOUNCE_INTERVAL = 700,
    STORAGE_PROP_NAME_FOR_CHECKED_JOBS = '_UpworkCleaner_checkedJobs',
    STORAGE_PROP_COUNTRIES = 'countries_filter',
    STORAGE_PROP_TITLES = 'titles_filter',
    // TITLE_SELECTOR = '.job-title-link',
    // CLIENT_LOCATION_SELECTOR = '.client-location';
    TITLE_SELECTOR = '.job-tile-title',
    CLIENT_LOCATION_SELECTOR = '[data-test=location]';

  let filters,
    layoutContainer,
    container,
    lastNotifiedCount = 0,
    previousLoadedSections = [];

  const filtersTypes = [STORAGE_PROP_COUNTRIES, STORAGE_PROP_TITLES];
  const filterFn = {
    [STORAGE_PROP_COUNTRIES]: (content) => {
      const currentFilters = filters[STORAGE_PROP_COUNTRIES];
      if (currentFilters && currentFilters.length) {
        return Boolean(filters[STORAGE_PROP_COUNTRIES].find(filter => {
          const RE = new RegExp(`^${filter}$`, 'i');
          return RE.test(content);
        }));
      }
      return false
    },
    [STORAGE_PROP_TITLES]: (content) => {
      const currentFilters = filters[STORAGE_PROP_TITLES];
      if (currentFilters && currentFilters.length) {
        return Boolean(filters[STORAGE_PROP_TITLES].find(filter => {
          const RE = new RegExp(`^${filter}$|^${filter}\\W|\\W${filter}\\W|\\W${filter}$`, 'i');
          return RE.test(content);
        }));
      }
      return false
    },
  };
  const styleEntryForRemoved = document.createElement('style');
  const styleEntryForColored = document.createElement('style');

  document.head.appendChild(styleEntryForRemoved);
  document.head.appendChild(styleEntryForColored);

  function getFilters(callback){
    chrome.storage.sync.get(filtersTypes, function(result){
      const data = filtersTypes.reduce((acc, item) => ({
        ...acc,
        [item]: result[item] || [],
      }), {});
      callback(data);
    });
  }

  function processFeedRaw(){
    // console.log('TESTEXT: processFeedRaw ...')
    if(!container){
      // console.log('TESTEXT: processFeedRaw ... no container -> RETURN')
      return;
    }
    const indices = [];
    const sections = Array.from(container.children);
    console.log('TESTEXT: processFeedRaw ... sections', sections)
    for(let i = 0; i < sections.length; i += 1){
      if(checkElement(sections[i])){
        indices.push(i);
      }
    }
    // console.log('TESTEXT: processFeedRaw ... indices', indices)
    // updateStyleEntry(indices, 'display: none !important;', styleEntryForRemoved);
    updateStyleEntry(indices, 'border: 1px solid red !important; opacity: .2 !important; background-color: pink !important', styleEntryForRemoved);
    notify(indices.length);
    highlightCheckedJobs( sections );
    saveCheckedJobsToStore( extractJobsFromElementsArray(sections) );
    previousLoadedSections = sections;
  }

  const processFeed = debounce(processFeedRaw, DEBOUNCE_INTERVAL);

  function debounce(func, interval) {
    let timer = null;
    let repeatOnEnd = false;
    let argsToRepeat = null;

    function frame() {
      if (repeatOnEnd) {
        repeatOnEnd = false;
        timer = setTimeout(frame, interval);
        func(...argsToRepeat);
        argsToRepeat = null;
      } else {
        timer = null;
      }
    }

    function debounced(...args) {
      if (!timer){
        timer = setTimeout(frame, interval);
        func(...args);
      } else {
        repeatOnEnd = true;
        argsToRepeat = args;
      }
    }

    return debounced;
  }

  function checkElement(element) {
    // console.log('TESTEXT: processFeedRaw ... checkElement()', element)

    if (element.tagName !== 'ARTICLE') return false;
    const locationEl = element.querySelector(CLIENT_LOCATION_SELECTOR);
    const titleEl = element.querySelector(TITLE_SELECTOR);
    const containsFilteredLocation =
      locationEl && filterFn[STORAGE_PROP_COUNTRIES](locationEl.textContent.trim());
    const containsFilteredTitle = titleEl && filterFn[STORAGE_PROP_TITLES](titleEl.textContent.trim());

    return Boolean(containsFilteredLocation || containsFilteredTitle);
  }

  function updateStyleEntry( indices, style, styleNode ) {
    function selector(index) {
      const i = index + 1;
      // return `#feed-jobs > *:nth-child(${i}), #feed-jobs-responsive > *:nth-child(${i}) `;
      return `section.card-list-container > *:nth-child(${i}) `;
    }
    const selectors = indices.map(selector);
    styleNode.innerHTML = `${selectors.join(',')} { ${style} }`;
  }

  function mutationObserverCallback(mutations) {
    if(!container){
      return;
    }

    let addedCount = 0;

    for(let mutation of mutations){
      const { addedNodes } = mutation;
      // const anySectionAdded = Array.from(addedNodes).find(node => node.tagName === 'SECTION');
      const anySectionAdded = Array.from(addedNodes).find(node => node.tagName === 'ARTICLE');
      if (anySectionAdded) addedCount += 1;
    }

    if (addedCount > 0) {
      processFeed();
    }
  }

  function layoutMutationObserverCallback(mutations) {
    if(!layoutContainer){
      return;
    }

    for(let mutation of mutations){
      const { removedNodes } = mutation;
      if (Array.from(removedNodes).length > 0) {
        const newContainer = document.getElementById('feed-jobs')
          || document.getElementById('feed-jobs-responsive');

        if (newContainer !== container) {
          container = container || newContainer;
          processFeed();
        }

      }
    }
  }

  function onExtensionMessage(request, sender, sendResponse){
    try {
      // console.log('TESTEXT: onExtensionMessage ...', request.action)
      switch (request.action) {
        case "cleanHistory":
          localStorage.removeItem(STORAGE_PROP_NAME_FOR_CHECKED_JOBS);
          cleanAppliedStyles();
          break;

        case "updateFilters":
          filters = request.filters;
          cleanAppliedStyles();
          processFeed();
          break;

        default:
          break;
      }
      sendResponse({ done: true });
    } catch (e) {
      sendResponse({ done: false, error: e.message });
    }
  }

  function cleanAppliedStyles(){
    styleEntryForColored.innerHTML = '';
    styleEntryForRemoved.innerHTML = '';
  }

  function init() {
    // debugger;
    // console.log('TESTEXT: contentScript init() ...')
    getFilters(results => filters = results);

    if (!layoutContainer) {
      layoutContainer = document.getElementById('__layout');

      // console.log('TESTEXT: contentScript init() ... !!layoutContainer ', !!layoutContainer)

      const observerLayout = new MutationObserver(layoutMutationObserverCallback);
      observerLayout.observe(layoutContainer, {childList: true, subtree: true});
    }

    container = container
      || document.querySelector('section.card-list-container')
      || document.getElementById('feed-jobs-responsive'); // ??

    // console.log('TESTEXT: contentScript init() ... container', container)
    // console.log('TESTEXT: contentScript init() ... filters', filters)

    if(filters && container) {
      processFeed();
      const observer = new MutationObserver(mutationObserverCallback);
      observer.observe(container, {childList: true, subtree: true});
      chrome.runtime.onMessage.addListener( onExtensionMessage );
    }
    else {
      setTimeout(init, 300);
    }
  }

  function applyCSS(elem, props){
    for(let prop in props){
      if(props.hasOwnProperty(prop)){
        elem.style[prop] = props[prop];
      }
    }
  }

  function notify(number){
    const text = 'Cleaned '+number+' posts in job feed totally';

    if (number === lastNotifiedCount) return;

    lastNotifiedCount = number;

    const message = document.createElement('div');
    message.innerHTML = text;
    applyCSS(message, {
      padding: '10px',
      fontSize: '20px'
    });

    const sign = document.createElement('div');
    sign.innerHTML = EXTENSION_NAME;
    applyCSS(sign, {
      textAlign: 'right',
      color: '#999',
      fontSize: '10px'
    });

    const popup = document.createElement('div');
    popup.appendChild(message);
    popup.appendChild(sign);
    popup.classList.add('UpworkCleanerPopup');
    applyCSS(popup, {
      position:'fixed',
      top: '30px',
      left: '30px',
      padding: '10px',
      backgroundColor: '#f5f5f5',
      boxShadow: '0 1px 6px rgba(57,73,76,.35)',
      zIndex: '100000000'
    });
    document.body.appendChild(popup);

    setTimeout(function(popup){ popup.remove(); }, POPUP_VISIBILITY_DURATION, popup);

    console.log('TESTEXT: '+ EXTENSION_NAME + ': ' + text);
  }

  function getCheckedJobsFromStore(){
    const stored = localStorage.getItem(STORAGE_PROP_NAME_FOR_CHECKED_JOBS);
    return stored ? JSON.parse(stored) : [];
  }

  function saveCheckedJobsToStore(jobs){
    const stored = getCheckedJobsFromStore(),
      toStore = stored.concat(jobs).slice(-NUMBER_OF_JOBS_IN_MEMORY);
    localStorage.setItem(STORAGE_PROP_NAME_FOR_CHECKED_JOBS, JSON.stringify(toStore));
  }

  function extractJobsFromElementsArray(elements){
    const result = [];
    let id;
    for(let element of elements){
      // if (element.tagName !== 'SECTION') continue;
      if (element.tagName !== 'ARTICLE') continue;
      id = extractIdFromSection(element);
      if(!id){
        console.warn('TESTEXT: ' + EXTENSION_NAME + ': not found link in ', element);
      } else {
        result.push( id );
      }
    }
    return result;
  }

  function extractIdFromSection(section){
    return section && section.dataset['evJobUid']
    // const link = section.querySelector('.job-title-link');
    // return link && link.href ? link.href.split('_~')[1].slice(0,-1) : null;
  }

  function highlightCheckedJobs(sections){
    const checkedJobs = getCheckedJobsFromStore();
    const indices = [];
    // console.warn('TESTEXT: highlightCheckedJobs()', sections );
    for(let i = 0; i < sections.length; i += 1){

      // if (sections[i].tagName !== 'SECTION') continue;
      if (sections[i].tagName !== 'ARTICLE') continue;
      let sectionId = extractIdFromSection(sections[i]);
      if( checkedJobs.includes(sectionId) ){
        indices.push(i);
      }
    }
    updateStyleEntry(indices, `background-color: ${CHECKED_JOB_COLOR} !important;`, styleEntryForColored);
  }

  init();
})();


