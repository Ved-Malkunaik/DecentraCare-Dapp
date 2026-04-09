import { supabase } from "./supabase.js";

export async function createPendingBooking(data) {
  const { data: booking, error } = await supabase
    .from('telegram_bookings')
    .insert([{
      chat_id: data.chatId,
      patient_name: data.name,
      date: data.date,
      time: data.time,
      reason: data.reason,
      status: 'pending_confirmation'
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating booking:", error.message);
    throw error;
  }
  return booking;
}

export async function getBooking(id) {
  const { data, error } = await supabase
    .from('telegram_bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function markBookingConfirmed(id, wallet, txHash) {
  const { error } = await supabase
    .from('telegram_bookings')
    .update({ 
      status: 'confirmed_onchain',
      wallet: wallet,
      tx_hash: txHash
    })
    .eq('id', id);

  if (error) console.error("Error confirming booking:", error.message);
}
