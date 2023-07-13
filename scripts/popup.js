var enabledBox = document.getElementById('enabled');
var hostEl = document.getElementById('host');

// get current enabled status
chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
  var currentTab = tabs[0];
  var url = new URL(currentTab.url);
  var host = url.host;
  var storageKey = '__host_' + host;
  chrome.storage.sync.get(storageKey).then((result) => {    
    if (
      (result.hasOwnProperty(storageKey) && result[storageKey])
      || (!result.hasOwnProperty(storageKey) && (url.hostname == 'localhost' || url.hostname == '127.0.0.1'))
      ) {
      enabledBox.checked = true;
    }
  });

  hostEl.innerHTML = host;
});

// update enabled box
enabledBox.addEventListener('change', function () {
  var enabled = this.checked;
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    var currentTab = tabs[0];
    var url = new URL(currentTab.url);
    var host = url.host;
    var setting = {};
    setting['__host_' + host] = enabled;
    chrome.storage.sync.set(setting);
  });  
})