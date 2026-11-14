const ids = ['endpoint', 'key', 'name'];
chrome.storage.sync.get({ endpoint: '', key: '', name: '' }, (v) => ids.forEach((i) => (document.getElementById(i).value = v[i])));
document.getElementById('save').addEventListener('click', () => {
  const v = Object.fromEntries(ids.map((i) => [i, document.getElementById(i).value.trim()]));
  chrome.storage.sync.set(v, () => { document.getElementById('s').textContent = 'Enregistré ✓'; });
});
