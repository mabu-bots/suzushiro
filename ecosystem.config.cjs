// ==========================================
// 🖥️ pm2 起動設定（suzushiro）
// ==========================================
// 起動: pm2 start ecosystem.config.cjs
// サーバー再起動後も自動で立ち上げるには pm2 startup（表示される
// コマンドを実行）と pm2 save を行う。
//
// suzushiro は dotenv で .env を自分で読み込むため、このファイルでは
// 環境変数の受け渡しはしない。秘密情報は .env（gitignore 済み）にだけ置くこと。

module.exports = {
  apps: [
    {
      name: "suzushiro",
      script: "src/index.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "200M",
      kill_timeout: 5000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
