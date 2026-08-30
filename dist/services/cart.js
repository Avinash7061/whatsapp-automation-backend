"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.addToCart = exports.getCart = exports.getOrCreateCart = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getOrCreateCart = async (phoneNumber) => {
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
    }
    else {
        // Check TTL: If cart is older than 24 hours, clear it
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (cart.updatedAt < twentyFourHoursAgo && cart.items.length > 0) {
            cart = await prisma.cartSession.update({
                where: { id: cart.id },
                data: { items: [], totalAmount: 0 }
            });
        }
    }
    return cart;
};
exports.getOrCreateCart = getOrCreateCart;
const getCart = async (phoneNumber) => {
    return (0, exports.getOrCreateCart)(phoneNumber);
};
exports.getCart = getCart;
const addToCart = async (phoneNumber, product) => {
    const cart = await (0, exports.getOrCreateCart)(phoneNumber);
    const items = (cart.items || []).map((i) => ({
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
    }
    else {
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
            items: items,
            totalAmount
        }
    });
    return updatedCart;
};
exports.addToCart = addToCart;
const clearCart = async (phoneNumber) => {
    const cart = await (0, exports.getOrCreateCart)(phoneNumber);
    return prisma.cartSession.update({
        where: { id: cart.id },
        data: { items: [], totalAmount: 0 }
    });
};
exports.clearCart = clearCart;
