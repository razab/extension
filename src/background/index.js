// console.log('TESTEXT: background is running')

chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'COUNT') {
    // console.log('TESTEXT: background has received a message from popup, and count is ', request?.count)
  }
})
