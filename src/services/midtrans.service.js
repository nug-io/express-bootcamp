import midtransClient from 'midtrans-client';
import { MIDTRANS } from '../utils/midtrans.js';


const snap = new midtransClient.Snap({
  isProduction: MIDTRANS.isProduction,
  serverKey: MIDTRANS.serverKey,
});

export const createPayment = async ({ orderId, amount, user }) => {
  return snap.createTransaction({
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    customer_details: {
      first_name: user.name,
      email: user.email,
    },
  });
};
