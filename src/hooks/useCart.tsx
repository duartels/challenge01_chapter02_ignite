import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productExisting = cart.find(product => product.id === productId);

      if(productExisting){
        updateProductAmount({
          productId: productExisting.id,
          amount: productExisting.amount + 1
        });
      }else{
        const stock = await api.get<Stock>(`/stock/${productId}`).then(res => res.data);

        if(stock.amount > 0){
          const product = await api.get<Product>(`/products/${productId}`).then(res => ({...res.data, amount: 1}));

          setCart([...cart, product]);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, product]));
        }else{
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExist = cart.find(product => product.id === productId);

      if(!productExist){
        throw new Error();
      }

      const cartUpdated = cart.filter(product => product.id !== productId);

      setCart(cartUpdated);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated));

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount > 0){
        const stock = await api.get<Stock>(`/stock/${productId}`).then(res => res.data);

        if(stock.amount < amount){
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const cartUpdated = cart.map(product => {
          if(product.id === productId){
            product.amount = amount;
          }
          return product;
        })
        setCart(cartUpdated);
  
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated));
      }else{
        throw new Error();
      }
      
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
