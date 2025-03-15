// データベース操作のカスタムエラークラス

/**
 * データベース操作の基本エラークラス
 */
export class DbError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'DbError';
  }
}

/**
 * エンティティが見つからない場合のエラークラス
 */
export class EntityNotFoundError extends DbError {
  constructor(entityName: string, id: number) {
    super(`${entityName}(ID: ${id})が見つかりません`);
    this.name = 'EntityNotFoundError';
  }
}

/**
 * 一意制約違反エラークラス
 */
export class UniqueConstraintError extends DbError {
  constructor(entityName: string, field: string, value: any) {
    super(`${entityName}の${field}=${value}は既に存在しています`);
    this.name = 'UniqueConstraintError';
  }
}

/**
 * データベーストランザクションエラークラス
 */
export class TransactionError extends DbError {
  constructor(message: string, originalError?: any) {
    super(`トランザクションエラー: ${message}`, originalError);
    this.name = 'TransactionError';
  }
}

/**
 * データベース接続エラークラス
 */
export class ConnectionError extends DbError {
  constructor(message: string, originalError?: any) {
    super(`データベース接続エラー: ${message}`, originalError);
    this.name = 'ConnectionError';
  }
}

/**
 * データのインポート/エクスポートエラークラス
 */
export class DataManagementError extends DbError {
  constructor(message: string, originalError?: any) {
    super(`データ管理エラー: ${message}`, originalError);
    this.name = 'DataManagementError';
  }
} 