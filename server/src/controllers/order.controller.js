import orderModel from "../models/order.model.js";
import cartModel from "../models/cart.model.js";
import productModel from "../models/product.model.js";

export async function createOrder(req, res) {
  const user = req.user;
  const cart = await cartModel
    .findOne({ userId: user.id })
    .populate("products.productId");
  if (!cart) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  if (cart.products.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  const publishedProducts = cart.products.filter(
    (p) => p.productId.isPublished,
  );
  if (publishedProducts.length !== cart.products.length) {
    return res.status(400).json({ message: "Cart has unpublished products" });
  }

  const sizeError = [];
  cart.products.forEach((p) => {
    const productSize = p.size;
    const size = p.productId.sizes.find((s) => s.size === productSize);
    if (!size) {
      sizeError.push({
        productId: p.productId._id,
        message: `Size ${productSize} not available`,
      });
      return;
    }
    const isStockAvailable = size.stock >= p.quantity;
    if (!isStockAvailable) {
      sizeError.push({
        productId: p.productId._id,
        message: `Only ${size.stock} available for size:${productSize}`,
      });
      return;
    }
  });
  if (sizeError.length > 0) {
    return res
      .status(400)
      .json({ message: "Cart has invalid sizes", sizeError });
  }

  await productModel.bulkWrite(
    cart.products.map((p) => {
      return {
        updateOne: {
          filter: {
            _id: p.productId._id,
            "sizes.size": p.size,
          },
          update: {
            $inc: {
              "sizes.stock": -p.quantity,
            },
          },
        },
      };
    }),
  );

  const order = await orderModel.create({
    userId: user.id,
    address: req.body.address,
    products: cart.products.map((p) => {
      return {
        product: {
          title: p.productId.title,
          price: p.productId.price,
          description: p.productId.description,
          image: p.productId.images[0]?.url ?? "",
          productId: p.productId._id,
        },
        size: p.size,
        quantity: p.quantity,
      };
    }),
    totalPrice: {
      amount: cart.products.reduce(
        (acc, p) => acc + p.productId.price.amount * p.quantity,
        0,
      ),
      currency: "INR",
    },
  });
  return res.status(201).json({
    message: "Order created successfully",
    data: {
      order,
    },
  });
}

export async function getOrders(req, res) {
  const user = req.user;
  const orders = (await orderModel.find({ userId: user.id })).sort({
    createdAt: -1,
  });
  return res.status(200).json({
    message: "Orders fetched successfully",
    data: {
      orders,
    },
  });
}

export async function cancelOrder(req, res) {
  const user = req.user;
  const { orderId } = req.params;
  const order = await orderModel.findOne({ _id: orderId });
  if (!order) {
    return res.status(400).json({ message: "Order not found" });
  }
  if (order.userId.toString() !== user.id.toString()) {
    return res
      .status(400)
      .json({ message: "You are not authorized to cancel this order" });
  }
  if (order.status === "CANCELLED") {
    return res.status(400).json({ message: "Order is already cancelled" });
  }
  if (["DELIVERED", "SHIPPED"].includes(order.status)) {
    return res.status(400).json({
      message: `Order cannot be cancelled as it is already ${order.status}`,
    });
  }
  await orderModel.updateOne(
    { _id: orderId },
    { $set: { status: "CANCELLED" } },
  );
  return res.status(200).json({
    message: "Order cancelled successfully",
  });
}

export async function updateOrderStatus(req, res) {
  const user = req.user;
  if (user.role !== "seller") {
    return res
      .status(400)
      .json({ message: "You are not authorized to update order status" });
  }
  const { orderId } = req.params;
  const order = await orderModel.findOne({ _id: orderId });
  const { status } = req.body;
  if (status === "PLACED") {
    if (["CANCELLED", "DELIVERED", "SHIPPED"].includes(order.status)) {
      return res.status(400).json({ message: "Order is already placed" });
    }
    await orderModel.updateOne(
      { _id: orderId },
      { $set: { status: "PLACED" } },
    );
  }
  if (status === "DELIVERED") {
    if (["CANCELLED"].includes(order.status)) {
      return res.status(400).json({
        message:
          "Order cannot be delivered as it has already been" +
          order.status.toLowerCase(),
      });
    }
    await orderModel.updateOne(
      { _id: orderId },
      { $set: { status: "DELIVERED" } },
    );
  }
  return res.status(200).json({
    message: "Order status updated successfully",
  });
}
