let bookings = {};
let counter = 1;

export function createPendingBooking(data) {
  const id = counter++;
  bookings[id] = {
    id,
    ...data,
    status: "pending_wallet_confirmation",
    source: "telegram"
  };
  return bookings[id];
}

export function getBooking(id) {
  return bookings[id];
}

export function markBookingConfirmed(id, wallet, txHash) {
  if (bookings[id]) {
    bookings[id].status = "confirmed_onchain";
    bookings[id].wallet = wallet;
    bookings[id].txHash = txHash;
  }
}
