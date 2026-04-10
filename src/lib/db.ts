import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Product, Variation, Movement } from '../types';

// Products
export const getProducts = async (): Promise<Product[]> => {
  try {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'products');
    return [];
  }
};

export const getProduct = async (id: string): Promise<Product | null> => {
  try {
    const docRef = doc(db, 'products', id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Product;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `products/${id}`);
    return null;
  }
};

// Variations
export const getVariations = async (productId: string): Promise<Variation[]> => {
  try {
    const q = collection(db, 'products', productId, 'variations');
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Variation));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `products/${productId}/variations`);
    return [];
  }
};

// Movements
export const addMovement = async (movement: Omit<Movement, 'id'>) => {
  try {
    const batch = writeBatch(db);
    
    // 1. Add movement record
    const movementRef = doc(collection(db, 'movements'));
    batch.set(movementRef, movement);
    
    // 2. Update variation quantity
    const variationRef = doc(db, 'products', movement.productId, 'variations', movement.variationId);
    const qtyChange = movement.type === 'entry' ? movement.quantity : -movement.quantity;
    batch.update(variationRef, { quantity: increment(qtyChange) });
    
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'movements/batch');
  }
};

// Real-time listeners
export const subscribeToProducts = (callback: (products: Product[]) => void) => {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    callback(products);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'products');
  });
};

export const subscribeToVariations = (productId: string, callback: (variations: Variation[]) => void) => {
  const q = collection(db, 'products', productId, 'variations');
  return onSnapshot(q, (snapshot) => {
    const variations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Variation));
    callback(variations);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `products/${productId}/variations`);
  });
};
