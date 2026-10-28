// Stable private sessions across SPA navigation, especially the first send in a new chat.
// Runs in Chrome's isolated content-script context. No private data stored here.
(function (root) {
  function conversationKey(rawUrl, site) {
    const path = new URL(rawUrl).pathname;
    if (site === 'chatgpt') {
      const match = path.match(/^\/c\/([^/]+)/);
      return match ? `chatgpt:${match[1]}` : 'new';
    }
    if (site === 'claude') {
      const match = path.match(/^\/chat\/([^/]+)/);
      return match ? `claude:${match[1]}` : 'new';
    }
    if (site === 'gemini') {
      const match = path.match(/\/app\/([^/]+)/);
      return match ? `gemini:${match[1]}` : 'new';
    }
    if(site==='generic'){const u=new URL(rawUrl);return u.origin+u.pathname+u.search+u.hash;}
    return 'new';
  }
  function createSessionNavigation(site, firstUrl, generateId) {
    const makeId = generateId || (() => crypto.randomUUID());
    const known = new Map();
    let key = conversationKey(firstUrl, site);
    let bridge = makeId();
    let sendInNewChat = false;
    if (key !== 'new') known.set(key, bridge);
    return {
      get bridge() { return bridge; },
      get key() { return key; },
      markSendAttempt() {
        if (key === 'new') sendInNewChat = true;
      },
      next(nextUrl) {
        const nextKey = conversationKey(nextUrl, site);
        if (nextKey === key) return { changed: false, bridge, preserved: true };
        if (key === 'new' && nextKey !== 'new' && sendInNewChat && !known.has(nextKey)) {
          // The website named the new conversation after our sanitized Send.
          // The mapping MUST stay associated with the same bridge.
          key = nextKey;
          sendInNewChat = false;
          known.set(nextKey, bridge);
          return { changed: true, bridge, preserved: true };
        }
        key = nextKey;
        sendInNewChat = false;
        bridge = nextKey !== 'new' && known.has(nextKey) ? known.get(nextKey) : makeId();
        if (nextKey !== 'new') known.set(nextKey, bridge);
        return { changed: true, bridge, preserved: false };
      }
    };
  }
  const api = { conversationKey, createSessionNavigation };
  root.__privacyShieldSessionNavigation = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
