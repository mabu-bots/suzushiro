# Security Policy

## Reporting a vulnerability

脆弱性を見つけた場合は、公開 Issue には書かず、リポジトリ管理者へ
個別に連絡してください。Discord Bot のトークンなどの秘密情報が
漏れている場合も同様です。

## Handling secrets

- Bot のトークンは `.env` にだけ置き、リポジトリには含めません
  （`.env` は `.gitignore` 済みです）。
- トークンをチャットや Issue に貼らないでください。
- 万一トークンが漏れた場合は、Discord Developer Portal で
  ただちに再発行（リセット）してください。
