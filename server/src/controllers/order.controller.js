import orderodel from "../models/order.model.js";
import cartodel from "../models/cart.model.js";
import productodel from "../models/product.model.js";

export async function createOrder(req, res) {
  const user = req.user;
  const cart = await cartodel
    .findOne({ userId: user.id })
    .populate("products.productId");
  if (!cart || cart.products.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  const publishedProducts = cart.products.filter((p) => p.productId.isPublished);
  if (publishedProducts.length !== cart.products.length) {
    return res.status(400).json({ message: "Cart has unpublished products" });
  }

  const sizeError = [];
  cart.products.forEach((p) => {
    const productSize = p.size;
    const size = p.productId.sizes.find((s) => s.size === productSize);
    if (!size) {
      sizeError.push({ productId: p.productId._id, message: `Size ${productSize} not available` });
      return;
    }
    if (size.stock < p.quantity) {
      sizeError.push({
        productId: p.productId._id,
        message: `Only ${size.stock} available for size: ${productSize}`,
      });
    }
  });
  if (sizeError.length > 0) {
    return res.status(400).json({ message: "Cart has invalid sizes", sizeError });
  }

  await productodel.bulkWrite(
    cart.products.map((p) => ({
      updateOne: {
        filter: { _id: p.productId._id, "sizes.size": p.size },
        update: { $inc: { "sizes.$.stock": -p.quantity } },
      },
    }))
  );

  const order = await orderodel.create({
    userId: user.id,
    address: req.body.address,
    products: cart.products.map((p) => ({
      product: {
        title: p.productId.title,
        price: p.productId.price,
        description: p.productId.description,
        image: p.productId.images[0]?.url ?? "",
        productId: p.productId._id,
      },
      size: p.size,
      quantity: p.quantity,
    })),
    totalPrice: {
      amount: cart.products.reduce((acc, p) => acc + p.productId.price.amount * p.quantity, 0),
      currency: "INR",
    },
  });

  // clear the cart now that the order is placed
  await cartodel.updateOne({ userId: user.id }, { $set: { products: [] } });

  return res.status(201).json({ message: "Order created successfully", data: { order } });
}

export async function getOrders(req, res) {
  const user = req.user;
  const orders = await orderodel.find({ userId: user.id }).sort({ createdAt: -1 });
  return res.status(200).json({ message: "Orders fetched successfully", data: { orders } });
}

export async function cancelOrder(req, res) {
  const user = req.user;
  const { orderId } = req.params;
  const order = await orderodel.findOne({ _id: orderId });
  if (!order) {
    return res.status(400).json({ message: "Order not found" });
  }
  if (order.userId.toString() !== user.id.toString()) {
    return res.status(400).json({ message: "You are not authorized to cancel this order" });
  }
  if (order.status === "CANCELLED") {
    return res.status(400).json({ message: "Order is already cancelled" });
  }
  if (["DELIVERED", "SHIPPED"].includes(order.status)) {
    return res.status(400).json({ message: `Order cannot be cancelled as it is already ${order.status}` });
  }
  await orderodel.updateOne({ _id: orderId }, { $set: { status: "CANCELLED" } });
  return res.status(200).json({ message: "Order cancelled successfully" });
}

export async function updateOrderStatus(req, res) {
  const user = req.user;
  if (user.role !== "seller") {
    return res.status(400).json({ message: "You are not authorized to update order status" });
  }
  const { orderId } = req.params;
  const order = await orderodel.findOne({ _id: orderId });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  const { status } = req.body;

  if (!["PLACED", "SHIPPED", "DELIVERED", "PENDING", "CANCELLED"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  await orderodel.updateOne({ _id: orderId }, { $set: { status } });
  return res.status(200).json({ message: "Order status updated successfully" });
}