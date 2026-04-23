import { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';
import { accountService } from '../core/services/accountService';

/**
 * Universal hook for subscribing to Firebase collections with tenant scoping.
 * @param colName The name of the collection to subscribe to.
 * @param options Optional overrides for enterpriseId and shopId.
 */
export function useCollection<T = any>(
  colName: string, 
  options?: { enterpriseId?: string | null; shopId?: string | null }
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const defaultEnterpriseId = accountService.getCurrentCompanyId();
  const defaultShopId = accountService.getSelectedShopId();

  const enterpriseId = options?.enterpriseId !== undefined ? options.enterpriseId : defaultEnterpriseId;
  const shopId = options?.shopId !== undefined ? options.shopId : defaultShopId;

  useEffect(() => {
    setLoading(true);
    try {
      const unsub = firebaseService.subscribeCollection<T>(
        colName, 
        enterpriseId, 
        shopId, 
        (docs) => {
          setData(docs);
          setLoading(false);
        }
      );
      return () => unsub();
    } catch (err) {
      console.error(`Error subscribing to ${colName}:`, err);
      setError(err as Error);
      setLoading(false);
    }
  }, [colName, enterpriseId, shopId]);

  return { data, loading, error, setData };
}
