const iconHeight = "48px",
    iconWidth = "62.5px",
    minHeight = "600px",
    minWidth = "350px";

(function () { 

    var host = 'https://imitate.email/';
    var data = {};
    var projectName = data.project || '';
    var mailboxId = data.mailbox || '';
    var accessToken = data.accessToken || '';
    var tenantIdentifier = data.tenant || '';
    var widgetIdentifier = data.identifier || (mailboxId ? '' : location.host);
    var hidden = !!data.hidden;

    // listen to settings changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
            if (key === '__host_' + document.location.host) {
                var iframe = document.querySelector('iframe[src^="' + host + '"]');
                if (iframe && !newValue) {
                    iframe.remove();
                } else if (!iframe && newValue) {
                    init(host, projectName, mailboxId, accessToken, tenantIdentifier, widgetIdentifier, hidden);
                }
            }

          console.log(
            `Storage key "${key}" in namespace "${namespace}" changed.`,
            `Old value was "${oldValue}", new value is "${newValue}".`
          );
        }
      });

    // are we enabled
    var tabHost = document.location.host;
    var storageKey = "__host_" + tabHost;
    chrome.storage.sync.get(storageKey).then((result) => {
        if (
            (result.hasOwnProperty(storageKey) && result[storageKey])
            || (!result.hasOwnProperty(storageKey) && (document.location.hostname == 'localhost' || document.location.hostname == '127.0.0.1'))
            ) {
            init(host, projectName, mailboxId, accessToken, tenantIdentifier, widgetIdentifier, hidden);
        }
    });
})();

function init(host, projectName, mailboxId, accessToken, tenantIdentifier, widgetIdentifier, hidden) {
    var alreadyExists = false;
    document.querySelectorAll('iframe[src^="' + host + '"]').forEach(function(existingIframe) {
        if (existingIframe.imP == projectName &&
            existingIframe.imM == mailboxId &&
            existingIframe.imW == widgetIdentifier &&
            existingIframe.imT == accessToken) {
            alreadyExists = true;
        } else {
            existingIframe.remove();
        }
    });

    if (alreadyExists) {
        return;
    }

    var el = document.createElement('div');
    el.style.cssText = `position:fixed;right:0;bottom:20px;border:0;outline:none;height:${iconHeight};width:${iconWidth};z-index:10000;overflow:hidden;` + (hidden ? 'display:none' : '');
    el.innerHTML = `
    <a style="position:absolute;width:3px;height:100%;cursor:w-resize;z-index:50" class="w"></a>
    <a style="position:absolute;width:100%;height:3px;cursor:n-resize;z-index:50" class="n"></a>
    <a style="position:absolute;width:6px;height:6px;cursor:nwse-resize;z-index:50" class="nw"></a>
    `;

    var i = document.createElement("iframe");
    i.style.cssText = 'height:100%;width:100%;position:absolute;bottom:0;right:0;border:0;outline:none;';
    var path = tenantIdentifier + (tenantIdentifier ? '/' : '') + (accessToken ? 'Widget/sso' : 'Widget');
    i.setAttribute("src", host + path +  "?projectName=" + encodeURIComponent(projectName) + "&mailboxId=" + encodeURIComponent(mailboxId) + "&wId=" + encodeURIComponent(widgetIdentifier) + "&jwt=" + accessToken);
    i.name = 'Imitate Email';

    i.imP = projectName;
    i.imM = mailboxId;
    i.imW = widgetIdentifier;
    i.imT = accessToken;

    el.appendChild(i);

    var iframeWindow = new IframeWindow(i);

    window.addEventListener("message", function (e) {
        if (e.origin.indexOf(host.substring(8, host.length - 1)) === -1) { // strip scheme and trailing slash
            return;
        }

        if (e.data.action === 'toggle') {
            iframeWindow.toggle();
        }

        if (e.data.action === 'newemail') {
            document.dispatchEvent(new CustomEvent('imitateemail:newemail', {
                detail: {
                    email: e.data.email
                }
            }));
        }
    });

    document.getElementsByTagName("body")[0].append(el);
    if (!window.hasOwnProperty('imitateEmail')) {
        window.imitateEmail = {};
    }

    window.imitateEmail = iframeWindow;

    el.querySelector('a.nw').addEventListener('mousedown', function (e) { bindResizer(e, resizeNW, 'nw-resize'); }, false);
    el.querySelector('a.n').addEventListener('mousedown', function (e) { bindResizer(e, resizeN, 'n-resize'); }, false);
    el.querySelector('a.w').addEventListener('mousedown', function (e) { bindResizer(e, resizeW, 'w-resize'); }, false);

    function IframeWindow(iframe) {
        this.i = iframe;
        this.el = el;
        this.isOpen = false;

        this.toggle = function() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        }

        this.close = function() {
            this.el.style.height = iconHeight;
            this.el.style.minHeight = 'auto';
            this.el.style.maxHeight = 'auto';
            this.el.style.width = iconWidth;
            this.el.style.minWidth = 'auto';
            this.el.style.maxWidth = 'auto';
            this.isOpen = false;
            this.i.contentWindow.postMessage({ event: 'closed' }, "*");
            document.dispatchEvent(new Event('imitateemail:closed'));
        }
        
        this.open = function() {
            this.el.style.width = localStorage.getItem('ie_w') || (window.innerWidth > 800 ? '600px' : '90%');
            this.el.style.minWidth = minWidth;
            this.el.style.maxWidth = window.innerWidth > 1200 ? '1200px' : '95vw';
            this.el.style.height = localStorage.getItem('ie_h') || '90vh';
            this.el.style.minHeight = minHeight;
            this.el.style.maxHeight = '95vh';
            
            this.isOpen = true;
            this.i.contentWindow && this.i.contentWindow.postMessage({ event: 'opened' }, "*");
            document.dispatchEvent(new Event('imitateemail:opened'));
        }

        this.hide = function () {
            el.style.display = 'none';
        }

        this.show = function () {
            el.style.display = 'block';
        }
    }


    function bindResizer(e, resizer, cursor) {
        e.preventDefault();
        var originalPointerEvents = i.style.pointerEvents;
        var originalBodyCursor = document.body.style.cursor;
        i.style.pointerEvents = 'none';
        document.body.style.cursor = cursor;
        document.addEventListener('mousemove', resizer, true);
        document.addEventListener('mouseup', function () {
            localStorage.setItem('ie_w', el.style.width);
            localStorage.setItem('ie_h', el.style.height);
            document.removeEventListener('mousemove', resizer, true);
            i.style.pointerEvents = originalPointerEvents;
            document.body.style.cursor = originalBodyCursor;
        }, { capture: true, once: true });
    }

    function resizeNW(e) {
        resize(e, 1, 1);
    }

    function resizeN(e) {
        resize(e, 0, 1);
    }

    function resizeW(e) {
        resize(e, 1, 0);
    }

    function resize(e, w, h) {
        if (w) {
            var width = window.innerWidth - e.clientX;
            el.style.width = width + 'px';
        }

        if (h) {
            var height = window.innerHeight - e.clientY - 20;
            el.style.height = height + 'px';
        }
    }
}