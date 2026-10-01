export const REPO = 'butumu2027/Butumu2027';
export const BRANCH = 'main';
export const DEFAULT_SITE = {
  title: '物理部無線班', english: 'PHYSICS & RADIO CLUB',
  tagline: 'つくる。うごく。\nその先の、不思議へ。',
  intro: '物理とものづくりの、展示空間。',
  roomIntro: 'ふたつの部屋から、\n作品をめぐる。',
  roomNote: '展示室名・作品の配置は仮のものです。',
  archiveNote: '作品写真・説明文は準備中です。',
  about: '動くもの。音を奏でるもの。\n光るもの。遊べるもの。\n\n物理部無線班の文化祭展示を、\nひとつひとつの作品から紹介します。\n\n気になる作品から、その仕組みや\nものづくりの面白さに触れてみてください。',
  heroImage: 'images/architecture.svg', heroAlt: '曲線と光の重なりを表現した抽象的な建築ビジュアル'
};
export function parseData(source) {
  const match = source.match(/^\s*(?:\/\/[^\n]*\n\s*)*window\.EXHIBITION_DATA\s*=\s*([\s\S]*?)\s*;?\s*$/);
  if (!match) throw new Error('data.js の形式が異なります。変更せずに読み込みを中止しました。');
  const data = JSON.parse(match[1]);
  validate(data);
  return data;
}
export function serialize(data) {
  validate(data);
  return '// このファイルは編集画面、または手作業で編集できます。\nwindow.EXHIBITION_DATA = ' + JSON.stringify(data, null, 2) + ';\n';
}
export function safeImage(src) {
  return typeof src === 'string' && (/^images\/[a-zA-Z0-9_./-]+$/.test(src) && !src.split('/').includes('..') || /^https:\/\/[^\s]+$/.test(src));
}
export function validate(data) {
  if (!data || !Array.isArray(data.rooms) || !Array.isArray(data.exhibits) || !data.rooms.length) throw new Error('展示室と作品のデータが必要です。');
  const ids = new Set(), slugs = new Set(), workIds = new Set();
  const string = (value, title, required = false) => {
    if (typeof value !== 'string' || (required && !value.trim()) || value.length > 20000) throw new Error(title + 'を確認してください。');
  };
  const identifier = (s, title) => { if (typeof s !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(s)) throw new Error(title + 'には半角英数字・ハイフン・アンダースコアを使ってください。'); };
  for (const r of data.rooms) {
    identifier(r.id, '展示室ID'); string(r.name, '展示室名', true); string(r.label, '英語ラベル', true);
    if (ids.has(r.id)) throw new Error('展示室IDが重複しています。');
    ids.add(r.id);
    if (!safeImage(r.image)) throw new Error('展示室の画像パスを確認してください。');
    string(r.alt || '', '展示室画像の説明');
  }
  for (const w of data.exhibits) {
    identifier(w.id, '作品ID'); identifier(w.slug, '作品URL'); string(w.name, '作品名', true); string(w.number, '作品番号', true);
    if (workIds.has(w.id) || slugs.has(w.slug)) throw new Error('作品IDまたは作品URLが重複しています。');
    workIds.add(w.id); slugs.add(w.slug);
    if (!ids.has(w.roomId)) throw new Error(w.name + 'の展示室を選んでください。');
    if (!Number.isFinite(w.order) || w.order < 0) throw new Error(w.name + 'の表示順を確認してください。');
    for (const key of ['summary', 'mechanism', 'points']) string(w[key] || '', w.name + 'の説明');
    if (w.youtubeId && !/^[\w-]{11}$/.test(w.youtubeId)) throw new Error(w.name + 'のYouTube動画IDを確認してください。');
    if (!Array.isArray(w.images)) throw new Error(w.name + 'の画像データが不正です。');
    for (const image of w.images) {
      if (!safeImage(image.src)) throw new Error(w.name + 'の画像パスを確認してください。');
      string(image.alt || '', '画像の説明'); string(image.caption || '', '写真のキャプション');
    }
  }
  if (data.site) {
    for (const key of Object.keys(DEFAULT_SITE)) {
      if (data.site[key] !== undefined) string(data.site[key], 'トップページの' + key, ['title', 'english'].includes(key));
    }
    if (data.site.heroImage && !safeImage(data.site.heroImage)) throw new Error('トップページの画像パスを確認してください。');
  }
}
export const decode64 = text => new TextDecoder().decode(Uint8Array.from(atob(text.replace(/\s/g, '')), c => c.charCodeAt(0)));
export function imagePaths(data) {
  return new Set([data.site?.heroImage, ...data.rooms.map(r => r.image), ...data.exhibits.flatMap(w => w.images.map(i => i.src))].filter(Boolean));
}
export function createApi(token, fetcher = fetch) {
  return async (path, method = 'GET', body) => {
    const response = await fetcher('https://api.github.com/repos/' + REPO + path, {
      method, cache: 'no-store', redirect: 'error',
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000)
    });
    if (!response.ok) {
      const error = new Error(response.status === 401 ? '認証キーが無効か、有効期限が切れています。接続し直してください。' : response.status === 403 ? 'GitHubで更新が許可されませんでした。認証キーの対象リポジトリと Contents: Read and write を確認してください。API制限の場合は時間をおいて再試行してください。' : response.status === 409 || response.status === 422 ? '更新が競合したか、ブランチの保護設定で保存できませんでした。下書きを保存して最新データを読み込み直してください。' : response.status === 404 ? 'リポジトリまたはファイルが見つかりません。認証キーの対象を確認してください。' : 'GitHubとの通信に失敗しました（' + response.status + '）。下書きはこの画面に残っています。');
      error.status = response.status; throw error;
    }
    return response.json();
  };
}
export async function readRemote(api) {
  const ref = await api('/git/ref/heads/' + BRANCH);
  const file = await api('/contents/data.js?ref=' + ref.object.sha);
  return { head: ref.object.sha, data: parseData(decode64(file.content)) };
}
export async function publish(api, data, uploads, expectedHead, onProgress = () => {}) {
  validate(data);
  if (!expectedHead) throw new Error('最新データを読み込んでから保存してください。');
  const ref = await api('/git/ref/heads/' + BRANCH);
  if (ref.object.sha !== expectedHead) throw new Error('ほかの場所でサイトが更新されています。上書きしませんでした。「下書きを保存」で編集内容を残してから、最新データを読み込み直してください。');
  const parent = await api('/git/commits/' + expectedHead);
  const tree = [{ path: 'data.js', mode: '100644', type: 'blob', content: serialize(data) }];
  const paths = imagePaths(data);
  for (const [path, file] of uploads) {
    if (!paths.has(path)) continue;
    if (!/^images\/uploads\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(path) || !/^[A-Za-z0-9+/]+=*$/.test(file.base64) || file.base64.length > 8000000) throw new Error('アップロード画像の形式を確認してください。');
    onProgress('写真を送信しています…');
    const blob = await api('/git/blobs', 'POST', { content: file.base64, encoding: 'base64' });
    tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  onProgress('変更を保存しています…');
  const nextTree = await api('/git/trees', 'POST', { base_tree: parent.tree.sha, tree });
  const commit = await api('/git/commits', 'POST', { message: '編集画面から展示内容を更新', parents: [expectedHead], tree: nextTree.sha });
  await api('/git/refs/heads/' + BRANCH, 'PATCH', { sha: commit.sha, force: false });
  return commit.sha;
}
