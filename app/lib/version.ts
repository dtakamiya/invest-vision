// package.jsonからアプリケーションのバージョン情報を取得する
import packageJson from '../../package.json';

// アプリケーションのバージョン情報
export const APP_VERSION = packageJson.version; 