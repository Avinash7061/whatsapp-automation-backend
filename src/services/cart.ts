import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CartItem {
  productId: string;
  variantId: string;
  title: string;
  price: number;
  quantity: number;
}

export const getOrCreateCart = async (phoneNumber: string) => {
  let customer = await prisma.customer.findUnique({
    where: { phoneNumber }
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: { phoneNumber }
    });
  }

  let cart = await prisma.cartSession.findUnique({
    where: { customerId: customer.id }
  });

  if (!cart) {
    cart = await prisma.cartSession.create({
      data: {
        customerId: customer.id,
        items: [],
        totalAmount: 0
      }
    });
  } else {
    // Check TTL: If cart is older than 24 hours, clear it
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (cart.updatedAt < twentyFourHoursAgo && (cart.items as any[]).length > 0) {
      cart = await prisma.cartSession.update({
        where: { id: cart.id },
        data: { items: [], totalAmount: 0 }
      });
    }
  }

  return cart;
};

export const getCart = async (phoneNumber: string) => {
  return getOrCreateCart(phoneNumber);
};

export const addToCart = async (phoneNumber: string, product: { id: string; variantId?: string; title: string; price: number }) => {
  const cart = await getOrCreateCart(phoneNumber);
  const items: CartItem[] = ((cart.items as any[]) || []).map((i: any) => ({
    productId: i.productId,
    variantId: i.variantId || '',
    title: i.title,
    price: Number(i.price),
    quantity: Number(i.quantity) || 1
  }));
  
  const existingItemIndex = items.findIndex(i => i.productId === product.id);
  const variantId = product.variantId || '';
  
  if (existingItemIndex > -1) {
    items[existingItemIndex].quantity += 1;
  } else {
    items.push({
      productId: product.id,
      variantId: variantId,
      title: product.title,
      price: product.price,
      quantity: 1
    });
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const updatedCart = await prisma.cartSession.update({
    where: { id: cart.id },
    data: {
      items: items as any,
      totalAmount
    }
  });

  return updatedCart;
};

export const clearCart = async (phoneNumber: string) => {
  const cart = await getOrCreateCart(phoneNumber);
  return prisma.cartSession.update({
    where: { id: cart.id },
    data: { items: [], totalAmount: 0 }
  });
};
