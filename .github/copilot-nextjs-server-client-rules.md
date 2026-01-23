# Copilot追加指示: Next.js 13+ サーバー/クライアント分離・エラー防止

## 目的
このプロジェクトで頻出するNext.jsのサーバー/クライアント分離エラーや、ディレクティブ競合エラーを防ぐためのCopilot向け具体的指示です。

---

## サーバー/クライアント分離の原則
- **サーバー専用API（next/headers, next/response, cookies等）やDBアクセスは必ずサーバーコンポーネントでのみ実行すること**
- **クライアントコンポーネント（"use client"）内でサーバーAPIやサーバーアクション（"use server"）を直接定義・呼び出ししないこと**
- **クライアントで必要なデータは、サーバーコンポーネントで取得しprops経由で渡すこと**

## ディレクティブ競合の禁止
- **"use client"を付与したファイルで、export const metadataやgenerateMetadata等のエクスポートは禁止**
- **サーバーアクション（"use server"）は必ず別ファイルでexportし、クライアントからはimportして使うこと**

## 具体例
- サーバーAPI（cookies, headers, DBアクセス）はapp/layout.tsxやpage.tsx等のサーバーコンポーネントでのみ利用可
- クライアントでテーマやUI状態管理を行う場合は、Provider/Context/Hookを"use client"ファイルで定義し、サーバーからpropsで初期値を渡す
- metadataやgenerateMetadataは"use client"ファイルでは絶対にexportしない
- サインアウト等のサーバーアクションはapp/layout.server-actions.ts等でexportし、クライアントからはimportして使う

## 禁止事項
- "use client"ファイルでnext/headers, cookies, DBアクセス, サーバーアクションの直接定義・呼び出し
- "use client"ファイルでmetadata, generateMetadataのexport
- サーバーAPIをクライアントコンポーネントでimport

---

## 参考
- https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns
- https://nextjs.org/docs/app/api-reference/file-conventions/server
- https://nextjs.org/docs/app/api-reference/file-conventions/client
- https://nextjs.org/docs/app/api-reference/directives/use-client
- https://nextjs.org/docs/app/api-reference/directives/use-server

---

# ENFORCE THESE RULES IN ALL CODE SUGGESTIONS FOR THIS PROJECT
