# 物理部無線班 — VS Code / HTML版

元のNext.jsサイトから、インストール不要で開けるHTML・CSS・JavaScript版に変換したものです。
公開中のサイトは変更していません。このフォルダの編集は公開中のサイトへ自動反映されません。

## 開く方法
1. ZIPを展開します。
2. VS Codeの「ファイル → フォルダーを開く」で `butumu-2027` フォルダを選びます。
   または `butumu-2027.code-workspace` をVS Codeで開きます。
3. Finderなどで `index.html` をダブルクリックするとブラウザで表示できます。
   VS Codeではコードの編集、ブラウザでは見た目の確認を行います。
4. 編集して保存したら、ブラウザを再読み込みしてください。

npm、Node.js、ビルド作業は不要です。画像拡大などの操作はJavaScriptを有効にして利用します。
YouTube動画を追加した場合、動画再生にはインターネット接続が必要です。

## ファイル構成
- index.html : トップページの入口
- room.html : 展示室ページの入口
- exhibit.html : 個別作品ページの入口
- 404.html : 見つからないページの表示
- style.css : 配色、文字、余白、スマートフォン対応
- script.js : ページの組み立て、画面遷移、メニュー、画像拡大
- data.js : 展示室名・作品名・説明文・写真・動画・割り振り・順番
- images/ : 画像ファイル

本文はscript.jsとdata.jsから表示するので、index.htmlの中に全ての文章は入っていません。

## 作品の編集
`data.js` の該当作品を編集します。
- name : 作品名
- summary : 概要
- mechanism : 仕組み
- points : 制作のポイント
- roomId : room-01 または room-02
- order : 展示室内の表示順（小さいものから）
- images : 写真の配列。空なら準備中表示
- youtubeId : YouTube URLの動画ID（11文字）。未登録なら非表示
- id / slug : 他の作品と重複しない識別子。slugはURLに使用

写真を `images/robot.jpg` として置いた場合の例:

```js
"images": [
  { "src": "images/robot.jpg", "alt": "自動ゴミ箱ロボットの正面", "caption": "作品の正面" },
  { "src": "images/robot-side.jpg", "alt": "自動ゴミ箱ロボットの側面", "caption": "作品の側面" }
]
```

複数の写真を登録すると、サムネイルと拡大画面で写真を切り替えられます。
作品を追加するときはdata.jsのexhibits配列に1件追加するだけです。
展示室名はrooms配列のnameで変更できます。

## URL
ファイルを直接開けるように、このHTML版のURL形式を変更しています。
- トップ: index.html
- 展示室: room.html?id=room-01
- 作品: exhibit.html?slug=automatic-bin
存在しないidやslugでは「この展示は見つかりませんでした」と表示します。

## GitHub Pagesへの配置
このフォルダの中身をリポジトリの直下に置ける構成です。
node_modulesや秘密の設定ファイル、元サイトのGit履歴は含めていません。
GitHubへのアップロード・公開設定はまだ行っていません。
