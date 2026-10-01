# 展示サイトの編集画面

公開URL: https://butumu2027.github.io/Butumu2027/admin.html

## 使い方

1. 編集画面を開きます。GitHubのmainブランチから最新データを読み込みます。
2. 「作品」「展示室」「トップページ」から編集対象を選びます。
3. 文章を入力し、写真を選びます。作品の追加・削除、展示室の割り振り・表示順も変更できます。
4. 「GitHubに接続」で専用の認証キーを入力します。
5. 「保存して公開」で文章と写真をまとめてコミットします。GitHub Pagesへの反映には数分かかる場合があります。

## 認証キーの初期設定

- GitHubに **butumu2027** でログインします。
- https://github.com/settings/personal-access-tokens/new を開きます。
- Fine-grained personal access tokenを作成します。
- Resource owner: **butumu2027**
- Repository access: **Only select repositories → Butumu2027**
- Repository permissions: **Contents → Read and write**
- MetadataのRead-onlyは自動で追加されます。
- 利用期間に合わせた有効期限を設定します。
- 作成した認証キーを編集画面に入力します。GitHubのアカウントのパスワードではありません。

キーはブラウザーのメモリーにだけ保持されます。チャット・公開リポジトリ・下書き・localStorageには保存しません。画面を閉じたり再読み込みした場合は、再度キーを入力してください。期限が切れた場合はGitHubで新しいキーを作成します。

編集画面自体は公開されていますが、保存には対象リポジトリを更新できるGitHubの認証が必要です。

## 下書きと競合

- 「下書きを保存」で未公開の文章と追加した写真をJSONファイルとして保存できます。認証キーは含みません。
- 「下書きを開く」で編集を再開できます。
- 編集途中でページを閉じると、ダウンロードしていない変更は失われます。
- 他の端末やVSCodeでmainが更新された場合、古い編集内容で上書きしません。下書きを保存してから最新データを読み込み、必要な変更を改めて入力してください。古い下書きをそのまま読み込むだけでは競合を解除しません。
- 通信エラーの場合もフォーム内の変更は残ります。先に下書きを保存できます。

## 写真

JPEG・PNG・WebP、1枚15MBまで。長辺1920px以内のWebPに変換して `images/uploads/` に保存します。作品から写真を外しても元の画像ファイルは削除しません。

## ファイル構成

- `data.js`: 作品・展示室・トップページの設定。編集画面が更新します。
- `images/uploads/`: 編集画面から追加した写真。
- `admin.html` / `admin.css` / `admin.js`: 編集画面。
- `admin-core.mjs`: 検証・データ読み込み・GitHubへの保存。
- `script.js`: 公開サイトの表示。トップページの文章もここで設定値を反映します。
- `style.css`: 公開サイトのデザイン。

## VSCodeでも編集する場合

編集画面から保存するとGitHubに新しいコミットができます。VSCodeで編集を始める前に、ローカルの変更を整理したうえで `git pull --ff-only` を実行してください。

## 検証

`node --test admin-core.test.mjs`

保存は画像とdata.jsを一つのコミットにまとめ、ブランチの強制更新は行いません。
