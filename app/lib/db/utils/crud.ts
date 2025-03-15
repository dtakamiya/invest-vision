// 汎用的なCRUD操作

import { DbOperations, BaseEntity, QueryOptions } from '../types';
import { openDB, requestToPromise, withTransaction } from '../connection';
import { DbError, EntityNotFoundError } from './errors';

export interface RepositoryOptions {
  indexNames?: string[];
  entityName?: string;
}

/**
 * 汎用的なリポジトリを作成する関数
 */
export function createRepository<T extends BaseEntity & Record<string, any>>(
  storeName: string,
  options: RepositoryOptions = {}
): DbOperations<T> {
  const entityName = options.entityName || storeName;

  return {
    /**
     * 条件に一致する複数のエンティティを取得
     */
    async findMany(queryOptions: QueryOptions<T> = {}): Promise<T[]> {
      try {
        return await withTransaction(storeName, 'readonly', async (transaction) => {
          const store = transaction.objectStore(storeName);
          
          // クエリパラメータに応じた検索
          let request: IDBRequest<T[]>;
          
          // インデックスによる検索
          if (queryOptions.where && options.indexNames) {
            const indexKey = Object.keys(queryOptions.where).find(key => 
              options.indexNames?.includes(key)
            );
            
            if (indexKey && store.indexNames.contains(indexKey)) {
              const index = store.index(indexKey);
              request = index.getAll(queryOptions.where[indexKey]);
            } else {
              request = store.getAll();
            }
          } else {
            request = store.getAll();
          }
          
          const results = await requestToPromise(request);
          
          // フィルタリング
          let filteredResults = results;
          if (queryOptions.where) {
            filteredResults = results.filter(item => {
              return Object.entries(queryOptions.where || {}).every(([key, value]) => 
                item[key] === value
              );
            });
          }
          
          // ソート
          if (queryOptions.orderBy) {
            const [key, order] = Object.entries(queryOptions.orderBy)[0];
            filteredResults = [...filteredResults].sort((a, b) => {
              const aValue = a[key];
              const bValue = b[key];
              
              if (order === 'asc') {
                return aValue > bValue ? 1 : -1;
              } else {
                return aValue < bValue ? 1 : -1;
              }
            });
          }
          
          return filteredResults;
        });
      } catch (error) {
        throw new DbError(`${entityName}の検索に失敗しました`, error);
      }
    },
    
    /**
     * IDによる単一エンティティの取得
     */
    async findUnique(params: { where: { id: number } }): Promise<T | null> {
      try {
        return await withTransaction(storeName, 'readonly', async (transaction) => {
          const store = transaction.objectStore(storeName);
          const request = store.get(params.where.id);
          const result = await requestToPromise(request);
          return result || null;
        });
      } catch (error) {
        throw new DbError(`ID ${params.where.id} の${entityName}取得に失敗しました`, error);
      }
    },
    
    /**
     * エンティティの更新
     */
    async update(params: { where: { id: number }, data: Partial<T> }): Promise<T> {
      try {
        return await withTransaction(storeName, 'readwrite', async (transaction) => {
          const store = transaction.objectStore(storeName);
          
          // 既存データの取得
          const getRequest = store.get(params.where.id);
          const existingData = await requestToPromise(getRequest);
          
          if (!existingData) {
            throw new EntityNotFoundError(entityName, params.where.id);
          }
          
          // データの更新
          const updatedData = {
            ...existingData,
            ...params.data,
            updatedAt: new Date()
          };
          
          const updateRequest = store.put(updatedData);
          await requestToPromise(updateRequest);
          
          return updatedData;
        });
      } catch (error) {
        if (error instanceof EntityNotFoundError) {
          throw error;
        }
        throw new DbError(`${entityName}の更新に失敗しました`, error);
      }
    },
    
    /**
     * 新しいエンティティの作成
     */
    async create(params: { data: T }): Promise<T> {
      try {
        return await withTransaction(storeName, 'readwrite', async (transaction) => {
          const store = transaction.objectStore(storeName);
          
          // 日時フィールドの設定
          const now = new Date();
          const entityData = {
            ...params.data,
            createdAt: now,
            updatedAt: now
          };
          
          // データの挿入
          const request = store.add(entityData);
          const newId = await requestToPromise(request);
          
          return { ...entityData, id: newId as number };
        });
      } catch (error) {
        throw new DbError(`${entityName}の作成に失敗しました`, error);
      }
    },
    
    /**
     * エンティティの削除
     */
    async delete(params: { where: { id: number } }): Promise<void> {
      try {
        await withTransaction(storeName, 'readwrite', async (transaction) => {
          const store = transaction.objectStore(storeName);
          const request = store.delete(params.where.id);
          await requestToPromise(request);
        });
      } catch (error) {
        throw new DbError(`${entityName}の削除に失敗しました`, error);
      }
    }
  };
} 