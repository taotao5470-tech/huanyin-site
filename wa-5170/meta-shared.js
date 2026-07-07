(function(window, document) {
 const pixelId = '1464034677999267';

 if (typeof window.fbq !== 'function') {
  !function(f, b, e, v, n, t, s) {
   if (f.fbq) return;
   n = f.fbq = function() {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
   };
   if (!f._fbq) f._fbq = n;
   n.push = n;
   n.loaded = true;
   n.version = '2.0';
   n.queue = [];
   t = b.createElement(e);
   t.async = true;
   t.src = v;
   s = b.getElementsByTagName(e)[0];
   s.parentNode.insertBefore(t, s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
 }

 if (!window.__huanyinMetaPixelInit) {
  window.fbq('init', pixelId);
  window.__huanyinMetaPixelInit = true;
 }

 window.fbq('track', 'PageView');

 function track(name, params) {
  try {
   if (typeof window.fbq !== 'function') return;
   if (params) {
    window.fbq('track', name, params);
   } else {
    window.fbq('track', name);
   }
  } catch (err) {
   console.warn('Meta event failed:', name, err);
  }
 }

 function trackAddToCart(payload) {
  track('AddToCart', payload);
 }

 function trackPurchase(payload) {
  track('Purchase', payload);
 }

 function trackContact() {
  track('Contact');
 }

 window.HUANYIN_META_PIXEL_ID = pixelId;
 window.HuanyinMeta = {
  pixelId,
  track,
  trackAddToCart,
  trackPurchase,
  trackContact
 };

 window.trackMetaEvent = track;
 window.trackMetaEventWC = track;
})(window, document);
