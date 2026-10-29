// render faceless, limbless design figures as clean 1024px PNGs for image-to-3D
const list = await (await fetch('http://localhost:9333/json')).json();
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 1024, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:4173/secret-base/design/?t=' + Date.now() }); await sleep(2000);
const fs = await import('fs');
for (const [key, outfit] of [['mochi', false], ['cloud', false], ['bird', false], ['mochi', true], ['cloud', true], ['bird', true]]) {
  await send('Runtime.evaluate', { expression: `(() => {
    face = () => ''; paws = () => ''; shadow = () => ''; wings = () => ''; tuft = () => ''; devilTail = () => '';
    const C = CONCEPTS.find(c => c.key === '${key}');
    document.body.innerHTML = '<div style="position:fixed;inset:0;background:#fff;display:grid;place-items:center">' + figure(C, { outfit: ${outfit}, bg: false }).replace('<svg ', '<svg width="1024" height="1024" ') + '</div>';
  })()` });
  await sleep(400);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`gen/${key}-${outfit ? 'hood' : 'plain'}.png`, Buffer.from(r.result.data, 'base64'));
}
ws.close(); console.log('ok');
